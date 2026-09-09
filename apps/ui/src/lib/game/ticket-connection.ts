import { USA_ROUTES, type DestinationTicket, type GameState, type Route } from '@repo/shared';

export function shortestTicketConnection(
	state: Pick<GameState, 'claimedRoutes'>,
	playerId: string,
	ticket: Pick<DestinationTicket, 'cityA' | 'cityB'>,
	routes: readonly Route[] = USA_ROUTES,
): { routeId: string; reverse: boolean }[] {
	const distances = new Map<string, number>([[ticket.cityA, 0]]);
	const previous = new Map<string, { city: string; routeId: string; reverse: boolean }>();
	const pending = new Set<string>([ticket.cityA]);
	while (pending.size) {
		const city = [...pending].sort((a, b) => distances.get(a)! - distances.get(b)!)[0]!;
		pending.delete(city);
		if (city === ticket.cityB) break;
		for (const route of routes) {
			if (state.claimedRoutes[route.id] !== playerId || (route.cityA !== city && route.cityB !== city)) continue;
			const reverse = route.cityB === city;
			const next = reverse ? route.cityA : route.cityB;
			const distance = distances.get(city)! + route.length;
			if (distance >= (distances.get(next) ?? Infinity)) continue;
			distances.set(next, distance);
			previous.set(next, { city, routeId: route.id, reverse });
			pending.add(next);
		}
	}
	const result: { routeId: string; reverse: boolean }[] = [];
	let city = ticket.cityB;
	while (city !== ticket.cityA) {
		const step = previous.get(city);
		if (!step) return [];
		result.unshift({ routeId: step.routeId, reverse: step.reverse });
		city = step.city;
	}
	return result;
}
