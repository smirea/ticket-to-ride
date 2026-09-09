import { USA_CITIES, USA_ROUTES, type City, type Route } from '@repo/shared';
import { cityTrace, normalizeTracePoint, routeTrace } from './route-trace';

export const cities = USA_CITIES;
export const routes = USA_ROUTES;
export const cityById = new Map(cities.map(city => [city.id, city]));
export const routeColors = {
	red: '#d4483d',
	orange: '#dc8831',
	yellow: '#e0be32',
	green: '#359267',
	blue: '#318fc4',
	purple: '#a362ba',
	black: '#343e43',
	white: '#f4edd9',
	gray: '#9b9f94',
};
export const playerColors = { red: '#cf201e', blue: '#047ac1', green: '#19854b', yellow: '#efb900', black: '#343c43' };
export function cityPoint(city: City) {
	const point = cityTrace[city.id];
	if (!point) throw new Error(`Missing city trace: ${city.id}`);
	return normalizeTracePoint(point);
}
type RoutePoint = { x: number; y: number };
type RouteGeometry = {
	start: RoutePoint;
	end: RoutePoint;
	dx: number;
	dy: number;
	distance: number;
	normalX: number;
	normalY: number;
};
const geometryCache = new Map<string, RouteGeometry>();
export function routeGeometry(route: Route): RouteGeometry {
	const cached = geometryCache.get(route.id);
	if (cached) return cached;
	const start = cityPoint(cityById.get(route.cityA)!);
	const end = cityPoint(cityById.get(route.cityB)!);
	const dx = end.x - start.x,
		dy = end.y - start.y;
	const geometry = { start, end, dx, dy, distance: Math.hypot(dx, dy), normalX: 0, normalY: 0 };
	geometryCache.set(route.id, geometry);
	return geometry;
}
export const ROUTE_MARKER_LENGTH = 34;
export const ROUTE_MARKER_WIDTH = 8.8;
export const ROUTE_MARKER_GAP = 0.9;
type RoutePath = { points: RoutePoint[]; distances: number[]; length: number; svg: string };
const pathCache = new Map<string, RoutePath>();

function routePath(route: Route): RoutePath {
	const cached = pathCache.get(route.id);
	if (cached) return cached;
	const trace = routeTrace[route.id];
	if (!trace) throw new Error(`Missing route trace: ${route.id}`);
	const controls = trace.map(normalizeTracePoint);
	const start = controls[0]!,
		end = controls.at(-1)!;
	const points = Array.from({ length: 129 }, (_, i) => {
		const t = i / 128,
			u = 1 - t;
		if (controls.length === 2) return { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t };
		const a = controls[1]!,
			b = controls[2]!;
		return {
			x: u ** 3 * start.x + 3 * u ** 2 * t * a.x + 3 * u * t ** 2 * b.x + t ** 3 * end.x,
			y: u ** 3 * start.y + 3 * u ** 2 * t * a.y + 3 * u * t ** 2 * b.y + t ** 3 * end.y,
		};
	});
	const distances = [0];
	for (let i = 1; i < points.length; i++) {
		const a = points[i - 1]!,
			b = points[i]!;
		distances.push(distances[i - 1]! + Math.hypot(b.x - a.x, b.y - a.y));
	}
	const format = (p: RoutePoint) => `${p.x.toFixed(3)} ${p.y.toFixed(3)}`;
	const svg = `M ${format(start)} ${controls.length === 2 ? 'L' : 'C'} ${controls.slice(1).map(format).join(' ')}`;
	const path = { points, distances, length: distances.at(-1)!, svg };
	pathCache.set(route.id, path);
	return path;
}

export function routePoint(route: Route, t: number): RoutePoint {
	const path = routePath(route);
	const distance = Math.max(0, Math.min(1, t)) * path.length;
	let low = 0,
		high = path.distances.length - 1;
	while (high - low > 1) {
		const middle = (low + high) >> 1;
		if (path.distances[middle]! < distance) low = middle;
		else high = middle;
	}
	const a = path.points[low]!,
		b = path.points[high]!;
	const fraction = (distance - path.distances[low]!) / (path.distances[high]! - path.distances[low]!);
	return { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction };
}

const markerLengthCache = new Map<string, number>();
export function routeMarkerLength(route: Route) {
	const cached = markerLengthCache.get(route.id);
	if (cached) return cached;
	let spacing = routePath(route).length / route.length;
	for (let i = 1; i < route.length; i++) {
		const previous = routePoint(route, routeMarkerT(route, i - 1));
		const current = routePoint(route, routeMarkerT(route, i));
		spacing = Math.min(spacing, Math.hypot(current.x - previous.x, current.y - previous.y));
	}
	const length = spacing - ROUTE_MARKER_GAP;
	markerLengthCache.set(route.id, length);
	return length;
}

export function routeMarkerT(route: Route, index: number) {
	return (index + 0.5) / route.length;
}

export function routeMarkerPoint(route: Route, index: number) {
	return routePoint(route, routeMarkerT(route, index));
}

export function routeSvgPath(route: Route) {
	return routePath(route).svg;
}

export function routeOutlinePath(route: Route) {
	const { start, end } = routeGeometry(route);
	return `M ${start.x} ${start.y} L ${routePath(route).svg.slice(2)} L ${end.x} ${end.y}`;
}
