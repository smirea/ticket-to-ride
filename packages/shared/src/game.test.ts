import { describe, expect, test } from 'bun:test';
import {
	DEBUG_ROUTE_ID,
	TRAIN_CARDS,
	USA_CITIES,
	USA_ROUTES,
	USA_TICKETS,
	applyGameAction,
	canClaimRoute,
	createDebugClaimScenario,
	createGame,
	playBotTurns,
	type GameState,
} from './game';

function finishTicketSelection(state: GameState): GameState {
	if (state.phase.type !== 'ticket-selection') throw new Error('Expected ticket selection.');
	const result = applyGameAction(state, {
		type: 'keep-tickets',
		ticketIds: state.phase.ticketIds.slice(0, state.phase.minimum),
	});
	if (!result.ok) throw new Error(result.error);
	return result.state;
}

describe('classic USA setup', () => {
	test('contains the complete board and creates reproducible serializable games', () => {
		expect(USA_CITIES).toHaveLength(36);
		expect(USA_ROUTES).toHaveLength(100);
		expect(new Set(USA_ROUTES.map(route => route.id)).size).toBe(100);
		expect(USA_TICKETS).toHaveLength(30);

		const first = createGame({ seed: 'same-game', botCount: 3 });
		const second = createGame({ seed: 'same-game', botCount: 3 });
		expect(first).toEqual(second);
		expect(JSON.parse(JSON.stringify(first))).toEqual(first);
		expect(first.players.every(player => Object.values(player.hand).reduce((a, b) => a + b) === 4)).toBe(true);
		expect(first.faceUpTrainCards).toHaveLength(5);
		expect(first.phase.type).toBe('ticket-selection');
	});

	test('keeps at least two of the opening tickets without mutating invalid state', () => {
		const state = createGame({ seed: 'tickets', botCount: 1 });
		if (state.phase.type !== 'ticket-selection') throw new Error('Expected ticket selection.');
		const invalid = applyGameAction(state, {
			type: 'keep-tickets',
			ticketIds: state.phase.ticketIds.slice(0, 1),
		});
		expect(invalid.ok).toBe(false);
		expect(invalid.state).toBe(state);
		expect(state.players[0]!.tickets).toHaveLength(0);

		const keptIds = state.phase.ticketIds.slice(0, 2);
		const valid = applyGameAction(state, { type: 'keep-tickets', ticketIds: keptIds });
		expect(valid.ok).toBe(true);
		if (!valid.ok) return;
		expect(valid.state.players[0]!.tickets).toEqual(keptIds);
		expect(valid.state.phase).toEqual({ type: 'turn', drawsTaken: 0 });
	});
});

describe('turn rules', () => {
	test('drawing two train cards advances to the next player', () => {
		const state = finishTicketSelection(createGame({ seed: 'draw', botCount: 1 }));
		const beforeCards = Object.values(state.players[0]!.hand).reduce((a, b) => a + b);
		const firstDraw = applyGameAction(state, { type: 'draw-train-deck' });
		expect(firstDraw.ok).toBe(true);
		if (!firstDraw.ok) return;
		expect(firstDraw.state.currentPlayerIndex).toBe(0);
		expect(firstDraw.state.phase).toEqual({ type: 'turn', drawsTaken: 1 });

		const secondDraw = applyGameAction(firstDraw.state, { type: 'draw-train-deck' });
		expect(secondDraw.ok).toBe(true);
		if (!secondDraw.ok) return;
		expect(secondDraw.state.currentPlayerIndex).toBe(1);
		expect(Object.values(secondDraw.state.players[0]!.hand).reduce((a, b) => a + b)).toBe(beforeCards + 2);
	});

	test('a face-up locomotive ends the turn immediately', () => {
		const state = finishTicketSelection(createGame({ seed: 'locomotive', botCount: 1 }));
		state.faceUpTrainCards[2] = 'locomotive';
		const result = applyGameAction(state, { type: 'draw-face-up', index: 2 });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.state.players[0]!.hand.locomotive).toBe(state.players[0]!.hand.locomotive + 1);
		expect(result.state.currentPlayerIndex).toBe(1);
	});

	test('claims a colored route, pays cards, scores, and hands off the turn', () => {
		const state = createDebugClaimScenario();
		const result = applyGameAction(state, {
			type: 'claim-route',
			routeId: DEBUG_ROUTE_ID,
			paymentColor: 'purple',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.state.claimedRoutes[DEBUG_ROUTE_ID]).toBe('player');
		expect(result.state.players[0]!.hand.purple).toBe(0);
		expect(result.state.players[0]!.score).toBe(4);
		expect(result.state.players[0]!.trains).toBe(42);
		expect(result.state.currentPlayerIndex).toBe(1);
		expect(state.claimedRoutes[DEBUG_ROUTE_ID]).toBeUndefined();
	});

	test('validates route color and blocks the other half of a double route for two players', () => {
		const state = createDebugClaimScenario();
		expect(canClaimRoute(state, 'player', DEBUG_ROUTE_ID, 'yellow').ok).toBe(false);
		const claimed = applyGameAction(state, {
			type: 'claim-route',
			routeId: DEBUG_ROUTE_ID,
			paymentColor: 'purple',
		});
		if (!claimed.ok) throw new Error(claimed.error);
		claimed.state.players[1]!.hand.yellow = 3;
		expect(
			canClaimRoute(claimed.state, claimed.state.players[1]!.id, 'san-francisco-los-angeles-yellow-a', 'yellow').ok,
		).toBe(false);
	});

	test('runs deterministic bot actions until control returns to the human', () => {
		const state = createDebugClaimScenario();
		const claimed = applyGameAction(state, {
			type: 'claim-route',
			routeId: DEBUG_ROUTE_ID,
			paymentColor: 'purple',
		});
		if (!claimed.ok) throw new Error(claimed.error);
		const afterBots = playBotTurns(claimed.state);
		expect(afterBots.currentPlayerIndex).toBe(0);
		expect(afterBots.phase).toEqual({ type: 'turn', drawsTaken: 0 });
		expect(afterBots.turnNumber).toBeGreaterThan(claimed.state.turnNumber);
		expect(TRAIN_CARDS.every(card => afterBots.players[1]!.hand[card] >= 0)).toBe(true);
	});
});
