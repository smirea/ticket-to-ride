import { USA_CITIES, USA_ROUTES, type City, type Route } from '@repo/shared';

export const cities = USA_CITIES;
export const routes = USA_ROUTES;
export const cityById = new Map(cities.map(city => [city.id, city]));
export const routeColors = {
	red: '#b75c53',
	orange: '#be8751',
	yellow: '#c8ad59',
	green: '#658576',
	blue: '#638ca5',
	purple: '#947e9c',
	black: '#4e5554',
	white: '#e9e3d1',
	gray: '#8a8c80',
};
export const playerColors = { red: '#cf201e', blue: '#047ac1', green: '#19854b', yellow: '#efb900', black: '#343c43' };
export const mainland = [
	[-80, -170],
	[1020, -150],
	[1035, -100],
	[1050, -45],
	[1030, 10],
	[1000, 54],
	[969, 59],
	[955, 94],
	[974, 113],
	[962, 136],
	[945, 153],
	[929, 166],
	[923, 194],
	[906, 204],
	[898, 230],
	[881, 250],
	[888, 262],
	[874, 287],
	[858, 295],
	[866, 317],
	[884, 327],
	[893, 355],
	[875, 387],
	[880, 410],
	[861, 434],
	[848, 452],
	[854, 470],
	[871, 495],
	[893, 534],
	[903, 572],
	[897, 596],
	[880, 603],
	[861, 584],
	[852, 554],
	[839, 530],
	[819, 505],
	[799, 493],
	[774, 497],
	[752, 508],
	[735, 515],
	[714, 528],
	[691, 532],
	[670, 539],
	[641, 550],
	[617, 548],
	[592, 560],
	[565, 559],
	[541, 567],
	[516, 578],
	[508, 606],
	[550, 760],
	[382, 790],
	[277, 760],
	[259, 596],
	[236, 572],
	[216, 554],
	[211, 528],
	[194, 510],
	[167, 493],
	[148, 482],
	[125, 477],
	[101, 464],
	[83, 447],
	[65, 425],
	[60, 398],
	[48, 375],
	[41, 347],
	[41, 324],
	[36, 294],
	[29, 272],
	[23, 242],
	[23, 221],
	[26, 193],
	[34, 164],
	[43, 139],
	[38, 113],
	[31, 92],
	[24, 77],
	[22, 50],
	[12, 29],
];
export const lakes = [
	[
		[489, 97],
		[511, 91],
		[532, 95],
		[546, 109],
		[574, 109],
		[599, 105],
		[621, 115],
		[625, 129],
		[607, 136],
		[586, 130],
		[566, 137],
		[545, 131],
		[526, 120],
		[506, 119],
	],
	[
		[631, 141],
		[642, 153],
		[649, 177],
		[650, 203],
		[637, 224],
		[627, 237],
		[618, 230],
		[618, 209],
		[625, 182],
		[624, 158],
	],
	[
		[660, 142],
		[675, 131],
		[691, 132],
		[704, 145],
		[700, 161],
		[685, 172],
		[679, 190],
		[661, 185],
		[663, 167],
	],
	[
		[683, 210],
		[707, 202],
		[733, 194],
		[750, 195],
		[742, 206],
		[720, 215],
		[697, 219],
	],
	[
		[734, 175],
		[752, 164],
		[774, 167],
		[777, 174],
		[753, 182],
	],
];
export function insidePolygon(x: number, y: number, polygon: number[][]) {
	let inside = false;
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const a = polygon[i]!;
		const b = polygon[j]!;
		if (a[1]! > y !== b[1]! > y && x < ((b[0]! - a[0]!) * (y - a[1]!)) / (b[1]! - a[1]!) + a[0]!) inside = !inside;
	}
	return inside;
}
export function isLand(x: number, y: number) {
	return insidePolygon(x, y, mainland) && !lakes.some(lake => insidePolygon(x, y, lake));
}
export function terrainHeight(x: number, y: number) {
	const ridgeCenter = 158 + y * 0.15 + Math.sin(y * 0.018) * 15;
	const ridgeEnvelope = Math.exp(-Math.pow((x - ridgeCenter) / 48, 2));
	const ridge =
		ridgeEnvelope * (11 + 26 * Math.pow(Math.abs(Math.sin(x * 0.077 + y * 0.049) * Math.cos(y * 0.026)), 1.7));
	const coast = Math.exp(-Math.pow((x - (68 + y * 0.1)) / 19, 2)) * (3 + 7 * Math.pow(Math.sin(y * 0.062), 2));
	const east =
		Math.exp(-Math.pow((x - (838 - y * 0.12)) / 39, 2)) * (2 + 5 * Math.pow(Math.sin(y * 0.072 + x * 0.041), 2));
	const edge = Math.min(1, Math.max(0, Math.min(x, 1000 - x, y, 620 - y) / 30));
	return (isLand(x, y) ? 1.2 + (ridge + coast + east) * 0.21 : 0) * edge;
}

export function cityPoint(city: City) {
	return { x: city.x * 10, y: city.y * 6.2 };
}
type RouteGeometry = {
	start: { x: number; y: number };
	end: { x: number; y: number };
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
	const parallels = routes.filter(
		candidate => [candidate.cityA, candidate.cityB].sort().join(':') === [route.cityA, route.cityB].sort().join(':'),
	);
	const direction = route.cityA < route.cityB ? 1 : -1;
	const offset = (parallels.indexOf(route) - (parallels.length - 1) / 2) * 14 * direction;
	const dx = end.x - start.x,
		dy = end.y - start.y,
		distance = Math.hypot(dx, dy);
	const geometry = {
		start,
		end,
		dx,
		dy,
		distance,
		normalX: (-dy / distance) * offset,
		normalY: (dx / distance) * offset,
	};
	geometryCache.set(route.id, geometry);
	return geometry;
}
export function routePoint(route: Route, t: number) {
	const g = routeGeometry(route);
	const coastalCurve = route.id === 'new-orleans-miami-red' ? -35 : route.id === 'atlanta-miami-blue' ? -14 : undefined;
	const arc = Math.sin(t * Math.PI) * (coastalCurve ?? (g.distance > 140 ? 5 : 1.5));
	return {
		x: g.start.x + g.dx * t + g.normalX - (g.dy / g.distance) * arc,
		y: g.start.y + g.dy * t + g.normalY + (g.dx / g.distance) * arc,
	};
}
