import type { Route } from '@repo/shared';
import type { Point } from '../../maps';
import { ROUTE_MARKER_WIDTH, type BoardLayout } from './layout';

// The shortest marker a route may get before it reads as a sliver; the USA board's smallest is about 15.
export const MIN_MARKER_LENGTH = 14;
export const MIN_CITY_CLEARANCE = 9;

type Marker = { route: Route; index: number; point: Point; halfLength: number; along: Point; across: Point };
export type LayoutIssue = { kind: 'overlap' | 'city' | 'crossing' | 'short'; routes: string[]; detail: string };

const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y;

function markers(layout: BoardLayout, route: Route): Marker[] {
	return Array.from({ length: route.length }, (_, index) => {
		const t = layout.routeMarkerT(route, index);
		const before = layout.routePoint(route, t - 0.002),
			after = layout.routePoint(route, t + 0.002);
		const angle = Math.atan2(after.y - before.y, after.x - before.x);
		return {
			route,
			index,
			point: layout.routeMarkerPoint(route, index),
			halfLength: layout.routeMarkerLength(route) / 2,
			along: { x: Math.cos(angle), y: Math.sin(angle) },
			across: { x: -Math.sin(angle), y: Math.cos(angle) },
		};
	});
}

function overlap(a: Marker, b: Marker) {
	const delta = { x: a.point.x - b.point.x, y: a.point.y - b.point.y };
	const half = ROUTE_MARKER_WIDTH / 2;
	return [a.along, a.across, b.along, b.across].every(axis => {
		const extent = (marker: Marker) =>
			marker.halfLength * Math.abs(dot(marker.along, axis)) + half * Math.abs(dot(marker.across, axis));
		return Math.abs(dot(delta, axis)) < extent(a) + extent(b);
	});
}

function cityDistance(marker: Marker, point: Point) {
	const delta = { x: point.x - marker.point.x, y: point.y - marker.point.y };
	return Math.hypot(
		Math.max(0, Math.abs(dot(delta, marker.along)) - marker.halfLength),
		Math.max(0, Math.abs(dot(delta, marker.across)) - ROUTE_MARKER_WIDTH / 2),
	);
}

const ccw = (a: Point, b: Point, c: Point) => (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
const crosses = (a: Point, b: Point, c: Point, d: Point) =>
	ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);

// Problems a player would see: overlapping cars, cars on top of a city, crossing tracks or slivers of cars.
export function layoutIssues(layout: BoardLayout, routes: readonly Route[] = layout.map.routes): LayoutIssue[] {
	const issues: LayoutIssue[] = [];
	const all = layout.map.routes.map(route => ({
		route,
		markers: markers(layout, route),
		polyline: Array.from({ length: 33 }, (_, i) => layout.routePoint(route, i / 32)),
	}));
	const checked = new Set(routes.map(route => route.id));
	const cityPoints = layout.map.cities.flatMap(city =>
		city.positions.map((_, position) => ({ id: `${city.id}#${position}`, point: layout.cityPoint(city, position) })),
	);
	for (const [i, a] of all.entries()) {
		if (!checked.has(a.route.id)) continue;
		const length = layout.routeMarkerLength(a.route);
		if (length < MIN_MARKER_LENGTH) {
			issues.push({ kind: 'short', routes: [a.route.id], detail: `cars are ${length.toFixed(1)} long` });
		}
		for (const marker of a.markers) {
			const city = cityPoints.find(({ point }) => cityDistance(marker, point) < MIN_CITY_CLEARANCE);
			if (city) issues.push({ kind: 'city', routes: [a.route.id], detail: `car ${marker.index} covers ${city.id}` });
		}
		for (const [j, b] of all.entries()) {
			if (j === i || (checked.has(b.route.id) && j < i)) continue;
			if (a.markers.some(m => b.markers.some(n => overlap(m, n)))) {
				issues.push({ kind: 'overlap', routes: [a.route.id, b.route.id], detail: 'cars overlap' });
			} else if (
				a.polyline
					.slice(1)
					.some((p, k) => b.polyline.slice(1).some((q, l) => crosses(a.polyline[k]!, p, b.polyline[l]!, q)))
			) {
				issues.push({ kind: 'crossing', routes: [a.route.id, b.route.id], detail: 'tracks cross' });
			}
		}
	}
	return issues;
}
