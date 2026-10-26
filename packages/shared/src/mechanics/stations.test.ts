import { describe, expect, test } from 'bun:test';
import {
	applyGameAction,
	chooseBotAction,
	cloneState,
	createGame,
	isTicketComplete,
	parseGameAction,
	type GameAction,
	type GameState,
	type TrainHand,
} from '../game';

const EMPTY: TrainHand = {
	red: 0,
	orange: 0,
	yellow: 0,
	green: 0,
	blue: 0,
	purple: 0,
	black: 0,
	white: 0,
	locomotive: 0,
};

function europeTurn(hand: Partial<TrainHand> = {}): GameState {
	let state = createGame({ mapId: 'europe', seed: 'stations', botCount: 1 });
	for (const player of state.players) {
		const result = applyGameAction(state, {
			type: 'keep-opening-tickets',
			playerId: player.id,
			ticketIds: state.openingTicketOffers[player.id]!.slice(0, 2),
		});
		if (!result.ok) throw new Error(result.error);
		state = result.state;
	}
	const next = cloneState(state);
	next.players[0]!.hand = { ...EMPTY, ...hand };
	return next;
}

function apply(state: GameState, action: GameAction): GameState {
	const result = applyGameAction(state, action);
	if (!result.ok) throw new Error(result.error);
	return result.state;
}

// Hands the turn back to the first player without changing anything else.
function backToFirst(state: GameState): GameState {
	const next = cloneState(state);
	next.currentPlayerIndex = 0;
	return next;
}

describe('stations', () => {
	test('stations cost 1, 2 and 3 cards of one color, one per city and three per player', () => {
		let state = europeTurn({ red: 2, blue: 1, locomotive: 3 });
		state = apply(state, { type: 'build-station', cityId: 'paris', paymentColor: 'blue', locomotives: 0 });
		expect(state.mechanics.stations).toEqual({ cities: { paris: 'player' } });
		expect(state.players[0]!.hand).toMatchObject({ blue: 0, red: 2, locomotive: 3 });
		expect(state.currentPlayerIndex).toBe(1);

		state = backToFirst(state);
		expect(
			applyGameAction(state, { type: 'build-station', cityId: 'paris', paymentColor: 'red', locomotives: 0 }),
		).toMatchObject({ ok: false, error: 'That city already has a station.' });
		expect(
			applyGameAction(state, { type: 'build-station', cityId: 'wien', paymentColor: 'blue', locomotives: 1 }),
		).toMatchObject({ ok: false, error: 'A station costs 2 cards of one color.' });
		state = apply(state, { type: 'build-station', cityId: 'wien', paymentColor: 'red', locomotives: 0 });
		state = backToFirst(state);
		state = apply(state, { type: 'build-station', cityId: 'roma', paymentColor: 'green', locomotives: 3 });
		expect(state.players[0]!.hand).toEqual(EMPTY);
		expect(state.trainDiscard.slice(-6).sort()).toEqual([
			'blue',
			'locomotive',
			'locomotive',
			'locomotive',
			'red',
			'red',
		]);

		state = backToFirst(state);
		state.players[0]!.hand.red = 5;
		expect(
			applyGameAction(state, { type: 'build-station', cityId: 'riga', paymentColor: 'red', locomotives: 0 }),
		).toMatchObject({ ok: false, error: 'You have no stations left.' });
		expect(
			parseGameAction('europe', { type: 'build-station', cityId: 'riga', paymentColor: 'red', locomotives: 0 }),
		).toEqual({ type: 'build-station', cityId: 'riga', paymentColor: 'red', locomotives: 0 });
	});

	test('each station borrows the one opponent route worth the most ticket points, and unused stations score', () => {
		let state = europeTurn({ red: 3 });
		const [player, rival] = state.players;
		player!.tickets = ['paris-zagrab', 'barcelona-munchen'];
		rival!.tickets = [];
		for (const routeId of [
			'brest-paris-1',
			'paris-zurich-1',
			'venezia-zagrab-1',
			'barcelona-marseille-1',
			'zurich-marseille-1',
		]) {
			state.claimedRoutes[routeId] = player!.id;
		}
		state.claimedRoutes['zurich-venezia-1'] = rival!.id;
		state.claimedRoutes['munchen-zurich-1'] = rival!.id;

		state = apply(state, { type: 'build-station', cityId: 'zurich', paymentColor: 'red', locomotives: 0 });
		expect(isTicketComplete(state, 'player', 'barcelona-munchen')).toBe(true);
		expect(isTicketComplete(state, 'player', 'paris-zagrab')).toBe(false);

		state = backToFirst(state);
		state.finalRound = { triggeredBy: 'bot-1', turnsRemaining: 1 };
		state = apply(state, { type: 'build-station', cityId: 'venezia', paymentColor: 'red', locomotives: 0 });
		expect(state.phase.type).toBe('game-over');
		const result = state.finalResults!.find(item => item.playerId === 'player')!;
		expect(result.ticketPoints).toBe(15);
		expect(result.completedTickets).toBe(2);
		expect(result.bonuses).toEqual([{ id: 'unused-stations', label: 'Unused stations', points: 4 }]);
		expect(state.finalResults!.find(item => item.playerId === 'bot-1')!.bonuses).toEqual([
			{ id: 'unused-stations', label: 'Unused stations', points: 12 },
		]);
	});

	test('a bot cut off from its ticket builds a station on the blocking route', () => {
		const state = europeTurn({ black: 2 });
		state.players[0]!.isBot = true;
		state.players[0]!.tickets = ['athina-angora'];
		for (const routeId of ['constantinople-angora-1', 'angora-erzurum-1', 'angora-smyrna-1']) {
			state.claimedRoutes[routeId] = 'bot-1';
		}
		expect(chooseBotAction(state)).toEqual({
			type: 'build-station',
			cityId: 'angora',
			paymentColor: 'black',
			locomotives: 0,
		});
	});
});
