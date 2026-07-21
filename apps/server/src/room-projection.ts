import { TRAIN_CARDS, type GameAction, type GameState, type RoomState, type TicketId } from '@repo/shared';

export function projectRoomForViewer(room: RoomState, viewerId: string): RoomState {
	const projected = structuredClone(room);
	if (!projected.game) {
		if (projected.hostId !== viewerId) projected.settings.seed = '';
		return projected;
	}

	projected.settings.seed = '';
	projected.game = projectGame(projected.game, viewerId);
	return projected;
}

function projectGame(game: GameState, viewerId: string): GameState {
	const projected = structuredClone(game);
	for (const player of projected.players) {
		if (player.id === viewerId) continue;
		const handCount = Object.values(player.hand).reduce((sum, count) => sum + count, 0);
		for (const card of TRAIN_CARDS) player.hand[card] = 0;
		player.hand.red = handCount;
		if (projected.phase.type !== 'game-over') player.tickets = privateTicketIds('player', player.tickets.length);
	}

	projected.seed = 'private';
	projected.rngState = 0;
	projected.trainDeck.fill('red');
	projected.trainDiscard.fill('red');
	projected.destinationDeck = privateTicketIds('deck', projected.destinationDeck.length);
	projected.destinationDiscard = privateTicketIds('discard', projected.destinationDiscard.length);
	projected.openingTicketOffers = game.openingTicketOffers[viewerId]
		? { [viewerId]: [...game.openingTicketOffers[viewerId]!] }
		: {};
	projected.history = game.history.map(redactAction);
	if (projected.phase.type === 'ticket-selection' && projected.phase.playerId !== viewerId) {
		projected.phase.ticketIds = privateTicketIds('offer', projected.phase.ticketIds.length);
	}
	return projected;
}

function redactAction(action: GameAction): GameAction {
	return action.type === 'keep-tickets' ? { type: 'keep-tickets', ticketIds: [] } : structuredClone(action);
}

function privateTicketIds(collection: string, count: number): TicketId[] {
	return Array.from({ length: count }, (_, index) => `private-${collection}-${index + 1}`);
}
