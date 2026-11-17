import { describe, expect, test } from 'bun:test';
import { applyGameAction, createGame, type GameState } from '../game';

function indiaTurn(playerOwned: string[], tickets: string[]): GameState {
	const state = createGame({ mapId: 'india', seed: 'mandalas', humanName: 'Player', botCount: 1 });
	state.openingTicketOffers = {};
	state.phase = { type: 'turn', drawsTaken: 0 };
	state.currentPlayerIndex = 0;
	state.claimedRoutes = Object.fromEntries(playerOwned.map(routeId => [routeId, 'player']));
	state.players[0]!.tickets = tickets;
	state.players[1]!.tickets = [];
	for (const player of state.players) player.score = 0;
	return state;
}

function finalBonuses(playerOwned: string[], tickets: string[]) {
	const state = indiaTurn(playerOwned, tickets);
	state.finalRound = { triggeredBy: 'bot-1', turnsRemaining: 1 };
	state.faceUpTrainCards[0] = 'locomotive';
	const result = applyGameAction(state, { type: 'draw-face-up', index: 0 });
	if (!result.ok) throw new Error(result.error);
	return result.state.finalResults!.find(item => item.playerId === 'player')!.bonuses.map(bonus => bonus.points);
}

describe('India mandalas', () => {
	test('a ticket joined by two paths that share no trains earns the first mandala', () => {
		const loop = ['lahore-bhatinda-1', 'bhatinda-delhi-1', 'lahore-ambala-1', 'ambala-delhi-1'];
		expect(finalBonuses(loop, ['lahore-delhi'])).toEqual([5]);
	});

	test('the two paths may cross at a city', () => {
		const figureEight = [
			'lahore-bhatinda-1',
			'bhatinda-delhi-1',
			'lahore-jacobabad-1',
			'jacobabad-rohri-1',
			'bhatinda-rohri-1',
			'bhatinda-ambala-1',
			'ambala-delhi-1',
		];
		expect(finalBonuses(figureEight, ['lahore-delhi'])).toEqual([5]);
	});

	test('paths that share a train do not count', () => {
		const sharedRoute = ['lahore-bhatinda-1', 'bhatinda-delhi-1', 'bhatinda-ambala-1', 'ambala-delhi-1'];
		expect(finalBonuses(sharedRoute, ['lahore-delhi'])).toEqual([]);
	});

	test('a mandala counts even when the shortest path would block the second one', () => {
		const network = [
			'jodhpur-jaipur-1',
			'jaipur-agra-1',
			'lucknow-agra-1',
			'bhatinda-jodhpur-1',
			'bhatinda-delhi-1',
			'delhi-agra-1',
			'jaipur-ratlam-1',
			'ratlam-bhopal-1',
			'bilaspur-bhopal-1',
			'katni-bilaspur-1',
			'lucknow-katni-1',
		];
		expect(finalBonuses(network, ['jodhpur-lucknow'])).toEqual([5]);
	});

	test('mandalas score 5, 5, 10, 10, 10 and nothing past the fifth qualifying ticket', () => {
		const ring = [
			'lahore-bhatinda-1',
			'bhatinda-delhi-1',
			'delhi-bareilly-1',
			'bareilly-lucknow-1',
			'lucknow-agra-1',
			'agra-bhopal-1',
			'ratlam-bhopal-1',
			'ratlam-ahmadabad-1',
			'jodhpur-ahmadabad-1',
			'jodhpur-karachi-1',
			'jacobabad-karachi-1',
			'lahore-jacobabad-1',
		];
		const tickets = [
			'lahore-delhi',
			'karachi-delhi',
			'jacobabad-ratlam',
			'jodhpur-lucknow',
			'bareilly-ahmadabad',
			'karachi-ahmadabad',
		];
		expect(finalBonuses(ring, tickets.slice(0, 3))).toEqual([20]);
		expect(finalBonuses(ring, tickets)).toEqual([40]);
	});
});
