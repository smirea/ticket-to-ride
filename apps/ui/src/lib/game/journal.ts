import {
	ROUTE_SCORES,
	TRAIN_CARDS,
	USA_CITIES,
	USA_ROUTES,
	USA_TICKETS,
	type DestinationTicket,
	type GameAction,
	type GameState,
	type Player,
	type TrainCard,
	type TrainColor,
} from '@repo/shared';

export type JournalRow = {
	id: number;
	player?: Player;
	text: string;
	kind: 'draws' | 'claim' | 'tickets' | 'note' | 'score';
	cards?: (TrainCard | 'deck')[];
	count?: number;
	routeId?: string;
	tickets?: DestinationTicket[];
	points?: number;
	ticketOffer?: boolean;
	payment?: { color: TrainColor; cars?: number; locomotives?: number };
};

type Parsed = { row: JournalRow; actionType?: GameAction['type'] };
const cityNames = new Map(USA_CITIES.map(city => [city.id, city.name]));

function parseLog(text: string, id: number, state: GameState): Parsed {
	const patterns: [RegExp, GameAction['type']][] = [
		[/^(.*) drew a face-up (\w+) card\.$/, 'draw-face-up'],
		[/^(.*) drew from the train deck\.$/, 'draw-train-deck'],
		[/^(.*) claimed (.+)\.$/, 'claim-route'],
		[/^(.*) kept (\d+) destination tickets?\.$/, 'keep-tickets'],
		[/^(.*) drew (\d+) destination tickets\.$/, 'draw-destination-tickets'],
	];
	for (const [pattern, actionType] of patterns) {
		const match = text.match(pattern);
		if (!match) continue;
		const players = state.players.filter(player => player.name === match[1]);
		const player = players.length === 1 ? players[0] : undefined;
		const row: JournalRow = { id, player, text, kind: 'note' };
		if (actionType === 'draw-face-up' && TRAIN_CARDS.includes(match[2] as TrainCard)) {
			Object.assign(row, { kind: 'draws', text: 'drew', cards: [match[2]] });
		} else if (actionType === 'draw-train-deck') {
			Object.assign(row, { kind: 'draws', text: 'drew', cards: ['deck'] });
		} else if (actionType === 'claim-route') {
			Object.assign(row, { kind: 'claim', text: match[2] });
		} else if (actionType === 'keep-tickets' || actionType === 'draw-destination-tickets') {
			Object.assign(row, {
				kind: 'tickets',
				text: actionType === 'keep-tickets' ? 'kept' : 'drew',
				count: Number(match[2]),
				ticketOffer: actionType === 'draw-destination-tickets',
			});
		}
		// Ambiguous names stay literal rather than being attributed to the wrong player.
		if (!player) return { row: { id, kind: 'note', text }, actionType };
		return { row, actionType };
	}
	return { row: { id, kind: 'note', text } };
}

export function journalRows(state: GameState, viewerId: string): JournalRow[] {
	const parsed = state.log.map((text, index) => parseLog(text, index, state));
	const actions = parsed.filter(item => item.actionType);
	// Only use positional history when the whole public action sequence agrees.
	const aligned =
		actions.length === state.history.length &&
		actions.every((item, index) => item.actionType === state.history[index]?.type);
	if (aligned) {
		actions.forEach((item, index) => {
			const action = state.history[index]!;
			if (action.type === 'claim-route' && item.row.player) {
				const route = USA_ROUTES.find(route => route.id === action.routeId);
				if (
					route &&
					item.row.text === `${cityNames.get(route.cityA)}–${cityNames.get(route.cityB)}` &&
					state.claimedRoutes[route.id] === item.row.player.id
				) {
					item.row.routeId = route.id;
					item.row.text = `${cityNames.get(route.cityA)}–${cityNames.get(route.cityB)}`;
					item.row.points = ROUTE_SCORES[route.length] ?? route.length;
					const wilds = action.locomotives;
					item.row.payment = { color: action.paymentColor };
					if (wilds !== undefined && Number.isInteger(wilds) && wilds >= 0 && wilds <= route.length) {
						item.row.payment.cars = route.length - wilds;
						item.row.payment.locomotives = wilds;
					}
				}
			}
			if (
				action.type === 'keep-tickets' &&
				item.row.player?.id === viewerId &&
				action.ticketIds.length === item.row.count &&
				new Set(action.ticketIds).size === action.ticketIds.length &&
				action.ticketIds.every(
					id => item.row.player!.tickets.includes(id) && USA_TICKETS.some(ticket => ticket.id === id),
				)
			) {
				item.row.tickets = USA_TICKETS.filter(
					ticket => action.ticketIds.includes(ticket.id) && item.row.player!.tickets.includes(ticket.id),
				);
			}
		});
	}
	const grouped: JournalRow[] = [];
	for (const { row } of parsed) {
		const previous = grouped.at(-1);
		const samePlayer = row.player && previous?.player?.id === row.player.id;
		if (
			samePlayer &&
			previous.kind === 'draws' &&
			row.kind === 'draws' &&
			previous.cards?.length === 1 &&
			!previous.cards.includes('locomotive') &&
			!row.cards?.includes('locomotive')
		) {
			previous.cards.push(...(row.cards ?? []));
		} else if (
			samePlayer &&
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
	for (const result of state.finalResults ?? []) {
		grouped.push({
			id: state.log.length + grouped.length,
			kind: 'score',
			player: state.players.find(player => player.id === result.playerId),
			text: 'Final score',
			points: result.finalScore,
		});
	}
	return grouped.reverse();
}
