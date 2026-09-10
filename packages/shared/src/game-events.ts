import {
	getRoute,
	USA_CITIES,
	type Player,
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
	| { type: 'game-over'; winnerIds: PlayerId[] }
	| { type: 'note'; text: string };

export function routeName(routeId: RouteId): string {
	const route = getRoute(routeId);
	if (!route) return routeId;
	const city = (id: string) => USA_CITIES.find(city => city.id === id)?.name ?? id;
	return `${city(route.cityA)}–${city(route.cityB)}`;
}

export function formatGameEvent(event: GameEvent, players: readonly Pick<Player, 'id' | 'name'>[]): string {
	const name = (id: PlayerId) => players.find(player => player.id === id)?.name ?? id;
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
			return `${player} claimed ${routeName(event.routeId)}.`;
		case 'final-round':
			return `${player} triggered the final round.`;
		case 'game-over':
			return `Game over. ${event.winnerIds.map(name).join(' and ')} ${event.winnerIds.length === 1 ? 'wins' : 'tie for the win'}.`;
		case 'note':
			return event.text;
	}
}
