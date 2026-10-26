import { describe, expect, test } from 'bun:test';
import {
	applyGameAction,
	chooseBotAction,
	createGame,
	shortestTicketConnection,
	type GameAction,
	type GameState,
	type TrainHand,
} from '../game';
import { terrainCards } from './terrain-cards';

const EMPTY_HAND: TrainHand = {
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

function africaTurn(botCount = 1): GameState {
	const state = createGame({ mapId: 'the-heart-of-africa', seed: 'terrain', humanName: 'Player', botCount });
	state.openingTicketOffers = {};
	state.phase = { type: 'turn', drawsTaken: 0 };
	state.currentPlayerIndex = 0;
	for (const player of state.players) {
		player.score = 0;
		player.tickets = [];
		player.hand = { ...EMPTY_HAND };
	}
	const terrain = state.mechanics['terrain-cards']!;
	for (const player of state.players) terrain.held[player.id] = { desert: 0, jungle: 0, mountain: 0 };
	return state;
}

function apply(state: GameState, action: GameAction): GameState {
	const result = applyGameAction(state, action);
	if (!result.ok) throw new Error(result.error);
	return result.state;
}

function error(state: GameState, action: GameAction): string | undefined {
	const result = applyGameAction(state, action);
	return result.ok ? undefined : result.error;
}

describe('Heart of Africa terrain cards', () => {
	test('setup deals one terrain card to each player and lays two face up', () => {
		const state = createGame({ mapId: 'the-heart-of-africa', seed: 'setup', botCount: 3 });
		const terrain = state.mechanics['terrain-cards']!;
		const held = Object.values(terrain.held).map(hand => hand.desert + hand.jungle + hand.mountain);
		expect(held).toEqual([1, 1, 1, 1]);
		expect(terrain.faceUp).toHaveLength(2);
		expect(terrain.deck).toHaveLength(45 - 4 - 2);
	});

	test('a draw turn can mix a face-up terrain card with a train card', () => {
		const state = africaTurn();
		const terrain = state.mechanics['terrain-cards']!;
		terrain.faceUp = ['jungle', 'desert'];
		terrain.deck.push('mountain');
		state.trainDeck.push('green');

		const afterTerrain = apply(state, { type: 'draw-terrain-card', index: 0 });
		expect(afterTerrain.phase).toEqual({ type: 'turn', drawsTaken: 1 });
		expect(afterTerrain.mechanics['terrain-cards']!.held.player).toEqual({ desert: 0, jungle: 1, mountain: 0 });
		expect(afterTerrain.mechanics['terrain-cards']!.faceUp).toEqual(['desert', 'mountain']);

		const afterTrain = apply(afterTerrain, { type: 'draw-train-deck' });
		expect(afterTrain.players[0]!.hand.green).toBe(1);
		expect(afterTrain.currentPlayerIndex).toBe(1);
	});

	test('two terrain cards, one blind, make a full draw turn', () => {
		const state = africaTurn();
		state.mechanics['terrain-cards']!.deck.push('mountain', 'desert');
		const afterFirst = apply(state, { type: 'draw-train-deck' });
		const afterSecond = apply(afterFirst, { type: 'draw-terrain-card' });
		expect(afterSecond.mechanics['terrain-cards']!.held.player).toEqual({ desert: 1, jungle: 0, mountain: 0 });
		expect(afterSecond.currentPlayerIndex).toBe(1);
	});

	test('a matching terrain card doubles the route and is discarded', () => {
		const state = africaTurn();
		state.players[0]!.hand.white = 4;
		state.mechanics['terrain-cards']!.held.player!.mountain = 2;
		const next = apply(state, {
			type: 'claim-route',
			routeId: 'beira-durban-1',
			paymentColor: 'white',
			options: { terrain: { locomotives: 0 } },
		});
		expect(next.players[0]!.score).toBe(14);
		expect(next.mechanics['terrain-cards']!.held.player!.mountain).toBe(0);
		expect(next.mechanics['terrain-cards']!.discard).toEqual(['mountain', 'mountain']);
		expect(next.events.at(-1)).toMatchObject({ type: 'double-route', cards: 2, locomotives: 0, terrain: 'mountain' });
	});

	test('gray routes are mountain routes', () => {
		const state = africaTurn();
		state.players[0]!.hand.red = 3;
		state.mechanics['terrain-cards']!.held.player = { desert: 3, jungle: 0, mountain: 1 };
		const claim: GameAction = {
			type: 'claim-route',
			routeId: 'mocambique-beira-1',
			paymentColor: 'red',
			options: { terrain: { locomotives: 0 } },
		};
		expect(apply(state, claim).players[0]!.score).toBe(8);
		state.mechanics['terrain-cards']!.held.player!.mountain = 0;
		expect(error(state, claim)).toBe('Doubling this route takes 1 Mountain & Cliff card.');
	});

	test('a rival holding more of the terrain blocks the doubling', () => {
		const state = africaTurn();
		state.players[0]!.hand.black = 3;
		state.mechanics['terrain-cards']!.held.player!.mountain = 1;
		state.mechanics['terrain-cards']!.held['bot-1']!.mountain = 2;
		expect(
			error(state, {
				type: 'claim-route',
				routeId: 'cape-town-port-elizabeth-1',
				paymentColor: 'black',
				options: { terrain: { locomotives: 0 } },
			}),
		).toBe('You need at least as many Mountain & Cliff cards as every other player.');
	});

	test('a locomotive played as wild terrain ties the rival, as in the rulebook example', () => {
		const state = africaTurn();
		state.players[0]!.hand.black = 3;
		state.players[0]!.hand.locomotive = 1;
		state.mechanics['terrain-cards']!.held.player!.mountain = 1;
		state.mechanics['terrain-cards']!.held['bot-1']!.mountain = 2;
		const next = apply(state, {
			type: 'claim-route',
			routeId: 'cape-town-port-elizabeth-1',
			paymentColor: 'black',
			options: { terrain: { locomotives: 1 } },
		});
		expect(next.players[0]!.score).toBe(8);
		expect(next.players[0]!.hand.locomotive).toBe(0);
		expect(next.players[0]!.trains).toBe(42);
		expect(next.trainDiscard.filter(card => card === 'locomotive')).toHaveLength(1);
		expect(next.mechanics['terrain-cards']!.held.player!.mountain).toBe(1);
	});

	test('locomotives paying for the train cards cannot also be wild terrain', () => {
		const state = africaTurn();
		state.players[0]!.hand.black = 2;
		state.players[0]!.hand.locomotive = 1;
		expect(
			error(state, {
				type: 'claim-route',
				routeId: 'cape-town-port-elizabeth-1',
				paymentColor: 'black',
				options: { terrain: { locomotives: 1 } },
			}),
		).toBe('Not enough locomotives left to play as wild terrain.');
	});

	test('separate country positions: Madagascar counts at either spot, routes into Nigeria do not join', () => {
		const state = africaTurn();
		state.claimedRoutes = { 'madagascar-1-durban-1': 'player', 'pretoria-durban-1': 'player' };
		expect(shortestTicketConnection(state, 'player', { cityA: 'madagascar', cityB: 'pretoria' })).toHaveLength(2);

		state.claimedRoutes = { 'ngaoundere-nigeria-1-1': 'player', 'douala-nigeria-0-1': 'player' };
		expect(shortestTicketConnection(state, 'player', { cityA: 'douala', cityB: 'ngaoundere' })).toEqual([]);
		expect(shortestTicketConnection(state, 'player', { cityA: 'nigeria', cityB: 'ngaoundere' })).toHaveLength(1);
	});

	test('most completed tickets earns the Globetrotter, shared on a tie, and there is no longest path bonus', () => {
		const state = africaTurn(2);
		state.claimedRoutes = {
			'salisbury-bulawayo-1': 'player',
			'bulawayo-pretoria-1': 'player',
			'salisbury-beira-1': 'bot-1',
			'mocambique-beira-1': 'bot-1',
		};
		state.players[0]!.tickets = ['salisbury-pretoria'];
		state.players[1]!.tickets = ['mocambique-salisbury'];
		state.players[2]!.tickets = ['pretoria-cape-town'];
		state.finalRound = { triggeredBy: 'bot-1', turnsRemaining: 1 };
		state.trainDeck.push('red');
		let ended = apply(state, { type: 'draw-train-deck' });
		ended = apply(ended, { type: 'draw-train-deck' });
		const results = Object.fromEntries(ended.finalResults!.map(result => [result.playerId, result]));
		expect(results.player!.bonuses).toEqual([{ id: 'globetrotter', label: 'Globetrotter', points: 10 }]);
		expect(results['bot-1']!.bonuses).toEqual([{ id: 'globetrotter', label: 'Globetrotter', points: 10 }]);
		expect(results['bot-2']!.bonuses).toEqual([]);
		expect(results.player!.longestRouteBonus).toBe(0);
	});

	test('a bot doubles the routes where it holds the terrain majority', () => {
		const state = africaTurn();
		state.currentPlayerIndex = 1;
		const bot = state.players[1]!;
		bot.tickets = ['pretoria-cape-town'];
		bot.hand.orange = 3;
		state.claimedRoutes = { 'pretoria-bloemfontein-1': 'bot-1' };
		state.mechanics['terrain-cards']!.held['bot-1']!.desert = 1;
		expect(chooseBotAction(state)).toEqual({
			type: 'claim-route',
			routeId: 'bloemfontein-cape-town-1',
			paymentColor: 'orange',
			options: { terrain: { locomotives: 0 } },
		});
	});

	test('a bot takes a face-up terrain card its next routes need on its second draw', () => {
		const state = africaTurn();
		state.currentPlayerIndex = 1;
		state.phase = { type: 'turn', drawsTaken: 1 };
		state.players[1]!.tickets = ['pretoria-cape-town'];
		state.claimedRoutes = { 'pretoria-bloemfontein-1': 'bot-1' };
		state.mechanics['terrain-cards']!.faceUp = ['jungle', 'desert'];
		expect(chooseBotAction(state)).toEqual({ type: 'draw-terrain-card', index: 1 });
	});

	test('the terrain deck order is hidden from viewers', () => {
		const state = africaTurn();
		terrainCards.redact!(state, 'player');
		expect(new Set(state.mechanics['terrain-cards']!.deck)).toEqual(new Set(['desert']));
	});
});
