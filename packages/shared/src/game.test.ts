import { describe, expect, test } from 'bun:test';
import {
	DEBUG_ROUTE_ID,
	PLAYER_COLORS,
	TRAIN_CARDS,
	USA_CITIES,
	USA_ROUTES,
	USA_TICKETS,
	applyGameAction,
	calculateLongestPath,
	canClaimRoute,
	chooseBotAction,
	createDebugClaimScenario,
	createDebugFinalRoundScenario,
	createGame,
	deserializeGame,
	getGameMachineState,
	playBotTurns,
	replayGame,
	restoreGameState,
	serializeGame,
	type GameState,
} from './game';

function finishTicketSelection(state: GameState): GameState {
	if (state.phase.type !== 'ticket-selection') throw new Error('Expected ticket selection.');
	const result = applyGameAction(state, {
		type: 'keep-tickets',
		ticketIds: state.phase.ticketIds.slice(0, state.phase.minimum),
	});
	if (!result.ok) throw new Error(result.error);
	return playBotTurns(result.state);
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

	test('conserves the exact component supply for every supported player count', () => {
		for (let botCount = 1; botCount <= 4; botCount += 1) {
			const state = createGame({ seed: `supply-${botCount}`, botCount });
			expect(state.players).toHaveLength(botCount + 1);
			expect(state.players.every(player => player.trains === 45 && player.score === 0)).toBe(true);

			const trainCards = [
				...state.trainDeck,
				...state.trainDiscard,
				...state.faceUpTrainCards,
				...state.players.flatMap(player => TRAIN_CARDS.flatMap(card => Array(player.hand[card]).fill(card))),
			];
			expect(trainCards).toHaveLength(110);
			for (const card of TRAIN_CARDS) {
				expect(trainCards.filter(candidate => candidate === card)).toHaveLength(card === 'locomotive' ? 14 : 12);
			}
			const offeredTickets = Object.values(state.openingTicketOffers).flat();
			expect(state.destinationDeck.length + offeredTickets.length).toBe(30);
		}
	});

	test('starts with the selected traveler and preserves clockwise seating order', () => {
		const state = createGame({
			seed: 'starting-traveler',
			startingPlayerId: 'b',
			players: [
				{ id: 'a', name: 'Ada', color: 'red', isBot: false },
				{ id: 'b', name: 'Bea', color: 'blue', isBot: false },
				{ id: 'c', name: 'Cy', color: 'green', isBot: false },
			],
		});
		expect(state.players.map(player => player.id)).toEqual(['b', 'c', 'a']);
		expect(state.currentPlayerIndex).toBe(0);
		expect(state.phase).toMatchObject({ type: 'ticket-selection', playerId: 'b' });
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
		expect(valid.state.phase.type).toBe('ticket-selection');
		expect(valid.state.currentPlayerIndex).toBe(1);
		const afterBots = playBotTurns(valid.state);
		expect(afterBots.phase).toEqual({ type: 'turn', drawsTaken: 0 });
		expect(afterBots.currentPlayerIndex).toBe(0);
		expect(afterBots.players[1]!.tickets).toHaveLength(2);
	});
});

describe('turn rules', () => {
	test('uses XState nodes as the authoritative turn lifecycle', () => {
		let state = createGame({ seed: 'machine-lifecycle', botCount: 1 });
		expect(getGameMachineState(state)).toBe('openingTicketSelection');
		state = finishTicketSelection(state);
		expect(getGameMachineState(state)).toBe('turnReady');

		const firstDraw = applyGameAction(state, { type: 'draw-train-deck' });
		if (!firstDraw.ok) throw new Error(firstDraw.error);
		expect(getGameMachineState(firstDraw.state)).toBe('turnSecondDraw');
		const rejected = applyGameAction(firstDraw.state, {
			type: 'claim-route',
			routeId: DEBUG_ROUTE_ID,
			paymentColor: 'purple',
		});
		expect(rejected.ok).toBe(false);
		expect(rejected.state).toBe(firstDraw.state);

		const tickets = applyGameAction(state, { type: 'draw-destination-tickets' });
		if (!tickets.ok) throw new Error(tickets.error);
		expect(getGameMachineState(tickets.state)).toBe('destinationTicketSelection');

		const finalState = createDebugFinalRoundScenario();
		finalState.faceUpTrainCards[0] = 'locomotive';
		const finished = applyGameAction(finalState, { type: 'draw-face-up', index: 0 });
		if (!finished.ok) throw new Error(finished.error);
		expect(getGameMachineState(finished.state)).toBe('gameOver');
		const afterGame = applyGameAction(finished.state, { type: 'draw-train-deck' });
		expect(afterGame.ok).toBe(false);
		expect(afterGame.state).toBe(finished.state);
	});

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

describe('destination tickets', () => {
	test('draws up to three, requires one, returns the rest to the bottom, and ends the turn', () => {
		const state = finishTicketSelection(createGame({ seed: 'mid-game-tickets', botCount: 1 }));
		const deckBefore = [...state.destinationDeck];
		const draw = applyGameAction(state, { type: 'draw-destination-tickets' });
		expect(draw.ok).toBe(true);
		if (!draw.ok || draw.state.phase.type !== 'ticket-selection') return;
		expect(draw.state.phase).toMatchObject({ minimum: 1, source: 'turn', playerId: 'player' });
		expect(draw.state.phase.ticketIds).toHaveLength(3);

		const invalid = applyGameAction(draw.state, { type: 'keep-tickets', ticketIds: [] });
		expect(invalid.ok).toBe(false);
		const kept = draw.state.phase.ticketIds[0]!;
		const returned = draw.state.phase.ticketIds.slice(1);
		const keep = applyGameAction(draw.state, { type: 'keep-tickets', ticketIds: [kept] });
		expect(keep.ok).toBe(true);
		if (!keep.ok) return;
		expect(keep.state.players[0]!.tickets).toContain(kept);
		expect(keep.state.currentPlayerIndex).toBe(1);
		expect(keep.state.destinationDeck.slice(0, returned.length)).toEqual(returned);
		expect(keep.state.destinationDeck).toHaveLength(deckBefore.length - 1);
	});

	test('deals opening tickets to configured human players in sequence', () => {
		let state = createGame({
			seed: 'local-players',
			players: [
				{ id: 'a', name: 'Ada', color: 'red', isBot: false },
				{ id: 'b', name: 'Bea', color: 'blue', isBot: false },
			],
		});
		if (state.phase.type !== 'ticket-selection') throw new Error('Expected first selection.');
		let result = applyGameAction(state, {
			type: 'keep-tickets',
			ticketIds: state.phase.ticketIds.slice(0, 2),
		});
		if (!result.ok) throw new Error(result.error);
		state = result.state;
		expect(state.phase).toMatchObject({ type: 'ticket-selection', playerId: 'b', source: 'opening' });
		if (state.phase.type !== 'ticket-selection') return;
		result = applyGameAction(state, {
			type: 'keep-tickets',
			ticketIds: state.phase.ticketIds.slice(0, 2),
		});
		if (!result.ok) throw new Error(result.error);
		expect(result.state.phase).toEqual({ type: 'turn', drawsTaken: 0 });
		expect(result.state.currentPlayerIndex).toBe(0);
		expect(result.state.players.map(player => player.tickets.length)).toEqual([2, 2]);
	});

	test('offers every remaining ticket when fewer than three remain', () => {
		const state = finishTicketSelection(createGame({ seed: 'last-tickets', botCount: 1 }));
		state.destinationDeck = state.destinationDeck.slice(-2);
		const result = applyGameAction(state, { type: 'draw-destination-tickets' });
		expect(result.ok).toBe(true);
		if (!result.ok || result.state.phase.type !== 'ticket-selection') return;
		expect(result.state.phase.ticketIds).toHaveLength(2);
		expect(result.state.destinationDeck).toHaveLength(0);
	});
});

describe('train card edge cases', () => {
	test('reshuffles the discard pile deterministically when the deck is empty', () => {
		const state = finishTicketSelection(createGame({ seed: 'reshuffle', botCount: 1 }));
		state.trainDeck = [];
		state.trainDiscard = ['red', 'blue', 'green'];
		const copy = deserializeGame(serializeGame(state));
		const first = applyGameAction(state, { type: 'draw-train-deck' });
		const second = applyGameAction(copy, { type: 'draw-train-deck' });
		expect(first).toEqual(second);
		expect(first.ok).toBe(true);
		if (!first.ok) return;
		expect(first.state.trainDiscard).toHaveLength(0);
		expect(first.state.trainDeck).toHaveLength(2);
	});

	test('discards and replaces a market containing three locomotives', () => {
		const state = finishTicketSelection(createGame({ seed: 'market-reset', botCount: 1 }));
		state.faceUpTrainCards = ['red', 'locomotive', 'locomotive', 'blue', 'green'];
		state.trainDeck = ['white', 'black', 'yellow', 'orange', 'purple', 'locomotive'];
		state.trainDiscard = [];
		const result = applyGameAction(state, { type: 'draw-face-up', index: 0 });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.state.faceUpTrainCards).toEqual(['purple', 'orange', 'yellow', 'black', 'white']);
		expect(result.state.trainDiscard.filter(card => card === 'locomotive')).toHaveLength(3);
	});

	test('allows a blind locomotive as either draw but rejects a face-up locomotive second', () => {
		const state = finishTicketSelection(createGame({ seed: 'second-wild', botCount: 1 }));
		state.trainDeck = ['locomotive'];
		state.trainDiscard = ['red'];
		const blind = applyGameAction(state, { type: 'draw-train-deck' });
		expect(blind.ok).toBe(true);
		if (!blind.ok) return;
		expect(blind.state.phase).toEqual({ type: 'turn', drawsTaken: 1 });
		blind.state.faceUpTrainCards[0] = 'locomotive';
		const faceUp = applyGameAction(blind.state, { type: 'draw-face-up', index: 0 });
		expect(faceUp.ok).toBe(false);
		const secondBlind = applyGameAction(blind.state, { type: 'draw-train-deck' });
		expect(secondBlind.ok).toBe(true);
		if (!secondBlind.ok) return;
		expect(secondBlind.state.currentPlayerIndex).toBe(1);

		const secondWildState = finishTicketSelection(createGame({ seed: 'second-blind-wild', botCount: 1 }));
		secondWildState.trainDeck = ['locomotive', 'red'];
		secondWildState.trainDiscard = [];
		const ordinaryFirst = applyGameAction(secondWildState, { type: 'draw-train-deck' });
		if (!ordinaryFirst.ok) throw new Error(ordinaryFirst.error);
		expect(ordinaryFirst.state.players[0]!.hand.red).toBe(secondWildState.players[0]!.hand.red + 1);
		const wildSecond = applyGameAction(ordinaryFirst.state, { type: 'draw-train-deck' });
		if (!wildSecond.ok) throw new Error(wildSecond.error);
		expect(wildSecond.state.players[0]!.hand.locomotive).toBe(secondWildState.players[0]!.hand.locomotive + 1);
		expect(wildSecond.state.currentPlayerIndex).toBe(1);
	});

	test('disables the entire Train Car action when both piles are empty', () => {
		const state = finishTicketSelection(createGame({ seed: 'no-train-draw', botCount: 1 }));
		state.trainDeck = [];
		state.trainDiscard = [];
		state.faceUpTrainCards = ['red', 'blue', 'green', 'yellow', 'white'];

		const faceUp = applyGameAction(state, { type: 'draw-face-up', index: 0 });
		const blind = applyGameAction(state, { type: 'draw-train-deck' });
		expect(faceUp.ok).toBe(false);
		expect(blind.ok).toBe(false);
		expect(faceUp.state).toBe(state);
		expect(blind.state).toBe(state);
		expect(applyGameAction(state, { type: 'draw-destination-tickets' }).ok).toBe(true);
	});

	test('ends the turn after one draw when no legal second train card exists', () => {
		const state = finishTicketSelection(createGame({ seed: 'last-train-card', botCount: 1 }));
		state.trainDeck = ['red'];
		state.trainDiscard = [];
		state.faceUpTrainCards = Array(5).fill('locomotive');
		const result = applyGameAction(state, { type: 'draw-train-deck' });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.state.currentPlayerIndex).toBe(1);
		expect(result.state.phase).toEqual({ type: 'turn', drawsTaken: 0 });
	});
});

describe('route payment', () => {
	test('uses locomotives only for the missing cards on colored and gray routes', () => {
		const colored = createDebugClaimScenario();
		colored.players[0]!.hand.purple = 2;
		colored.players[0]!.hand.locomotive = 1;
		const coloredClaim = applyGameAction(colored, {
			type: 'claim-route',
			routeId: DEBUG_ROUTE_ID,
			paymentColor: 'purple',
		});
		expect(coloredClaim.ok).toBe(true);
		if (!coloredClaim.ok) return;
		expect(coloredClaim.state.trainDiscard.slice(-3).sort()).toEqual(['locomotive', 'purple', 'purple']);

		const gray = createDebugClaimScenario();
		gray.players[0]!.hand.purple = 0;
		gray.players[0]!.hand.red = 1;
		gray.players[0]!.hand.locomotive = 1;
		const grayClaim = applyGameAction(gray, {
			type: 'claim-route',
			routeId: 'las-vegas-los-angeles-gray',
			paymentColor: 'red',
		});
		expect(grayClaim.ok).toBe(true);
		if (!grayClaim.ok) return;
		expect(grayClaim.state.players[0]!.hand.red).toBe(0);
		expect(grayClaim.state.players[0]!.hand.locomotive).toBe(0);
	});

	test('allows an all-locomotive payment and scores every route length', () => {
		const routes = [
			['vancouver-seattle-gray-a', 'red', 1, 1],
			['las-vegas-los-angeles-gray', 'red', 2, 2],
			[DEBUG_ROUTE_ID, 'purple', 3, 4],
			['calgary-helena-gray', 'red', 4, 7],
			['portland-san-francisco-green-a', 'green', 5, 10],
			['seattle-helena-yellow', 'yellow', 6, 15],
		] as const;
		for (const [routeId, paymentColor, length, points] of routes) {
			const state = createDebugClaimScenario();
			for (const card of TRAIN_CARDS) state.players[0]!.hand[card] = 0;
			state.players[0]!.hand.locomotive = length;
			const result = applyGameAction(state, { type: 'claim-route', routeId, paymentColor });
			expect(result.ok).toBe(true);
			if (!result.ok) continue;
			expect(result.state.players[0]!.score).toBe(points);
			expect(result.state.players[0]!.hand.locomotive).toBe(0);
		}
	});

	test('closes double routes for three players but allows different owners with four', () => {
		const players = (count: number) =>
			Array.from({ length: count }, (_, index) => ({
				id: `p${index}`,
				name: `Player ${index}`,
				color: PLAYER_COLORS[index]!,
				isBot: false,
			}));
		for (const count of [3, 4]) {
			const state = createGame({ seed: `parallel-${count}`, players: players(count) });
			state.phase = { type: 'turn', drawsTaken: 0 };
			state.currentPlayerIndex = 0;
			state.players[0]!.hand.purple = 3;
			const first = applyGameAction(state, {
				type: 'claim-route',
				routeId: DEBUG_ROUTE_ID,
				paymentColor: 'purple',
			});
			if (!first.ok) throw new Error(first.error);
			first.state.players[1]!.hand.yellow = 3;
			const second = applyGameAction(first.state, {
				type: 'claim-route',
				routeId: 'san-francisco-los-angeles-yellow-a',
				paymentColor: 'yellow',
			});
			expect(second.ok).toBe(count === 4);
		}
	});

	test('does not combine two ordinary colors on a gray route', () => {
		const state = createDebugClaimScenario();
		state.players[0]!.hand.purple = 0;
		state.players[0]!.hand.red = 1;
		state.players[0]!.hand.blue = 1;
		expect(canClaimRoute(state, 'player', 'las-vegas-los-angeles-gray', 'red').ok).toBe(false);
	});
});

describe('bot strategy', () => {
	test('claims a shortest-path route for an incomplete destination instead of a longer unrelated route', () => {
		const state = createGame({
			seed: 'bot-route-plan',
			players: [
				{ id: 'bot-a', name: 'Ada', color: 'red', isBot: true },
				{ id: 'bot-b', name: 'Bea', color: 'blue', isBot: true },
			],
		});
		state.phase = { type: 'turn', drawsTaken: 0 };
		state.currentPlayerIndex = 0;
		state.players[0]!.tickets = ['denver-el-paso'];
		for (const card of TRAIN_CARDS) state.players[0]!.hand[card] = 0;
		state.players[0]!.hand.red = 2;
		state.players[0]!.hand.yellow = 6;

		const action = chooseBotAction(state);
		expect(action).toMatchObject({ type: 'claim-route', routeId: 'denver-santa-fe-gray' });
		if (!action) return;
		expect(applyGameAction(state, action).ok).toBe(true);
	});

	test('takes a face-up color needed by the shortest remaining ticket path', () => {
		const state = createGame({
			seed: 'bot-card-plan',
			players: [
				{ id: 'bot-a', name: 'Ada', color: 'red', isBot: true },
				{ id: 'bot-b', name: 'Bea', color: 'blue', isBot: true },
			],
		});
		state.phase = { type: 'turn', drawsTaken: 0 };
		state.currentPlayerIndex = 0;
		state.players[0]!.tickets = ['seattle-los-angeles'];
		for (const card of TRAIN_CARDS) state.players[0]!.hand[card] = 0;
		state.claimedRoutes = {
			'seattle-portland-gray-a': 'bot-a',
			'san-francisco-los-angeles-purple-b': 'bot-a',
		};
		state.faceUpTrainCards = ['blue', 'green', 'orange', 'yellow', 'red'];

		const action = chooseBotAction(state);
		expect(action).toEqual({ type: 'draw-face-up', index: 1 });
		if (!action) return;
		expect(applyGameAction(state, action).ok).toBe(true);
	});
});

describe('final round and scoring', () => {
	test('triggers the final round only when 0, 1, or 2 trains remain', () => {
		for (const trainsRemaining of [0, 1, 2, 3]) {
			const state = createDebugClaimScenario();
			state.players[0]!.trains = trainsRemaining + 3;
			const result = applyGameAction(state, {
				type: 'claim-route',
				routeId: DEBUG_ROUTE_ID,
				paymentColor: 'purple',
			});
			if (!result.ok) throw new Error(result.error);
			expect(result.state.players[0]!.trains).toBe(trainsRemaining);
			expect(result.state.finalRound !== null).toBe(trainsRemaining <= 2);
		}
	});

	test('gives every player, including the trigger, exactly one last turn', () => {
		const state = createDebugClaimScenario();
		state.players[0]!.trains = 5;
		const trigger = applyGameAction(state, {
			type: 'claim-route',
			routeId: DEBUG_ROUTE_ID,
			paymentColor: 'purple',
		});
		expect(trigger.ok).toBe(true);
		if (!trigger.ok) return;
		expect(trigger.state.finalRound).toEqual({ triggeredBy: 'player', turnsRemaining: 2 });
		expect(trigger.state.currentPlayerIndex).toBe(1);

		const afterBot = playBotTurns(trigger.state);
		expect(afterBot.currentPlayerIndex).toBe(0);
		expect(afterBot.finalRound).toEqual({ triggeredBy: 'player', turnsRemaining: 1 });
		afterBot.faceUpTrainCards[0] = 'locomotive';
		const finalTurn = applyGameAction(afterBot, { type: 'draw-face-up', index: 0 });
		expect(finalTurn.ok).toBe(true);
		if (!finalTurn.ok) return;
		expect(finalTurn.state.phase.type).toBe('game-over');
		expect(finalTurn.state.finalRound?.turnsRemaining).toBe(0);
	});

	test('finds the longest continuous trail without counting branches twice', () => {
		const state = createDebugClaimScenario();
		state.claimedRoutes = {
			[DEBUG_ROUTE_ID]: 'player',
			'los-angeles-phoenix-gray': 'player',
			'phoenix-santa-fe-gray': 'player',
			'phoenix-el-paso-gray': 'player',
		};
		expect(calculateLongestPath(state, 'player')).toBe(9);
	});

	test('adds completed tickets, subtracts failed tickets, and awards the longest-route bonus', () => {
		const state = createDebugFinalRoundScenario();
		state.claimedRoutes = {
			'denver-santa-fe-gray': 'player',
			'santa-fe-el-paso-gray': 'player',
		};
		state.players[0]!.tickets = ['denver-el-paso', 'new-york-atlanta'];
		state.players[0]!.score = 5;
		state.players[1]!.tickets = [];
		state.players[1]!.score = 0;
		state.faceUpTrainCards[0] = 'locomotive';
		const result = applyGameAction(state, { type: 'draw-face-up', index: 0 });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const playerResult = result.state.finalResults?.find(item => item.playerId === 'player');
		expect(playerResult).toEqual({
			playerId: 'player',
			routePoints: 5,
			ticketPoints: -2,
			completedTickets: 1,
			longestPath: 4,
			longestRouteBonus: 10,
			finalScore: 13,
			rank: 1,
		});
		expect(result.state.players[0]!.score).toBe(13);
		expect(result.state.phase).toEqual({ type: 'game-over', winnerIds: ['player'] });
	});

	test('awards tied longest routes and preserves tied winners and ranks', () => {
		const state = createDebugFinalRoundScenario();
		state.claimedRoutes = {
			[DEBUG_ROUTE_ID]: 'player',
			'phoenix-santa-fe-gray': 'bot-1',
		};
		for (const player of state.players) {
			player.tickets = [];
			player.score = 0;
		}
		state.faceUpTrainCards[0] = 'locomotive';
		const result = applyGameAction(state, { type: 'draw-face-up', index: 0 });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.state.finalResults?.map(item => [item.playerId, item.longestRouteBonus, item.rank])).toEqual([
			['player', 10, 1],
			['bot-1', 10, 1],
		]);
		expect(result.state.phase).toEqual({ type: 'game-over', winnerIds: ['player', 'bot-1'] });
	});

	test('applies completed-ticket and longest-path tie breakers in order', () => {
		const completedTicketState = createDebugFinalRoundScenario();
		completedTicketState.claimedRoutes = {
			'denver-santa-fe-gray': 'player',
			'santa-fe-el-paso-gray': 'player',
			'winnipeg-helena-blue': 'bot-1',
		};
		completedTicketState.players[0]!.tickets = ['denver-el-paso'];
		completedTicketState.players[0]!.score = 0;
		completedTicketState.players[1]!.tickets = [];
		completedTicketState.players[1]!.score = 4;
		completedTicketState.faceUpTrainCards[0] = 'locomotive';
		const completedTicketResult = applyGameAction(completedTicketState, { type: 'draw-face-up', index: 0 });
		if (!completedTicketResult.ok) throw new Error(completedTicketResult.error);
		expect(completedTicketResult.state.finalResults?.map(result => [result.playerId, result.finalScore])).toEqual([
			['player', 14],
			['bot-1', 14],
		]);
		expect(completedTicketResult.state.phase).toEqual({ type: 'game-over', winnerIds: ['player'] });

		const longestPathState = createDebugFinalRoundScenario();
		longestPathState.claimedRoutes = { 'vancouver-seattle-gray-a': 'player' };
		for (const player of longestPathState.players) player.tickets = [];
		longestPathState.players[0]!.score = 0;
		longestPathState.players[1]!.score = 10;
		longestPathState.faceUpTrainCards[0] = 'locomotive';
		const longestPathResult = applyGameAction(longestPathState, { type: 'draw-face-up', index: 0 });
		if (!longestPathResult.ok) throw new Error(longestPathResult.error);
		expect(longestPathResult.state.finalResults?.map(result => [result.playerId, result.finalScore])).toEqual([
			['player', 10],
			['bot-1', 10],
		]);
		expect(longestPathResult.state.phase).toEqual({ type: 'game-over', winnerIds: ['player'] });
	});
});

describe('persistence and full simulation', () => {
	test('round-trips serialization, migrates version 1 saves, and exactly replays semantic actions', () => {
		const options = { seed: 'replay', humanName: 'Replay player', botCount: 1 } as const;
		let state = finishTicketSelection(createGame(options));
		const first = applyGameAction(state, { type: 'draw-train-deck' });
		if (!first.ok) throw new Error(first.error);
		const second = applyGameAction(first.state, { type: 'draw-train-deck' });
		if (!second.ok) throw new Error(second.error);
		state = playBotTurns(second.state);

		const serialized = serializeGame(state);
		expect(serializeGame(deserializeGame(serialized))).toBe(serialized);
		const replayed = replayGame(options, state.history);
		expect(replayed.ok).toBe(true);
		if (!replayed.ok) return;
		expect(replayed.state).toEqual(state);

		const legacy = JSON.parse(serialized) as Record<string, unknown>;
		legacy.version = 1;
		delete legacy.finalRound;
		delete legacy.finalResults;
		delete legacy.history;
		delete legacy.openingTicketOffers;
		const restored = restoreGameState(legacy);
		expect(restored.version).toBe(2);
		expect(restored.finalRound).toBeNull();
		expect(restored.finalResults).toBeNull();
		expect(restored.history).toEqual([]);
		expect(restored.openingTicketOffers).toEqual({});
	});

	test('plays a seeded all-bot game through final scoring deterministically', () => {
		const simulate = () => {
			const state = createGame({ seed: 'complete-game', botCount: 3 });
			state.players[0]!.isBot = true;
			return playBotTurns(state, 10_000);
		};
		const first = simulate();
		const second = simulate();
		expect(first.phase.type).toBe('game-over');
		expect(first.finalResults).toHaveLength(4);
		expect(first.finalResults?.every(result => result.completedTickets > 0)).toBe(true);
		expect(first.finalRound?.turnsRemaining).toBe(0);
		expect(first.history.length).toBeLessThan(10_000);
		expect(first).toEqual(second);
	});
});
