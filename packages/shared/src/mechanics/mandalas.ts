import { gameMap, hasParallelConflict, shortestTicketConnection } from '../game';
import type { GameState, Player, PlayerId } from '../game';
import type { GameMap, Route, TicketId } from '../maps/types';
import { findRoutePath, type Vertex } from '../route-graph';
import type { Mechanic, ScoreLine } from './types';

// Bonus for the 1st, 2nd, ... qualifying ticket; tickets beyond the table earn nothing more.
export const MANDALA_POINTS = [5, 5, 10, 10, 10] as const;
// Bots chase a second path only when it is this short; longer loops cost more trains than the bonus is worth.
const BOT_MAX_LOOP_COST = 8;

function ownRoutes(state: GameState, playerId: PlayerId): Set<string> {
	return new Set(
		Object.entries(state.claimedRoutes)
			.filter(([, owner]) => owner === playerId)
			.map(([routeId]) => routeId),
	);
}

// Two paths that may cross but share no trains are edge-disjoint paths, so this is a unit-capacity max flow of 2.
function hasTwoDisjointPaths(map: GameMap, owned: ReadonlySet<string>, from: readonly Vertex[], to: readonly Vertex[]) {
	const targets = new Set(to);
	// The vertex each used route currently carries flow into.
	const flowInto = new Map<string, Vertex>();
	for (let flow = 0; flow < 2; flow += 1) {
		const previous = new Map<Vertex, { from: Vertex; route: Route } | null>(from.map(vertex => [vertex, null]));
		const queue = [...from];
		let reached: Vertex | undefined;
		while (queue.length && !reached) {
			const vertex = queue.shift()!;
			for (const step of map.graph.get(vertex) ?? []) {
				if (!owned.has(step.route.id) || previous.has(step.city) || flowInto.get(step.route.id) === step.city) continue;
				previous.set(step.city, { from: vertex, route: step.route });
				if (targets.has(step.city)) {
					reached = step.city;
					break;
				}
				queue.push(step.city);
			}
		}
		if (!reached) return false;
		for (let vertex = reached, link = previous.get(vertex); link; vertex = link.from, link = previous.get(vertex)) {
			// Travelling against an earlier path's flow cancels it, which lets the two paths swap tails.
			if (flowInto.get(link.route.id) === link.from) flowInto.delete(link.route.id);
			else flowInto.set(link.route.id, vertex);
		}
	}
	return true;
}

export function mandalaTicketIds(state: GameState, playerId: PlayerId): TicketId[] {
	const map = gameMap(state);
	const player = state.players.find(candidate => candidate.id === playerId);
	if (!player) return [];
	const owned = ownRoutes(state, playerId);
	return player.tickets.filter(ticketId => {
		const ticket = map.ticket(ticketId);
		return (
			ticket !== undefined && hasTwoDisjointPaths(map, owned, map.vertices(ticket.cityA), map.vertices(ticket.cityB))
		);
	});
}

export function mandalaPoints(count: number): number {
	return MANDALA_POINTS.slice(0, count).reduce((sum, points) => sum + points, 0);
}

// The cheapest unclaimed routes that would give one more completed ticket a second path of the bot's own trains.
function nextLoop(state: GameState, player: Player): Route[] {
	const mandalas = mandalaTicketIds(state, player.id);
	if (mandalas.length >= MANDALA_POINTS.length) return [];
	const map = gameMap(state);
	const owned = ownRoutes(state, player.id);
	const own = map.routes.filter(route => owned.has(route.id));
	let best: { routes: Route[]; cost: number } | undefined;
	for (const ticketId of player.tickets) {
		const ticket = map.ticket(ticketId);
		if (!ticket || mandalas.includes(ticketId)) continue;
		const first = new Set(shortestTicketConnection(state, player.id, ticket, own).map(step => step.routeId));
		if (first.size === 0) continue;
		const second = findRoutePath(map.graph, map.vertices(ticket.cityA), map.vertices(ticket.cityB), route => {
			if (first.has(route.id)) return undefined;
			if (owned.has(route.id)) return 0;
			if (state.claimedRoutes[route.id] || hasParallelConflict(state, route, player.id)) return undefined;
			return route.length;
		});
		if (!second || second.cost > Math.min(BOT_MAX_LOOP_COST, player.trains)) continue;
		if (!best || second.cost < best.cost) {
			best = { routes: second.steps.map(step => step.route).filter(route => !owned.has(route.id)), cost: second.cost };
		}
	}
	return best?.routes ?? [];
}

export const mandalas: Mechanic = {
	id: 'mandalas',
	scoring(state) {
		return Object.fromEntries(
			state.players.map(player => {
				const count = mandalaTicketIds(state, player.id).length;
				const lines: ScoreLine[] = count
					? [{ id: 'mandalas', label: `Mandala ×${count}`, points: mandalaPoints(count) }]
					: [];
				return [player.id, lines];
			}),
		);
	},
	botGoalRoutes: nextLoop,
};
