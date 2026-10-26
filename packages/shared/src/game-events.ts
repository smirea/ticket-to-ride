import type { MechanicEvent } from './mechanics/types';
import {
	gameMap,
	type GameState,
	type PlayerId,
	type RouteId,
	type TicketId,
	type TrainCard,
	type TrainColor,
} from './game';

type PlayerEvent = { playerId: PlayerId; turnNumber: number };
export type GameEvent =
	| { type: 'game-started'; playerCount: number }
	| (PlayerEvent & { type: 'keep-tickets'; count: number; ticketIds?: TicketId[] })
	| (PlayerEvent & { type: 'draw-destination-tickets'; count: number })
	| (PlayerEvent & { type: 'draw-face-up'; card: TrainCard })
	| (PlayerEvent & { type: 'draw-train-deck' })
	| (PlayerEvent & {
			type: 'claim-route';
			routeId: RouteId;
			paymentColor: TrainColor;
			cars: number;
			locomotives: number;
			points: number;
	  })
	| (PlayerEvent & { type: 'final-round' })
	| (PlayerEvent & { type: 'pass' })
	| { type: 'game-over'; winnerIds: PlayerId[] }
	| { type: 'note'; text: string }
	| MechanicEvent;

export function cityName(state: Pick<GameState, 'mapId'>, cityId: string): string {
	return gameMap(state).city(cityId)?.name ?? cityId;
}

export function routeName(state: Pick<GameState, 'mapId'>, routeId: RouteId): string {
	const route = gameMap(state).route(routeId);
	if (!route) return routeId;
	return `${cityName(state, route.cityA)}–${cityName(state, route.cityB)}`;
}

// What a player did in a mechanic event, without the player's name or a full stop.
export function describeMechanicEvent(event: MechanicEvent, state: Pick<GameState, 'mapId'>): string | undefined {
	for (const mechanic of gameMap(state).mechanics) {
		const text = mechanic.describeEvent?.(event);
		if (text) return text;
	}
	return undefined;
}

export function formatGameEvent(event: GameEvent, state: Pick<GameState, 'mapId' | 'players'>): string {
	const name = (id: PlayerId) => state.players.find(player => player.id === id)?.name ?? id;
	const player = 'playerId' in event ? name(event.playerId) : '';
	switch (event.type) {
		case 'game-started':
			return `Game started with ${event.playerCount} players.`;
		case 'keep-tickets':
			return `${player} kept ${event.count} destination ${event.count === 1 ? 'ticket' : 'tickets'}.`;
		case 'draw-destination-tickets':
			return `${player} drew ${event.count} destination tickets.`;
		case 'draw-face-up':
			return `${player} drew a face-up ${event.card} card.`;
		case 'draw-train-deck':
			return `${player} drew from the train deck.`;
		case 'claim-route':
			return `${player} claimed ${routeName(state, event.routeId)}.`;
		case 'final-round':
			return `${player} triggered the final round.`;
		case 'pass':
			return `${player} had no move and passed.`;
		case 'game-over':
			return `Game over. ${event.winnerIds.map(name).join(' and ')} ${event.winnerIds.length === 1 ? 'wins' : 'tie for the win'}.`;
		case 'note':
			return event.text;
		default:
			return `${player} ${describeMechanicEvent(event as MechanicEvent, state) ?? (event as { type: string }).type}.`;
	}
}
