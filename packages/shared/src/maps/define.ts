import { MapSchema, type MapConnection } from '../map-schema';
import { MECHANICS } from '../mechanics';
import { createRouteGraph } from '../route-graph';
import type { City, GameMap, GameMapSpec, MapRules, Route, TrainColor } from './types';

export const DEFAULT_RULES: MapRules = {
	trainsPerPlayer: 45,
	startingHand: 4,
	trainDeck: { perColor: 12, locomotives: 14 },
	routeScores: { 1: 1, 2: 2, 3: 4, 4: 7, 5: 10, 6: 15 },
	openingTickets: { deal: 3, longDeal: 0, keep: 2 },
	ticketDraw: { deal: 3, keep: 1 },
	longestPathBonus: 10,
	globetrotterBonus: 0,
	finalRoundTrains: 2,
};

// Throws at import time so a broken map never reaches a running game.
export function defineGameMap(board: unknown, spec: GameMapSpec): GameMap {
	const definition = MapSchema.parse(board);
	if (definition.id !== spec.id) throw new Error(`Map ${spec.id} was given the board of ${definition.id}.`);
	const rules: MapRules = { ...DEFAULT_RULES, ...spec.rules };
	const fail = (message: string): never => {
		throw new Error(`Map ${spec.id}: ${message}`);
	};

	const mechanics = definition.mechanics.map(id => MECHANICS[id] ?? fail(`mechanic "${id}" is not implemented.`));
	const cities: City[] = definition.nodes.map(node => ({
		id: node.id,
		name: node.name,
		type: node.type,
		positions: node.positions,
		separate: node.connectivity === 'separate' && node.positions.length > 1,
	}));
	const cityById = new Map(cities.map(city => [city.id, city]));
	const routes: Route[] = definition.connections.map(connection => toRoute(connection, fail));
	for (const length of new Set(routes.map(route => route.length))) {
		if (rules.routeScores[length] === undefined) fail(`routeScores has no entry for length ${length}.`);
	}

	const tickets = spec.tickets;
	const ticketIds = new Set<string>();
	for (const ticket of tickets) {
		if (ticketIds.has(ticket.id)) fail(`duplicate ticket ${ticket.id}.`);
		ticketIds.add(ticket.id);
		for (const city of [ticket.cityA, ticket.cityB]) {
			if (!cityById.has(city)) fail(`ticket ${ticket.id} names unknown city ${city}.`);
		}
	}
	const longTickets = tickets.filter(ticket => ticket.long).length;
	const maxPlayers = Math.max(...definition.players);
	if (longTickets < rules.openingTickets.longDeal * maxPlayers) fail('not enough long tickets to deal.');
	if (tickets.length - longTickets < rules.openingTickets.deal * maxPlayers) fail('not enough tickets to deal.');

	const vertex = (city: string, position: number) => (cityById.get(city)?.separate ? `${city}#${position}` : city);
	const limits = new Map(
		definition.parallelGroups.map(group => [
			group.id,
			new Map(group.limits.map(limit => [limit.players, limit.tracks])),
		]),
	);
	const routeById = new Map(routes.map(route => [route.id, route]));
	const ticketById = new Map(tickets.map(ticket => [ticket.id, ticket]));
	return {
		id: spec.id,
		name: spec.name,
		info: spec.info,
		players: definition.players,
		rules,
		cities,
		routes,
		tickets,
		mechanicIds: definition.mechanics,
		mechanics,
		graph: createRouteGraph(routes, vertex),
		city: id => cityById.get(id),
		route: id => routeById.get(id),
		ticket: id => ticketById.get(id),
		vertices: id => {
			const city = cityById.get(id);
			if (!city) return [];
			return city.separate ? city.positions.map((_, position) => vertex(id, position)) : [id];
		},
		parallelLimit: (group, players) => limits.get(group)?.get(players) ?? 1,
	};
}

function toRoute(connection: MapConnection, fail: (message: string) => never): Route {
	const colors = new Set(connection.links.flatMap(link => ('color' in link ? [link.color] : [])));
	const color = [...colors][0] ?? 'gray';
	if (colors.size > 1) fail(`route ${connection.id} mixes colors; implement it in its mechanic.`);
	return {
		id: connection.id,
		cityA: connection.start,
		cityB: connection.end,
		positionA: connection.startPosition,
		positionB: connection.endPosition,
		length: connection.links.length,
		color: color as TrainColor | 'gray',
		locomotives: connection.links.filter(link => link.type === 'locomotive').length,
		...(connection.parallelGroup ? { parallelGroup: connection.parallelGroup } : {}),
		spec: connection,
	};
}
