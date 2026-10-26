import { describe, expect, test } from 'bun:test';
import { applyGameAction, chooseBotAction, createGame, isTicketComplete, type GameState } from '../game';

function japanTurn(players = 2): GameState {
	const state = createGame({ mapId: 'japan', seed: 'bullet-trains', humanName: 'Player', botCount: players - 1 });
	state.openingTicketOffers = {};
	state.phase = { type: 'turn', drawsTaken: 0 };
	state.currentPlayerIndex = 0;
	for (const player of state.players) {
		player.tickets = [];
		player.hand = { ...player.hand, red: 0, blue: 0, locomotive: 0 };
	}
	return state;
}

function play(state: GameState, action: Parameters<typeof applyGameAction>[1]): GameState {
	const result = applyGameAction(state, action);
	if (!result.ok) throw new Error(result.error);
	return result.state;
}

function finalBonuses(progress: number[]) {
	const state = japanTurn(progress.length);
	state.mechanics['bullet-trains']!.progress = Object.fromEntries(
		state.players.map((player, index) => [player.id, progress[index]!]),
	);
	state.finalRound = { triggeredBy: 'bot-1', turnsRemaining: 1 };
	const next = play(state, { type: 'draw-train-deck' });
	const finished = next.phase.type === 'game-over' ? next : play(next, { type: 'draw-train-deck' });
	return state.players.map(player => finished.finalResults!.find(result => result.playerId === player.id)!.bonuses);
}

describe('Japan bullet trains', () => {
	test('a bullet claim pays cards, places no trains, scores nothing and advances the bullet track', () => {
		const state = japanTurn();
		state.players[0]!.hand.red = 3;
		state.players[0]!.hand.locomotive = 1;
		const next = play(state, { type: 'claim-route', routeId: 'aomori-morioka-1', paymentColor: 'red' });
		const player = next.players[0]!;
		expect([player.trains, player.score, player.hand.red, player.hand.locomotive]).toEqual([20, 0, 0, 0]);
		expect(next.mechanics['bullet-trains']).toEqual({
			supply: 15,
			progress: { player: 4, 'bot-1': 0 },
			routes: ['aomori-morioka-1'],
		});
		expect(next.events.at(-1)).toMatchObject({ type: 'bullet-train', playerId: 'player', spaces: 4, supply: 15 });
	});

	test('a player without trains can still claim a bullet route', () => {
		const state = japanTurn();
		state.players[0]!.trains = 0;
		state.players[0]!.hand.blue = 2;
		const next = play(state, { type: 'claim-route', routeId: 'takasaki-tokyo-1', paymentColor: 'blue' });
		expect(next.claimedRoutes['takasaki-tokyo-1']).toBe('player');
		expect(next.players[0]!.trains).toBe(0);
	});

	test('every player may use a claimed bullet route for tickets', () => {
		const state = japanTurn();
		state.players[0]!.hand.red = 1;
		state.claimedRoutes['tokyo-narita-1'] = 'bot-1';
		const next = play(state, { type: 'claim-route', routeId: 'tokyo-odawara-1', paymentColor: 'red' });
		expect(isTicketComplete(next, 'bot-1', 'odawara-narita')).toBe(true);
		expect(isTicketComplete(next, 'player', 'odawara-narita')).toBe(false);
	});

	test('once the supply is gone, bullet routes are ordinary gray routes', () => {
		const state = japanTurn();
		state.mechanics['bullet-trains']!.supply = 0;
		state.players[0]!.hand.red = 4;
		const next = play(state, { type: 'claim-route', routeId: 'aomori-morioka-1', paymentColor: 'red' });
		expect([next.players[0]!.trains, next.players[0]!.score]).toEqual([16, 7]);
		expect(next.mechanics['bullet-trains']).toEqual({ supply: 0, progress: { player: 0, 'bot-1': 0 }, routes: [] });
		expect(isTicketComplete(next, 'bot-1', 'takasaki-morioka')).toBe(false);
	});

	test('the last round waits until both the trains and the bullet supply are down to two', () => {
		const lowTrains = japanTurn();
		lowTrains.players[0]!.trains = 2;
		const drawn = play(play(lowTrains, { type: 'draw-train-deck' }), { type: 'draw-train-deck' });
		expect(drawn.finalRound).toBeNull();

		const lowSupply = japanTurn();
		lowSupply.players[1]!.trains = 1;
		lowSupply.mechanics['bullet-trains']!.supply = 3;
		lowSupply.players[0]!.hand.blue = 2;
		const claimed = play(lowSupply, { type: 'claim-route', routeId: 'takasaki-tokyo-1', paymentColor: 'blue' });
		expect(claimed.finalRound).toEqual({ triggeredBy: 'player', turnsRemaining: 2 });
	});

	test('the bullet track pays by rank; ties share a place and players with no bullet train lose 20', () => {
		expect(finalBonuses([9, 4, 4, 2, 0])).toEqual([
			[{ id: 'bullet-trains', label: 'Bullet track #1', points: 25 }],
			[{ id: 'bullet-trains', label: 'Bullet track #2', points: 15 }],
			[{ id: 'bullet-trains', label: 'Bullet track #2', points: 15 }],
			[{ id: 'bullet-trains', label: 'Bullet track #4', points: -5 }],
			[{ id: 'bullet-trains', label: 'No bullet train', points: -20 }],
		]);
		expect(finalBonuses([3, 5])).toEqual([
			[{ id: 'bullet-trains', label: 'Bullet track #2', points: -10 }],
			[{ id: 'bullet-trains', label: 'Bullet track #1', points: 10 }],
		]);
	});

	test('a bot that has placed no bullet train claims one when it can', () => {
		const state = japanTurn();
		state.players[0]!.isBot = true;
		state.players[0]!.hand.blue = 2;
		expect(chooseBotAction(state)).toEqual({ type: 'claim-route', routeId: 'akita-morioka-1', paymentColor: 'blue' });
	});
});
