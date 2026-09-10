import { expect, test } from 'bun:test';
import {
	applyGameAction,
	createDebugClaimScenario,
	createGame,
	formatGameEvent,
	restoreGameState,
	USA_TICKETS,
} from '@repo/shared';
import { journalRows } from './journal';

test('groups by player ID and turn, even when names collide and adjacent turns belong to the same player', () => {
	const state = createGame();
	state.players[0]!.name = state.players[1]!.name = 'Same name';
	state.events = [
		{ type: 'draw-face-up', playerId: 'player', turnNumber: 1, card: 'red' },
		{ type: 'draw-train-deck', playerId: 'player', turnNumber: 1 },
		{ type: 'draw-face-up', playerId: 'bot-1', turnNumber: 2, card: 'locomotive' },
		{ type: 'draw-train-deck', playerId: 'player', turnNumber: 3 },
		{ type: 'draw-train-deck', playerId: 'player', turnNumber: 4 },
	];
	const rows = journalRows(state, 'player');
	expect(rows.map(row => row.cards)).toEqual([['deck'], ['deck'], ['locomotive'], ['red', 'deck']]);
	expect(rows[2]!.player?.id).toBe('bot-1');
	expect(formatGameEvent(state.events[0]!, state.players)).toBe('Same name drew a face-up red card.');
});

test('ticket events retain owned identities and group only within their turn', () => {
	const state = createGame();
	const ticket = USA_TICKETS[0]!;
	state.events = [
		{ type: 'draw-destination-tickets', playerId: 'player', turnNumber: 3, count: 3 },
		{ type: 'keep-tickets', playerId: 'player', turnNumber: 3, count: 1, ticketIds: [ticket.id] },
	];
	expect(journalRows(state, 'player')).toHaveLength(1);
	expect(journalRows(state, 'player')[0]!.tickets).toEqual([ticket]);
	expect(journalRows(state, 'bot-1')[0]!.tickets).toBeUndefined();
	state.events[1] = { type: 'keep-tickets', playerId: 'player', turnNumber: 3, count: 1 };
	expect(journalRows(state, 'player')[0]!.tickets).toBeUndefined();
});

test('records resolved payment details before cards leave the hand', () => {
	const state = createDebugClaimScenario();
	state.players[0]!.hand.purple = 2;
	state.players[0]!.hand.locomotive = 1;
	const result = applyGameAction(state, {
		type: 'claim-route',
		routeId: 'san-francisco-los-angeles-purple-b',
		paymentColor: 'purple',
	});
	if (!result.ok) throw new Error(result.error);
	const row = journalRows(result.state, 'player')[0]!;
	expect(row.payment).toEqual({ color: 'purple', cars: 2, locomotives: 1 });
	expect(row.points).toBe(4);
	expect(row.text).toBe('San Francisco–Los Angeles');
});

test('legacy logs remain literal notes without inferring actions or identities', () => {
	const old = { ...createGame(), version: 2, events: undefined, log: ['You kept 2 destination tickets.'] };
	const state = restoreGameState(old);
	expect(state.events).toEqual([{ type: 'note', text: 'You kept 2 destination tickets.' }]);
	expect(journalRows(state, 'player')[0]!.player).toBeUndefined();
	expect('log' in state).toBe(false);
});
