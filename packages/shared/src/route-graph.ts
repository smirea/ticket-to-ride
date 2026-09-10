import type { CityId, Route } from './game';

export type RouteStep = { route: Route; city: CityId; reverse: boolean };
export type RouteGraph = ReadonlyMap<CityId, readonly RouteStep[]>;

export function createRouteGraph(routes: readonly Route[]): RouteGraph {
	const graph = new Map<CityId, RouteStep[]>();
	for (const route of routes) {
		graph.set(route.cityA, [...(graph.get(route.cityA) ?? []), { route, city: route.cityB, reverse: false }]);
		graph.set(route.cityB, [...(graph.get(route.cityB) ?? []), { route, city: route.cityA, reverse: true }]);
	}
	for (const edges of graph.values()) Object.freeze(edges);
	return graph;
}

export function findRoutePath(
	graph: RouteGraph,
	from: CityId,
	to: CityId,
	cost: (route: Route) => number | undefined,
): { steps: RouteStep[]; cost: number } | undefined {
	const candidates = new Map<CityId, { steps: RouteStep[]; cost: number; key: string }>([
		[from, { steps: [], cost: 0, key: '' }],
	]);
	const visited = new Set<CityId>();
	while (candidates.size) {
		const [city, path] = [...candidates].sort(
			([a, left], [b, right]) => left.cost - right.cost || left.key.localeCompare(right.key) || a.localeCompare(b),
		)[0]!;
		candidates.delete(city);
		if (city === to) return { steps: path.steps, cost: path.cost };
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
