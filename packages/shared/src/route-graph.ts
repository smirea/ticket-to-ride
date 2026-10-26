import type { Route } from './maps/types';

// Vertices are city ids, or `city#position` for positions that do not connect to each other.
export type Vertex = string;
export type RouteStep = { route: Route; city: Vertex; reverse: boolean };
export type RouteGraph = ReadonlyMap<Vertex, readonly RouteStep[]>;

export function createRouteGraph(
	routes: readonly Route[],
	vertex: (city: string, position: number) => Vertex = city => city,
): RouteGraph {
	const graph = new Map<Vertex, RouteStep[]>();
	for (const route of routes) {
		const a = vertex(route.cityA, route.positionA);
		const b = vertex(route.cityB, route.positionB);
		graph.set(a, [...(graph.get(a) ?? []), { route, city: b, reverse: false }]);
		graph.set(b, [...(graph.get(b) ?? []), { route, city: a, reverse: true }]);
	}
	for (const edges of graph.values()) Object.freeze(edges);
	return graph;
}

export function findRoutePath(
	graph: RouteGraph,
	from: Vertex | readonly Vertex[],
	to: Vertex | readonly Vertex[],
	cost: (route: Route) => number | undefined,
): { steps: RouteStep[]; cost: number } | undefined {
	const targets = new Set(typeof to === 'string' ? [to] : to);
	const candidates = new Map<Vertex, { steps: RouteStep[]; cost: number; key: string }>(
		(typeof from === 'string' ? [from] : from).map(vertex => [vertex, { steps: [], cost: 0, key: '' }]),
	);
	const visited = new Set<Vertex>();
	while (candidates.size) {
		const [city, path] = [...candidates].sort(
			([a, left], [b, right]) => left.cost - right.cost || left.key.localeCompare(right.key) || a.localeCompare(b),
		)[0]!;
		candidates.delete(city);
		if (targets.has(city)) return { steps: path.steps, cost: path.cost };
		visited.add(city);
		for (const step of graph.get(city) ?? []) {
			if (visited.has(step.city)) continue;
			const weight = cost(step.route);
			if (weight === undefined) continue;
			const distance = path.cost + weight;
			const key = path.key ? `${path.key}|${step.route.id}` : step.route.id;
			const known = candidates.get(step.city);
			if (!known || distance < known.cost || (distance === known.cost && key.localeCompare(known.key) < 0)) {
				candidates.set(step.city, { steps: [...path.steps, step], cost: distance, key });
			}
		}
	}
	return undefined;
}
