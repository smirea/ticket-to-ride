import { USA_CITIES } from '@repo/shared';
import { cityTrace, normalizeTracePoint } from './route-trace';

type Point = { x: number; y: number };
type Anchor = { source: Point; target: Point };
type Triangle = readonly [number, number, number];
const cross = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
const anchors: Anchor[] = [
	...USA_CITIES.map(city => ({
		source: normalizeTracePoint(cityTrace[city.id]!),
		target: {
			x: city.x * 10 + (city.id === 'omaha' ? 20 : city.id === 'kansas-city' ? 10 : 0),
			y: city.y * 6.2 - (city.id === 'omaha' ? 18 : 0),
		},
	})),
	// The east-edge anchor prevents a Boston–New York–Washington triangle from folding as the coast bends west.
	...[
		{ x: 0, y: 0 },
		{ x: 1000, y: 0 },
		{ x: 1000, y: 620 },
		{ x: 0, y: 620 },
		{ x: 1000, y: 200 },
	].map(point => ({ source: point, target: point })),
];

function triangulate() {
	const points = [
		...anchors.map(anchor => anchor.source),
		{ x: -10000, y: -10000 },
		{ x: 20000, y: -10000 },
		{ x: 0, y: 20000 },
	];
	const count = anchors.length;
	let triangles: Triangle[] = [[count, count + 1, count + 2]];
	for (let index = 0; index < count; index++) {
		const point = points[index]!;
		const edges = new Map<string, readonly [number, number]>();
		triangles = triangles.filter(triangle => {
			const [a, b, c] = triangle.map(vertex => points[vertex]!);
			const ax = a!.x - point.x,
				ay = a!.y - point.y;
			const bx = b!.x - point.x,
				by = b!.y - point.y;
			const cx = c!.x - point.x,
				cy = c!.y - point.y;
			const determinant =
				(ax * ax + ay * ay) * (bx * cy - cx * by) -
				(bx * bx + by * by) * (ax * cy - cx * ay) +
				(cx * cx + cy * cy) * (ax * by - bx * ay);
			if (determinant <= 0) return true;
			for (let edge = 0; edge < 3; edge++) {
				const start = triangle[edge]!,
					end = triangle[(edge + 1) % 3]!;
				const key = start < end ? `${start}:${end}` : `${end}:${start}`;
				if (edges.has(key)) edges.delete(key);
				else edges.set(key, [start, end]);
			}
			return false;
		});
		for (const [a, b] of edges.values()) triangles.push([a, b, index]);
	}
	return triangles.filter(triangle => triangle.every(index => index < count));
}

const triangles = triangulate().map(indices => {
	const [a, b, c] = indices.map(index => anchors[index]!);
	return { a: a!, b: b!, c: c!, area: cross(a!.source, b!.source, c!.source) };
});

// Only legacy relief/land sampling uses this mapping; the newly painted atlas is already registered and must use direct UVs.
export function atlasPoint(point: Point): Point {
	for (const { a, b, c, area } of triangles) {
		const wa = cross(b.source, c.source, point) / area;
		const wb = cross(c.source, a.source, point) / area;
		const wc = 1 - wa - wb;
		if (wa >= -1e-8 && wb >= -1e-8 && wc >= -1e-8)
			return {
				x: a.target.x * wa + b.target.x * wb + c.target.x * wc,
				y: a.target.y * wa + b.target.y * wb + c.target.y * wc,
			};
	}
	return point;
}
