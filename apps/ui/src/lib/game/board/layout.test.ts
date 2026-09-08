import { expect, test } from 'bun:test';
import {
	cities,
	cityPoint,
	routeMarkerLength,
	ROUTE_MARKER_WIDTH,
	routeMarkerPoint,
	routeMarkerT,
	routePoint,
	routes,
} from './layout';

type Point = { x: number; y: number };
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y;
const markers = routes.flatMap(route =>
	Array.from({ length: route.length }, (_, index) => {
		const t = routeMarkerT(route, index);
		const before = routePoint(route, t - 0.002),
			after = routePoint(route, t + 0.002);
		const angle = Math.atan2(after.y - before.y, after.x - before.x);
		return {
			route: route.id,
			index,
			point: routeMarkerPoint(route, index),
			halfLength: routeMarkerLength(route) / 2,
			along: { x: Math.cos(angle), y: Math.sin(angle) },
			across: { x: -Math.sin(angle), y: Math.cos(angle) },
		};
	}),
);
type Marker = (typeof markers)[number];
const halfWidth = ROUTE_MARKER_WIDTH / 2;

function markersOverlap(a: Marker, b: Marker) {
	const delta = { x: a.point.x - b.point.x, y: a.point.y - b.point.y };
	return [a.along, a.across, b.along, b.across].every(axis => {
		const extent = (marker: Marker) =>
			marker.halfLength * Math.abs(dot(marker.along, axis)) + halfWidth * Math.abs(dot(marker.across, axis));
		return Math.abs(dot(delta, axis)) < extent(a) + extent(b);
	});
}

test('every route marker has its own unobstructed footprint', () => {
	const collisions: string[] = [];
	for (let i = 0; i < markers.length; i++) {
		for (let j = i + 1; j < markers.length; j++) {
			const a = markers[i]!,
				b = markers[j]!;
			if (a.route !== b.route && markersOverlap(a, b))
				collisions.push(`${a.route}[${a.index}] / ${b.route}[${b.index}]`);
		}
	}
	expect(collisions).toEqual([]);
});

test('markers leave city hubs clear and sit nearly edge to edge', () => {
	let nearestCity = Infinity,
		nearestCar = Infinity,
		farthestCar = 0;
	for (const marker of markers) {
		for (const city of cities) {
			const point = cityPoint(city);
			const delta = { x: point.x - marker.point.x, y: point.y - marker.point.y };
			nearestCity = Math.min(
				nearestCity,
				Math.hypot(
					Math.max(0, Math.abs(dot(delta, marker.along)) - marker.halfLength),
					Math.max(0, Math.abs(dot(delta, marker.across)) - halfWidth),
				),
			);
		}
		const next = markers.find(other => other.route === marker.route && other.index === marker.index + 1);
		if (next) {
			const gap = Math.hypot(next.point.x - marker.point.x, next.point.y - marker.point.y) - marker.halfLength * 2;
			nearestCar = Math.min(nearestCar, gap);
			farthestCar = Math.max(farthestCar, gap);
		}
	}
	expect(nearestCity).toBeGreaterThan(9);
	expect(nearestCar).toBeGreaterThan(0.5);
	expect(farthestCar).toBeLessThan(1.2);
});

test('route hit paths never cross into another route', () => {
	const paths = routes.map(route => ({
		id: route.id,
		points: Array.from({ length: 49 }, (_, i) => routePoint(route, i / 48)),
	}));
	const counterclockwise = (a: Point, b: Point, c: Point) => (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
	const crosses = (a: Point, b: Point, c: Point, d: Point) =>
		counterclockwise(a, c, d) !== counterclockwise(b, c, d) && counterclockwise(a, b, c) !== counterclockwise(a, b, d);
	const collisions: string[] = [];
	for (let i = 0; i < paths.length; i++) {
		for (let j = i + 1; j < paths.length; j++) {
			const a = paths[i]!,
				b = paths[j]!;
			if (
				a.points
					.slice(1)
					.some((point, index) =>
						b.points
							.slice(1)
							.some((other, otherIndex) => crosses(a.points[index]!, point, b.points[otherIndex]!, other)),
					)
			)
				collisions.push(`${a.id} / ${b.id}`);
		}
	}
	expect(collisions).toEqual([]);
});
