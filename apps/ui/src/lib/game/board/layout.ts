import { getGameMap, type City, type GameMap, type Route } from '@repo/shared';
import { boardArt, type BoardArt, type Point } from '../../maps';

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
export const ROUTE_MARKER_WIDTH = 8.8;
export const ROUTE_MARKER_GAP = 0.9;
// The USA board's width; other boards are scaled so their cars come out about as long as the USA's.
export const BOARD_WIDTH = 1000;
const TARGET_CAR_SPACING = 34;
// Generated routes stop this far from a city centre, clear of its hub.
const CITY_CLEARANCE = 13.5;
const MAX_CLEARANCE = 40;
// Crowded ends give up clearance before a car gets shorter than this.
const MIN_CAR_SPACING = 22;
const LANE_SPACING = ROUTE_MARKER_WIDTH + 2.4;
const SAMPLES = 128;

type RoutePath = { points: Point[]; distances: number[]; length: number; svg: string };

export interface BoardLayout {
	map: GameMap;
	art: BoardArt;
	width: number;
	height: number;
	cityPoint(city: City, position?: number): Point;
	routeEnds(route: Route): [Point, Point];
	routePoint(route: Route, t: number): Point;
	routeMarkerT(route: Route, index: number): number;
	routeMarkerPoint(route: Route, index: number): Point;
	routeMarkerLength(route: Route): number;
	routeSvgPath(route: Route): string;
	routeOutlinePath(route: Route): string;
}

const layouts = new Map<string, BoardLayout>();

export function boardLayout(mapId: string): BoardLayout {
	let layout = layouts.get(mapId);
	if (!layout) layouts.set(mapId, (layout = createBoardLayout(getGameMap(mapId), boardArt(mapId))));
	return layout;
}

function sampleCurve(controls: readonly Point[]): Point[] {
	const [start, a, b, end] = controls.length === 4 ? controls : [controls[0]!, undefined, undefined, controls.at(-1)!];
	return Array.from({ length: SAMPLES + 1 }, (_, i) => {
		const t = i / SAMPLES,
			u = 1 - t;
		if (!a || !b) return { x: start!.x + (end!.x - start!.x) * t, y: start!.y + (end!.y - start!.y) * t };
		return {
			x: u ** 3 * start!.x + 3 * u ** 2 * t * a.x + 3 * u * t ** 2 * b.x + t ** 3 * end!.x,
			y: u ** 3 * start!.y + 3 * u ** 2 * t * a.y + 3 * u * t ** 2 * b.y + t ** 3 * end!.y,
		};
	});
}

function measure(points: Point[]): number[] {
	const distances = [0];
	for (let i = 1; i < points.length; i++) {
		distances.push(distances[i - 1]! + Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.y - points[i - 1]!.y));
	}
	return distances;
}

function pointAt(points: Point[], distances: number[], distance: number): Point {
	let low = 0,
		high = distances.length - 1;
	while (high - low > 1) {
		const middle = (low + high) >> 1;
		if (distances[middle]! < distance) low = middle;
		else high = middle;
	}
	const a = points[low]!,
		b = points[high]!;
	const span = distances[high]! - distances[low]!;
	const fraction = span > 0 ? (distance - distances[low]!) / span : 0;
	return { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction };
}

// Cuts the clearances off both ends of a sampled curve, keeping enough track for its cars.
function trim(points: Point[], startClearance: number, endClearance: number, minTrack: number): Point[] {
	const distances = measure(points);
	const total = distances.at(-1)!;
	const floor = Math.min(CITY_CLEARANCE, total / 2 - 1);
	const extra = startClearance + endClearance - 2 * floor;
	const room = Math.max(0, total - minTrack - 2 * floor);
	const scale = extra > 0 ? Math.min(1, room / extra) : 1;
	const from = floor + (startClearance - floor) * scale,
		to = total - floor - (endClearance - floor) * scale;
	return Array.from({ length: SAMPLES + 1 }, (_, i) => pointAt(points, distances, from + ((to - from) * i) / SAMPLES));
}

function toPath(points: Point[]): RoutePath {
	const distances = measure(points);
	const format = (p: Point) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
	const svg = `M ${points
		.filter((_, i) => i % 8 === 0 || i === points.length - 1)
		.map(format)
		.join(' L ')}`;
	return { points, distances, length: distances.at(-1)!, svg };
}

// Parallel tracks between the same two points sit side by side in lanes.
function laneOffsets(map: GameMap): Map<string, number> {
	const groups = new Map<string, Route[]>();
	for (const route of map.routes) {
		const ends = [`${route.cityA}:${route.positionA}`, `${route.cityB}:${route.positionB}`].sort().join('/');
		groups.set(ends, [...(groups.get(ends) ?? []), route]);
	}
	const offsets = new Map<string, number>();
	for (const members of groups.values()) {
		members.forEach((route, index) => offsets.set(route.id, (index - (members.length - 1) / 2) * LANE_SPACING));
	}
	return offsets;
}

function boardWidth(map: GameMap, aspect: number): number {
	const cityById = new Map(map.cities.map(city => [city.id, city]));
	const spans = map.routes.map(route => {
		const a = cityById.get(route.cityA)!.positions[route.positionA]!;
		const b = cityById.get(route.cityB)!.positions[route.positionB]!;
		return { distance: Math.hypot(a.x - b.x, (a.y - b.y) / aspect), length: route.length };
	});
	let width = BOARD_WIDTH;
	for (let i = 0; i < 6; i++) {
		const spacings = spans
			.map(span => (span.distance * width - 2 * CITY_CLEARANCE) / span.length)
			.sort((left, right) => left - right);
		width *= TARGET_CAR_SPACING / spacings[Math.floor(spacings.length / 2)]!;
	}
	return Math.round(width);
}

export function createBoardLayout(map: GameMap, art: BoardArt, bends = art.bends ?? {}): BoardLayout {
	const width = art.cityPoints ? BOARD_WIDTH : boardWidth(map, art.aspect);
	const height = width / art.aspect;
	const cityById = new Map(map.cities.map(city => [city.id, city]));
	const lanes = laneOffsets(map);
	const paths = new Map<string, RoutePath>();
	const markerLengths = new Map<string, number>();

	function cityPoint(city: City, position = 0): Point {
		const override = art.cityPoints?.[city.id];
		if (override) return override;
		const positions = art.positions?.[city.id] ?? city.positions;
		const point = positions[position] ?? positions[0]!;
		return { x: point.x * width, y: point.y * height };
	}
	function routeEnds(route: Route): [Point, Point] {
		return [
			cityPoint(cityById.get(route.cityA)!, route.positionA),
			cityPoint(cityById.get(route.cityB)!, route.positionB),
		];
	}
	const endKey = (route: Route, side: 'A' | 'B') =>
		side === 'A' ? `${route.cityA}:${route.positionA}` : `${route.cityB}:${route.positionB}`;
	// Generated curves run from the lower end key to the higher one, so lanes and bends keep their side.
	const controlCache = new Map<string, { controls: Point[]; from: string; to: string }>();
	function controlsOf(route: Route) {
		const cached = controlCache.get(route.id);
		if (cached) return cached;
		const [a, b] = routeEnds(route);
		const flip = endKey(route, 'A') > endKey(route, 'B');
		const [start, end] = flip ? [b, a] : [a, b];
		const dx = end.x - start.x,
			dy = end.y - start.y,
			distance = Math.hypot(dx, dy) || 1;
		const normal = { x: -dy / distance, y: dx / distance };
		const lane = lanes.get(route.id) ?? 0;
		// A cubic whose two controls are offset by h bulges its midpoint by 0.75h.
		const bulge = (bends[route.id] ?? 0) / 0.75;
		const shift = (p: Point, by: number) => ({ x: p.x + normal.x * by, y: p.y + normal.y * by });
		const result = {
			controls: [
				shift(start, lane),
				shift({ x: start.x + dx / 3, y: start.y + dy / 3 }, lane + bulge),
				shift({ x: start.x + (2 * dx) / 3, y: start.y + (2 * dy) / 3 }, lane + bulge),
				shift(end, lane),
			],
			from: flip ? endKey(route, 'B') : endKey(route, 'A'),
			to: flip ? endKey(route, 'A') : endKey(route, 'B'),
		};
		controlCache.set(route.id, result);
		return result;
	}
	function departure(route: Route, key: string): Point {
		const { controls, from } = controlsOf(route);
		const [p, q] = key === from ? [controls[0]!, controls[1]!] : [controls[3]!, controls[2]!];
		const length = Math.hypot(q.x - p.x, q.y - p.y) || 1;
		return { x: (q.x - p.x) / length, y: (q.y - p.y) / length };
	}
	const routesAt = new Map<string, Route[]>();
	for (const route of map.routes) {
		for (const side of ['A', 'B'] as const)
			routesAt.set(endKey(route, side), [...(routesAt.get(endKey(route, side)) ?? []), route]);
	}
	// Routes leaving a city at a narrow angle start their cars further out, where they no longer touch.
	function clearance(route: Route, key: string): number {
		const mine = departure(route, key);
		const myHalf = ROUTE_MARKER_WIDTH / 2 + Math.abs(lanes.get(route.id) ?? 0);
		const pair = [endKey(route, 'A'), endKey(route, 'B')].sort().join('/');
		let needed = CITY_CLEARANCE;
		for (const other of routesAt.get(key) ?? []) {
			if (other === route || [endKey(other, 'A'), endKey(other, 'B')].sort().join('/') === pair) continue;
			const theirs = departure(other, key);
			const cosine = mine.x * theirs.x + mine.y * theirs.y;
			if (cosine <= 0) continue;
			const sine = Math.sqrt(Math.max(1e-6, 1 - cosine ** 2));
			const theirHalf = ROUTE_MARKER_WIDTH / 2 + Math.abs(lanes.get(other.id) ?? 0);
			needed = Math.max(needed, (myHalf + theirHalf + 1.2) / sine);
		}
		return Math.min(needed, MAX_CLEARANCE);
	}
	function routePath(route: Route): RoutePath {
		const cached = paths.get(route.id);
		if (cached) return cached;
		const trace = art.traces?.[route.id];
		let path: RoutePath;
		if (trace) {
			path = toPath(sampleCurve(trace));
		} else {
			const { controls, from, to } = controlsOf(route);
			const points = trim(
				sampleCurve(controls),
				clearance(route, from),
				clearance(route, to),
				route.length * MIN_CAR_SPACING,
			);
			path = toPath(from === endKey(route, 'A') ? points : points.reverse());
		}
		paths.set(route.id, path);
		return path;
	}
	function routePoint(route: Route, t: number): Point {
		const path = routePath(route);
		return pointAt(path.points, path.distances, Math.max(0, Math.min(1, t)) * path.length);
	}
	function routeMarkerT(route: Route, index: number) {
		return (index + 0.5) / route.length;
	}
	function routeMarkerPoint(route: Route, index: number) {
		return routePoint(route, routeMarkerT(route, index));
	}
	function routeMarkerLength(route: Route) {
		const cached = markerLengths.get(route.id);
		if (cached) return cached;
		let spacing = routePath(route).length / route.length;
		for (let i = 1; i < route.length; i++) {
			const previous = routeMarkerPoint(route, i - 1),
				current = routeMarkerPoint(route, i);
			spacing = Math.min(spacing, Math.hypot(current.x - previous.x, current.y - previous.y));
		}
		const length = spacing - ROUTE_MARKER_GAP;
		markerLengths.set(route.id, length);
		return length;
	}
	function routeSvgPath(route: Route) {
		return routePath(route).svg;
	}
	function routeOutlinePath(route: Route) {
		const [start, end] = routeEnds(route);
		return `M ${start.x} ${start.y} L ${routeSvgPath(route).slice(2)} L ${end.x} ${end.y}`;
	}
	return {
		map,
		art,
		width,
		height,
		cityPoint,
		routeEnds,
		routePoint,
		routeMarkerT,
		routeMarkerPoint,
		routeMarkerLength,
		routeSvgPath,
		routeOutlinePath,
	};
}
