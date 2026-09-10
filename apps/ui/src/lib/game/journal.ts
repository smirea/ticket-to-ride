import {
	formatGameEvent,
	getTicket,
	routeName,
	type DestinationTicket,
	type GameEvent,
	type GameState,
	type Player,
	type TrainCard,
	type TrainColor,
} from '@repo/shared';

export type JournalRow = {
	id: number;
	player?: Player;
	turnNumber?: number;
	text: string;
	kind: 'draws' | 'claim' | 'tickets' | 'note' | 'score';
	cards?: (TrainCard | 'deck')[];
	count?: number;
	routeId?: string;
	tickets?: DestinationTicket[];
	points?: number;
	ticketOffer?: boolean;
	payment?: { color: TrainColor; cars: number; locomotives: number };
};

function eventRow(event: GameEvent, id: number, state: GameState, viewerId: string): JournalRow {
	const player = 'playerId' in event ? state.players.find(player => player.id === event.playerId) : undefined;
	const row: JournalRow = {
		id,
		player,
		turnNumber: 'turnNumber' in event ? event.turnNumber : undefined,
		text: formatGameEvent(event, state.players),
		kind: 'note',
	};
	switch (event.type) {
		case 'draw-face-up':
			return { ...row, kind: 'draws', text: 'drew', cards: [event.card] };
		case 'draw-train-deck':
			return { ...row, kind: 'draws', text: 'drew', cards: ['deck'] };
		case 'claim-route':
			return {
				...row,
				kind: 'claim',
				text: routeName(event.routeId),
				routeId: event.routeId,
				points: event.points,
				payment: { color: event.paymentColor, cars: event.cars, locomotives: event.locomotives },
			};
		case 'draw-destination-tickets':
			return { ...row, kind: 'tickets', text: 'drew', count: event.count, ticketOffer: true };
		case 'keep-tickets':
			return {
				...row,
				kind: 'tickets',
				text: 'kept',
				count: event.count,
				tickets: event.playerId === viewerId ? event.ticketIds?.flatMap(id => getTicket(id) ?? []) : undefined,
			};
		case 'game-started':
		case 'final-round':
		case 'game-over':
		case 'note':
			return row;
	}
}

export function journalRows(state: GameState, viewerId: string): JournalRow[] {
	const grouped: JournalRow[] = [];
	for (const [id, event] of state.events.entries()) {
		const row = eventRow(event, id, state, viewerId);
		const previous = grouped.at(-1);
		const sameTurn = row.player && previous?.player?.id === row.player.id && row.turnNumber === previous.turnNumber;
		if (sameTurn && previous.kind === 'draws' && row.kind === 'draws' && previous.cards?.length === 1) {
			previous.cards.push(...(row.cards ?? []));
		} else if (
			sameTurn &&
			previous.kind === 'tickets' &&
			previous.ticketOffer &&
			row.kind === 'tickets' &&
			!row.ticketOffer
		) {
			grouped[grouped.length - 1] = { ...row, id: previous.id };
		} else {
			grouped.push(row);
		}
	}
	for (const [index, result] of (state.finalResults ?? []).entries()) {
		grouped.push({
			id: state.events.length + index,
			kind: 'score',
			player: state.players.find(player => player.id === result.playerId),
			text: 'Final score',
			points: result.finalScore,
		});
	}
	return grouped.reverse();
}
