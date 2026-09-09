import { expect, test } from 'bun:test';
import { createGame, USA_ROUTES, USA_TICKETS } from '@repo/shared';
import { journalRows } from './journal';

function scenario() {
	const state = createGame();
	state.players[0]!.name = 'Ada';
	state.players[1]!.name = 'Bert';
	state.log = [];
	state.history = [];
	return state;
}

test('groups two-card turns newest first without crossing a rival or a locomotive turn', () => {
	const state = scenario();
	state.log = [
		'Ada drew a face-up red card.',
		'Ada drew from the train deck.',
		'Bert drew a face-up locomotive card.',
		'Ada drew from the train deck.',
		'Ada drew from the train deck.',
		'Ada drew a face-up locomotive card.',
		'Ada drew from the train deck.',
	];
	expect(journalRows(state, state.players[0]!.id).map(row => row.cards)).toEqual([
		['deck'],
		['locomotive'],
		['deck', 'deck'],
		['locomotive'],
		['red', 'deck'],
	]);
});

test('never combines more than two draws or combines through another action', () => {
	const state = scenario();
	state.log = [
		'Ada drew from the train deck.',
		'Ada drew from the train deck.',
		'Ada drew from the train deck.',
		'Ada triggered the final round.',
		'Ada drew from the train deck.',
	];
	expect(journalRows(state, state.players[0]!.id).map(row => row.cards?.length)).toEqual([1, undefined, 1, 2]);
});

test('groups ticket draw and keep, but exposes only explicit, owned viewer ticket IDs', () => {
	const state = scenario();
	const ticket = USA_TICKETS[0]!;
	state.players[1]!.tickets = [ticket.id];
	state.log = ['Bert drew 3 destination tickets.', 'Bert kept 1 destination ticket.'];
	state.history = [{ type: 'draw-destination-tickets' }, { type: 'keep-tickets', ticketIds: [ticket.id] }];
	expect(journalRows(state, state.players[0]!.id)[0]!.tickets).toBeUndefined();
	expect(journalRows(state, state.players[1]!.id)[0]!.tickets).toEqual([ticket]);
	state.history[1] = { type: 'keep-tickets', ticketIds: [] };
	expect(journalRows(state, state.players[1]!.id)[0]!.tickets).toBeUndefined();
	state.history[1] = { type: 'keep-tickets', ticketIds: [USA_TICKETS[1]!.id] };
	expect(journalRows(state, state.players[1]!.id)[0]!.tickets).toBeUndefined();
});

test('does not infer ticket identities from duplicate names, missing history or mismatched sequences', () => {
	const state = scenario();
	const ticket = USA_TICKETS[0]!;
	state.players[0]!.tickets = [ticket.id];
	state.log = ['Ada kept 1 destination ticket.'];
	expect(journalRows(state, state.players[0]!.id)[0]!.tickets).toBeUndefined();
	state.history = [{ type: 'draw-train-deck' }];
	expect(journalRows(state, state.players[0]!.id)[0]!.tickets).toBeUndefined();
	state.history = [{ type: 'keep-tickets', ticketIds: [ticket.id] }];
	state.players[1]!.name = 'Ada';
	expect(journalRows(state, state.players[0]!.id)[0]!.player).toBeUndefined();
	expect(journalRows(state, state.players[0]!.id)[0]!.tickets).toBeUndefined();
});

test('uses exact aligned claim payments and never reconstructs omitted wild counts from a hand', () => {
	const state = scenario();
	const route = USA_ROUTES.find(route => route.id === 'seattle-calgary-gray')!;
	state.log = ['Ada claimed Seattle–Calgary.'];
	state.claimedRoutes[route.id] = state.players[0]!.id;
	state.history = [{ type: 'claim-route', routeId: route.id, paymentColor: 'blue', locomotives: 1 }];
	let row = journalRows(state, state.players[0]!.id)[0]!;
	expect(row.routeId).toBe(route.id);
	expect(row.points).toBe(7);
	expect(row.payment).toEqual({ color: 'blue', cars: 3, locomotives: 1 });
	state.history = [{ type: 'claim-route', routeId: route.id, paymentColor: 'blue' }];
	expect(journalRows(state, state.players[0]!.id)[0]!.payment).toEqual({ color: 'blue' });
	state.log = ['Ada claimed Vancouver–Seattle.'];
	expect(journalRows(state, state.players[0]!.id)[0]!.routeId).toBeUndefined();
});
