import { describe, expect, test } from 'bun:test';
import {
	applyGameAction,
	chooseBotAction,
	cloneState,
	createGame,
	parseGameAction,
	type GameAction,
	type GameState,
	type TrainCard,
	type TrainHand,
} from '../game';

function europeTurn(): GameState {
	let state = createGame({ mapId: 'europe', seed: 'tunnels', botCount: 1 });
	for (const player of state.players) {
		const result = applyGameAction(state, {
			type: 'keep-opening-tickets',
			playerId: player.id,
			ticketIds: state.openingTicketOffers[player.id]!.slice(0, 2),
		});
		if (!result.ok) throw new Error(result.error);
		state = result.state;
	}
	return cloneState(state);
}

// Cards are drawn from the end of the deck, so `reveal` lists the next cards in draw order.
function withTable(hand: Partial<TrainHand>, reveal: TrainCard[]): GameState {
	const state = europeTurn();
	const player = state.players[0]!;
	player.hand = {
		red: 0,
		orange: 0,
		yellow: 0,
		green: 0,
		blue: 0,
		purple: 0,
		black: 0,
		white: 0,
		locomotive: 0,
		...hand,
	};
	state.trainDeck = [...state.trainDeck.filter((_, index) => index > 10), ...[...reveal].reverse()];
	state.trainDiscard = [];
	return state;
}

function apply(state: GameState, action: GameAction): GameState {
	const result = applyGameAction(state, action);
	if (!result.ok) throw new Error(result.error);
	return result.state;
}

describe('tunnels', () => {
	test('a tunnel with no matching reveal is claimed at once and the revealed cards are discarded', () => {
		const state = withTable({ green: 2 }, ['red', 'blue', 'white']);
		const next = apply(state, { type: 'claim-route', routeId: 'zurich-venezia-1', paymentColor: 'green' });
		expect(next.claimedRoutes['zurich-venezia-1']).toBe('player');
		expect(next.players[0]!.hand.green).toBe(0);
		expect(next.players[0]!.score).toBe(2);
		expect([...next.trainDiscard].sort()).toEqual(['blue', 'green', 'green', 'red', 'white']);
		expect(next.currentPlayerIndex).toBe(1);
	});

	test('matching colors and locomotives raise the price, payable with locomotives', () => {
		const state = withTable({ green: 3, locomotive: 2 }, ['green', 'locomotive', 'yellow']);
		const deferred = apply(state, { type: 'claim-route', routeId: 'zurich-venezia-1', paymentColor: 'green' });
		expect(deferred.phase).toMatchObject({ type: 'tunnel', extra: 2, revealed: ['green', 'locomotive', 'yellow'] });
		expect(deferred.claimedRoutes['zurich-venezia-1']).toBeUndefined();
		expect(deferred.currentPlayerIndex).toBe(0);
		expect(applyGameAction(deferred, { type: 'draw-train-deck' })).toMatchObject({
			ok: false,
			error: 'Finish the current move first.',
		});

		const paid = apply(deferred, { type: 'pay-tunnel', locomotives: 1 });
		expect(paid.claimedRoutes['zurich-venezia-1']).toBe('player');
		expect(paid.players[0]!.hand).toMatchObject({ green: 0, locomotive: 1 });
		expect(paid.trainDiscard.filter(card => card === 'green')).toHaveLength(4);
		expect(paid.phase).toEqual({ type: 'turn', drawsTaken: 0 });
		expect(paid.currentPlayerIndex).toBe(1);
	});

	test('a player who cannot pay may only give up, taking the cards back', () => {
		const state = withTable({ green: 2 }, ['green', 'green', 'red']);
		const deferred = apply(state, { type: 'claim-route', routeId: 'zurich-venezia-1', paymentColor: 'green' });
		expect(applyGameAction(deferred, { type: 'pay-tunnel', locomotives: 0 })).toMatchObject({
			ok: false,
			error: 'Not enough matching cards for the tunnel.',
		});
		expect(chooseBotAction({ ...deferred, players: deferred.players.map(p => ({ ...p, isBot: true })) })).toEqual({
			type: 'abandon-tunnel',
		});
		const abandoned = apply(deferred, { type: 'abandon-tunnel' });
		expect(abandoned.claimedRoutes['zurich-venezia-1']).toBeUndefined();
		expect(abandoned.players[0]!.hand.green).toBe(2);
		expect([...abandoned.trainDiscard].sort()).toEqual(['green', 'green', 'red']);
		expect(abandoned.currentPlayerIndex).toBe(1);
		expect(abandoned.events.at(-1)).toMatchObject({ type: 'abandon-tunnel', routeId: 'zurich-venezia-1' });
	});

	test('a tunnel paid with locomotives only is matched by locomotives only', () => {
		const state = withTable({ locomotive: 3 }, ['green', 'green', 'locomotive']);
		const deferred = apply(state, {
			type: 'claim-route',
			routeId: 'zurich-venezia-1',
			paymentColor: 'green',
			locomotives: 2,
		});
		expect(deferred.phase).toMatchObject({ type: 'tunnel', extra: 1 });
		expect(applyGameAction(deferred, { type: 'pay-tunnel', locomotives: 0 })).toMatchObject({ ok: false });
		const paid = apply(deferred, { type: 'pay-tunnel', locomotives: 1 });
		expect(paid.players[0]!.hand.locomotive).toBe(0);
	});

	test('bots pay with spare colors before locomotives and the server accepts the payment', () => {
		const state = withTable({ green: 3, locomotive: 1 }, ['green', 'locomotive', 'red']);
		const deferred = apply(state, { type: 'claim-route', routeId: 'zurich-venezia-1', paymentColor: 'green' });
		const bot = { ...deferred, players: deferred.players.map(p => ({ ...p, isBot: true })) };
		const action = chooseBotAction(bot)!;
		expect(action).toEqual({ type: 'pay-tunnel', locomotives: 1 });
		expect(parseGameAction('europe', { ...action, extra: 9 })).toEqual(action);
	});

	test('the 8-space tunnel scores 21', () => {
		const state = withTable({ black: 8 }, ['red', 'red', 'red']);
		const next = apply(state, { type: 'claim-route', routeId: 'stockholm-petrograd-1', paymentColor: 'black' });
		expect(next.players[0]!.score).toBe(21);
		expect(next.players[0]!.trains).toBe(37);
	});
});
