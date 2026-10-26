import { z } from 'zod';
import {
	cloneState,
	currentPlayer,
	endTurn,
	gameMap,
	hasParallelConflict,
	type CityId,
	type DestinationTicket,
	type GameAction,
	type GameMap,
	type GameState,
	type Player,
	type PlayerId,
	type Route,
	type TrainColor,
} from '../game';
import { cityName } from '../game-events';
import { findRoutePath } from '../route-graph';
import { TRAIN_COLORS } from '../train-cards';
import { defineAction, type Mechanic } from './types';

declare module './types' {
	interface MechanicStateMap {
		// The owner of the station on each city; a city holds at most one station.
		stations: { cities: Record<CityId, PlayerId> };
	}
	interface MechanicRulesMap {
		// costs[n] is the number of cards one color the (n+1)th station costs; its length is the stations per player.
		stations: { costs: readonly number[]; unusedPoints: number };
	}
	interface MechanicActionMap {
		'build-station': { cityId: CityId; paymentColor: TrainColor; locomotives: number };
	}
	interface MechanicEventMap {
		'build-station': { cityId: CityId; cards: number };
	}
}

function stationRules(state: Pick<GameState, 'mapId'>) {
	return gameMap(state).rules.mechanics.stations!;
}

export function stationOwners(state: GameState): Record<CityId, PlayerId> {
	return state.mechanics.stations?.cities ?? {};
}

export function playerStations(state: GameState, playerId: PlayerId): CityId[] {
	return Object.entries(stationOwners(state))
		.filter(([, owner]) => owner === playerId)
		.map(([cityId]) => cityId);
}

// The cards the player's next station costs, or undefined once every station is built.
export function nextStationCost(state: GameState, playerId: PlayerId): number | undefined {
	return stationRules(state).costs[playerStations(state, playerId).length];
}

export function canBuildStation(
	state: GameState,
	player: Player,
	cityId: CityId,
	paymentColor: TrainColor,
	locomotives: number,
): string | undefined {
	const cost = nextStationCost(state, player.id);
	if (cost === undefined) return 'You have no stations left.';
	if (!gameMap(state).city(cityId)) return 'Unknown city.';
	if (stationOwners(state)[cityId]) return 'That city already has a station.';
	if (!Number.isInteger(locomotives) || locomotives < 0 || locomotives > cost) return 'Invalid locomotive count.';
	if (player.hand[paymentColor] < cost - locomotives || player.hand.locomotive < locomotives) {
		return `A station costs ${cost} ${cost === 1 ? 'card' : 'cards'} of one color.`;
	}
	return undefined;
}

// Colors first, then locomotives, keeping the colors the player holds most of.
export function stationPaymentFor(
	player: Player,
	cost: number,
): { paymentColor: TrainColor; locomotives: number } | undefined {
	const color = [...TRAIN_COLORS].sort((a, b) => player.hand[b] - player.hand[a] || a.localeCompare(b))[0]!;
	const locomotives = Math.max(0, cost - player.hand[color]);
	return locomotives <= player.hand.locomotive ? { paymentColor: color, locomotives } : undefined;
}

function vertexOf(map: GameMap, city: CityId, position: number): string {
	return map.city(city)?.separate ? `${city}#${position}` : city;
}

// Opponent routes that a station on this city could borrow.
function borrowable(state: GameState, playerId: PlayerId, cityId: CityId): Route[] {
	return gameMap(state).routes.filter(route => {
		const owner = state.claimedRoutes[route.id];
		return owner && owner !== playerId && (route.cityA === cityId || route.cityB === cityId);
	});
}

function connects(map: GameMap, routes: readonly Route[]): (ticket: DestinationTicket) => boolean {
	const parent = new Map<string, string>();
	const find = (vertex: string): string => {
		const up = parent.get(vertex) ?? vertex;
		if (up === vertex) return vertex;
		const root = find(up);
		parent.set(vertex, root);
		return root;
	};
	for (const route of routes) {
		parent.set(find(vertexOf(map, route.cityA, route.positionA)), find(vertexOf(map, route.cityB, route.positionB)));
	}
	return ticket => {
		const ends = new Set(map.vertices(ticket.cityA).map(find));
		return map.vertices(ticket.cityB).some(vertex => ends.has(find(vertex)));
	};
}

function playerTickets(map: GameMap, player: Player): DestinationTicket[] {
	return player.tickets.flatMap(ticketId => map.ticket(ticketId) ?? []);
}

function ticketPoints(map: GameMap, player: Player, routes: readonly Route[]): number {
	const complete = connects(map, routes);
	return playerTickets(map, player).reduce((sum, ticket) => sum + (complete(ticket) ? ticket.points : 0), 0);
}

/*
 * The opponent routes the player's stations borrow: one per station, chosen to maximise the player's ticket points.
 * The rules let players choose only at the end, so the choice is recomputed from the current board every time.
 * Ties prefer routes on the cheapest way to finish an open ticket, so bots keep planning through their stations.
 */
export function stationBorrowings(state: GameState, playerId: PlayerId): Route[] {
	const player = state.players.find(item => item.id === playerId);
	const cities = playerStations(state, playerId);
	if (!player || cities.length === 0) return [];
	const map = gameMap(state);
	const choices = cities.map(city => borrowable(state, playerId, city)).filter(routes => routes.length > 0);
	if (choices.length === 0) return [];
	const own = map.routes.filter(route => state.claimedRoutes[route.id] === playerId);

	let best: { routes: Route[]; points: number }[] = [];
	const visit = (index: number, picked: Route[]) => {
		if (index === choices.length) {
			const points = ticketPoints(map, player, [...own, ...picked]);
			if (best.length === 0 || points > best[0]!.points) best = [{ routes: picked, points }];
			else if (points === best[0]!.points) best.push({ routes: picked, points });
			return;
		}
		for (const route of choices[index]!) visit(index + 1, picked.includes(route) ? picked : [...picked, route]);
	};
	visit(0, []);
	if (best.length === 1) return best[0]!.routes;
	const wanted = plannedBorrowings(state, player);
	const useful = (routes: Route[]) => routes.filter(route => wanted.has(route.id)).length;
	return best.reduce((chosen, option) => (useful(option.routes) > useful(chosen.routes) ? option : chosen)).routes;
}

// Opponent routes next to the player's stations that lie on the cheapest path of an open ticket.
function plannedBorrowings(state: GameState, player: Player): Set<string> {
	const map = gameMap(state);
	const stations = new Set(playerStations(state, player.id));
	const wanted = new Set<string>();
	for (const ticket of playerTickets(map, player)) {
		const path = findRoutePath(map.graph, map.vertices(ticket.cityA), map.vertices(ticket.cityB), route => {
			const owner = state.claimedRoutes[route.id];
			if (owner === player.id) return 0;
			if (owner) return stations.has(route.cityA) || stations.has(route.cityB) ? 0 : undefined;
			return hasParallelConflict(state, route, player.id) ? undefined : route.length;
		});
		for (const step of path?.steps ?? []) {
			if (state.claimedRoutes[step.route.id] && state.claimedRoutes[step.route.id] !== player.id)
				wanted.add(step.route.id);
		}
	}
	return wanted;
}

const STATION_PATH_PENALTY = 3;

/*
 * Bots build a station when the cheapest way to finish an open ticket, counting a borrowed opponent route as a few
 * extra cars, runs through one; the station goes on that route's end nearest the bot's own network.
 */
function botStation(state: GameState, player: Player): GameAction | undefined {
	const cost = nextStationCost(state, player.id);
	if (cost === undefined || state.phase.type !== 'turn' || state.phase.drawsTaken !== 0) return undefined;
	const payment = stationPaymentFor(player, cost);
	if (!payment) return undefined;
	const map = gameMap(state);
	const owners = stationOwners(state);
	const borrowed = new Set(stationBorrowings(state, player.id).map(route => route.id));
	const complete = connects(
		map,
		map.routes.filter(route => state.claimedRoutes[route.id] === player.id || borrowed.has(route.id)),
	);
	const open = playerTickets(map, player)
		.filter(ticket => !complete(ticket))
		.sort((a, b) => b.points - a.points);
	for (const ticket of open) {
		const path = findRoutePath(map.graph, map.vertices(ticket.cityA), map.vertices(ticket.cityB), route => {
			const owner = state.claimedRoutes[route.id];
			if (owner === player.id || borrowed.has(route.id)) return 0;
			if (owner) {
				const free = !owners[route.cityA] || !owners[route.cityB];
				return free ? route.length + STATION_PATH_PENALTY : undefined;
			}
			if (route.length > player.trains || hasParallelConflict(state, route, player.id)) return undefined;
			return route.length;
		});
		if (!path || path.cost > player.trains) continue;
		const steps = path.steps.filter(step => {
			const owner = state.claimedRoutes[step.route.id];
			return owner && owner !== player.id && !borrowed.has(step.route.id);
		});
		if (steps.length !== 1) continue;
		const route = steps[0]!.route;
		const cityId = [route.cityA, route.cityB].find(city => !owners[city])!;
		if (canBuildStation(state, player, cityId, payment.paymentColor, payment.locomotives)) continue;
		return { type: 'build-station', cityId, ...payment };
	}
	return undefined;
}

export const stations: Mechanic = {
	id: 'stations',
	validate(map) {
		const config = map.rules.mechanics.stations;
		if (!config) return 'rules.mechanics.stations is required.';
		if (config.costs.length === 0 || config.costs.some(cost => !Number.isInteger(cost) || cost < 1)) {
			return 'station costs must be positive integers.';
		}
		return undefined;
	},
	setup(state) {
		state.mechanics.stations = { cities: {} };
	},
	actions: {
		'build-station': defineAction<'build-station'>({
			timing: 'turn',
			schema: z.object({
				cityId: z.string().max(64),
				paymentColor: z.enum(TRAIN_COLORS),
				locomotives: z.int().min(0).max(16),
			}),
			apply(state, action) {
				const player = currentPlayer(state);
				const error = canBuildStation(state, player, action.cityId, action.paymentColor, action.locomotives);
				if (error) return { ok: false, state, error };
				const cost = nextStationCost(state, player.id)!;
				const next = cloneState(state);
				const builder = currentPlayer(next);
				const cars = cost - action.locomotives;
				builder.hand[action.paymentColor] -= cars;
				builder.hand.locomotive -= action.locomotives;
				next.trainDiscard.push(...Array<TrainColor>(cars).fill(action.paymentColor));
				next.trainDiscard.push(...Array<'locomotive'>(action.locomotives).fill('locomotive'));
				next.mechanics.stations!.cities[action.cityId] = builder.id;
				next.events.push({
					type: 'build-station',
					playerId: builder.id,
					turnNumber: next.turnNumber,
					cityId: action.cityId,
					cards: cost,
				});
				endTurn(next);
				return { ok: true, state: next };
			},
		}),
	},
	hasTurnAction(state, player) {
		const cost = nextStationCost(state, player.id);
		const owners = stationOwners(state);
		return (
			cost !== undefined &&
			stationPaymentFor(player, cost) !== undefined &&
			gameMap(state).cities.some(city => !owners[city.id])
		);
	},
	ticketRoutes: stationBorrowings,
	scoring(state) {
		const { costs, unusedPoints } = stationRules(state);
		return Object.fromEntries(
			state.players.map(player => {
				const unused = costs.length - playerStations(state, player.id).length;
				return [
					player.id,
					unused > 0 && unusedPoints > 0
						? [{ id: 'unused-stations', label: 'Unused stations', points: unused * unusedPoints }]
						: [],
				];
			}),
		);
	},
	tiebreak: (state, playerId) => -playerStations(state, playerId).length,
	chooseBotAction: botStation,
	describeEvent(event, playerName, state) {
		if (event.type !== 'build-station') return undefined;
		return `${playerName} built a station in ${cityName(state, event.cityId)}.`;
	},
};
