import { describe, expect, test } from 'bun:test';
import {
	DEBUG_ROUTE_ID,
	PLAYER_COLORS,
	TRAIN_CARDS,
	applyGameAction,
	calculateLongestPath,
	canClaimRoute,
	chooseBotAction,
	createDebugClaimScenario,
	createDebugFinalRoundScenario,
	createGame,
	playBotTurns,
	replayGame,
	restoreGameState,
	type CreateGameOptions,
	type GameState,
} from './game';

function keepOpening(state: GameState, playerId: string, count = 2): GameState {
	const result = applyGameAction(state, {
		type: 'keep-opening-tickets',
		playerId,
		ticketIds: state.openingTicketOffers[playerId]!.slice(0, count),
	});
	if (!result.ok) throw new Error(result.error);
	return result.state;
}

function finishTicketSelection(state: GameState): GameState {
	return playBotTurns(keepOpening(state, 'player'));
}

describe('classic USA setup', () => {
	test('a seed always deals the same serializable game, with four cards per hand and five face up', () => {
		const first = createGame({ seed: 'same-game', botCount: 3 });
		const second = createGame({ seed: 'same-game', botCount: 3 });
		expect(first).toEqual(second);
		expect(JSON.parse(JSON.stringify(first))).toEqual(first);
		expect(first.players.every(player => Object.values(player.hand).reduce((a, b) => a + b) === 4)).toBe(true);
		expect(first.faceUpTrainCards).toHaveLength(5);
		expect(first.phase).toEqual({ type: 'opening-tickets' });
	});

	test('every player count gets 45 trains each, 110 train cards and 30 tickets in play', () => {
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

	test('the chosen starting player goes first and seating order stays clockwise', () => {
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
		expect(state.phase).toEqual({ type: 'opening-tickets' });
		expect(Object.keys(state.openingTicketOffers)).toEqual(['b', 'c', 'a']);
	});

	test('a player must keep at least two opening tickets, and a rejected pick changes nothing', () => {
		const state = createGame({ seed: 'tickets', botCount: 1 });
		const offer = state.openingTicketOffers.player!;
		const invalid = applyGameAction(state, {
			type: 'keep-opening-tickets',
			playerId: 'player',
			ticketIds: offer.slice(0, 1),
		});
		expect(invalid).toMatchObject({ ok: false });
		expect(invalid.state).toBe(state);
		expect(state.players[0]!.tickets).toHaveLength(0);

		const valid = keepOpening(state, 'player');
		expect(valid.players[0]!.tickets).toEqual(offer.slice(0, 2));
		expect(valid.phase).toEqual({ type: 'opening-tickets' });
		expect(Object.keys(valid.openingTicketOffers)).toEqual(['bot-1']);
		const afterBots = playBotTurns(valid);
		expect(afterBots.phase).toEqual({ type: 'turn', drawsTaken: 0 });
		expect(afterBots.currentPlayerIndex).toBe(0);
		expect(afterBots.players[1]!.tickets).toHaveLength(2);
	});
});

describe('turn rules', () => {
	test('after one train card a player may only draw a second, and nothing is accepted once the game is over', () => {
		const state = finishTicketSelection(createGame({ seed: 'machine-lifecycle', botCount: 1 }));
		const firstDraw = applyGameAction(state, { type: 'draw-train-deck' });
		if (!firstDraw.ok) throw new Error(firstDraw.error);
		expect(firstDraw.state.phase).toEqual({ type: 'turn', drawsTaken: 1 });
		const rejected = applyGameAction(firstDraw.state, {
			type: 'claim-route',
			routeId: DEBUG_ROUTE_ID,
			paymentColor: 'purple',
		});
		expect(rejected.ok).toBe(false);
		expect(rejected.state).toBe(firstDraw.state);

		const finalState = createDebugFinalRoundScenario();
		finalState.faceUpTrainCards[0] = 'locomotive';
		const finished = applyGameAction(finalState, { type: 'draw-face-up', index: 0 });
		if (!finished.ok) throw new Error(finished.error);
		expect(finished.state.phase.type).toBe('game-over');
		const afterGame = applyGameAction(finished.state, { type: 'draw-train-deck' });
		expect(afterGame.ok).toBe(false);
		expect(afterGame.state).toBe(finished.state);
	});

	test('drawing two train cards ends the turn', () => {
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

	test('claiming a colored route pays its cards, places its trains, scores it and ends the turn', () => {
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

	test('a route takes only its own color, and with two players the other half of a double route closes', () => {
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
});

describe('destination tickets', () => {
	test('a ticket draw offers three, keeps at least one, returns the rest to the bottom and ends the turn', () => {
		const state = finishTicketSelection(createGame({ seed: 'mid-game-tickets', botCount: 1 }));
		const deckBefore = [...state.destinationDeck];
		const draw = applyGameAction(state, { type: 'draw-destination-tickets' });
		expect(draw.ok).toBe(true);
		if (!draw.ok || draw.state.phase.type !== 'ticket-selection') return;
		expect(draw.state.phase).toMatchObject({ minimum: 1, playerId: 'player' });
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

	test('players choose opening tickets once each, in any order, before the first turn', () => {
		const options: CreateGameOptions = {
			seed: 'local-players',
			players: [
				{ id: 'a', name: 'Ada', color: 'red', isBot: false },
				{ id: 'b', name: 'Bea', color: 'blue', isBot: false },
			],
		};
		const state = createGame(options);
		const offers = state.openingTicketOffers;
		expect(applyGameAction(state, { type: 'draw-train-deck' })).toMatchObject({ ok: false });

		const bFirst = keepOpening(state, 'b', 3);
		expect(bFirst.phase).toEqual({ type: 'opening-tickets' });
		expect(
			applyGameAction(bFirst, { type: 'keep-opening-tickets', playerId: 'b', ticketIds: offers.b! }),
		).toMatchObject({ ok: false });
		const started = keepOpening(bFirst, 'a');
		expect(started.phase).toEqual({ type: 'turn', drawsTaken: 0 });
		expect(started.currentPlayerIndex).toBe(0);
		expect(started.openingTicketOffers).toEqual({});
		expect(started.players.map(player => player.tickets)).toEqual([offers.a!.slice(0, 2), offers.b!]);

		const aFirst = keepOpening(keepOpening(state, 'a'), 'b', 3);
		expect(aFirst.players).toEqual(started.players);
		expect(aFirst.phase).toEqual(started.phase);
		expect(replayGame(options, started.history)).toEqual({ ok: true, state: started });
	});

	test('a pending ticket offer survives a save and restore', () => {
		const state = finishTicketSelection(createGame({ seed: 'mid-turn-save', botCount: 1 }));
		const drawn = applyGameAction(state, { type: 'draw-destination-tickets' });
		if (!drawn.ok || drawn.state.phase.type !== 'ticket-selection') throw new Error('expected a ticket offer');
		const restored = restoreGameState(JSON.parse(JSON.stringify(drawn.state)));
		expect(restored).toEqual(drawn.state);
		expect(applyGameAction(restored, { type: 'keep-tickets', ticketIds: [drawn.state.phase.ticketIds[0]!] }).ok).toBe(
			true,
		);
	});

	test('a ticket draw offers all that remain when fewer than three are left', () => {
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
	test('a player may pass only when nothing can be drawn or claimed, and the game ends once everyone passes', () => {
		const state = finishTicketSelection(createGame({ seed: 'stalled-table', botCount: 1 }));
		state.trainDeck = [];
		state.trainDiscard = [];
		state.destinationDeck = [];
		for (const player of state.players) {
			for (const card of TRAIN_CARDS) player.hand[card] = 0;
		}
		expect(applyGameAction({ ...state, destinationDeck: ['boston-miami'] }, { type: 'pass' })).toMatchObject({
			ok: false,
		});

		const first = applyGameAction(state, { type: 'pass' });
		if (!first.ok) throw new Error(first.error);
		expect(first.state.currentPlayerIndex).toBe(1);
		expect(chooseBotAction(first.state)).toEqual({ type: 'pass' });
		const second = applyGameAction(first.state, { type: 'pass' });
		if (!second.ok) throw new Error(second.error);
		expect(second.state.phase.type).toBe('game-over');
		expect(second.state.events.filter(event => event.type === 'pass')).toHaveLength(2);
	});

	test('a short market restocks to five once the discards are reshuffled', () => {
		const state = finishTicketSelection(createGame({ seed: 'short-market', botCount: 1 }));
		state.trainDeck = [];
		state.trainDiscard = [];
		state.faceUpTrainCards = ['red', 'blue', 'green'];
		state.players[0]!.hand = { ...state.players[0]!.hand, purple: 3, locomotive: 0 };
		const claim = applyGameAction(state, {
			type: 'claim-route',
			routeId: 'san-francisco-los-angeles-purple-b',
			paymentColor: 'purple',
		});
		if (!claim.ok) throw new Error(claim.error);
		expect(claim.state.faceUpTrainCards).toHaveLength(5);
		expect(claim.state.trainDiscard).toHaveLength(0);
	});

	test('an empty deck reshuffles the discards the same way for the same game', () => {
		const state = finishTicketSelection(createGame({ seed: 'reshuffle', botCount: 1 }));
		state.trainDeck = [];
		state.trainDiscard = ['red', 'blue', 'green'];
		const copy = restoreGameState(JSON.parse(JSON.stringify(state)));
		const first = applyGameAction(state, { type: 'draw-train-deck' });
		const second = applyGameAction(copy, { type: 'draw-train-deck' });
		expect(first).toEqual(second);
		expect(first.ok).toBe(true);
		if (!first.ok) return;
		expect(first.state.trainDiscard).toHaveLength(0);
		expect(first.state.trainDeck).toHaveLength(2);
	});

	test('a market showing three locomotives is discarded and dealt again', () => {
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

	test('a blind locomotive counts as one draw, but a face-up locomotive cannot be the second draw', () => {
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

	test('no train card can be drawn, face up or blind, once both piles are empty', () => {
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

	test('the turn ends after one draw when no legal second train card exists', () => {
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
	test('locomotives pay only for the cards a colored or gray route is missing', () => {
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

	test('routes of length 1 to 6 score 1, 2, 4, 7, 10 and 15, and may be paid in locomotives alone', () => {
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

	test('double routes close with three players and take two different owners with four', () => {
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

	test('a gray route cannot mix two ordinary colors', () => {
		const state = createDebugClaimScenario();
		state.players[0]!.hand.purple = 0;
		state.players[0]!.hand.red = 1;
		state.players[0]!.hand.blue = 1;
		expect(canClaimRoute(state, 'player', 'las-vegas-los-angeles-gray', 'red').ok).toBe(false);
	});

	test('an invalid or unaffordable locomotive count is rejected without changing the game', () => {
		const state = createDebugClaimScenario();
		for (const color of TRAIN_CARDS) state.players[0]!.hand[color] = 0;
		Object.assign(state.players[0]!.hand, { red: 3, blue: 1, locomotive: 3 });
		const claim = (paymentColor: 'red' | 'blue', locomotives: number) =>
			applyGameAction(state, { type: 'claim-route', routeId: 'phoenix-santa-fe-gray', paymentColor, locomotives });
		for (const result of [...[-1, 0.5, 4, Number.NaN, Infinity].map(count => claim('red', count)), claim('blue', 1)]) {
			expect(result.ok).toBe(false);
			expect(result.state).toEqual(state);
		}
	});
});

describe('final round and scoring', () => {
	test('the final round starts only when a player is down to 0, 1 or 2 trains', () => {
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

	test('every player, including the one who triggered it, gets exactly one last turn', () => {
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

	test('the longest path follows one continuous trail and never counts a branch twice', () => {
		const state = createDebugClaimScenario();
		state.claimedRoutes = {
			[DEBUG_ROUTE_ID]: 'player',
			'los-angeles-phoenix-gray': 'player',
			'phoenix-santa-fe-gray': 'player',
			'phoenix-el-paso-gray': 'player',
		};
		expect(calculateLongestPath(state, 'player')).toBe(9);
	});

	test('final scoring adds completed tickets, subtracts failed ones and awards 10 for the longest path', () => {
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
			bonuses: [],
			finalScore: 13,
			rank: 1,
		});
		expect(result.state.players[0]!.score).toBe(13);
		expect(result.state.phase).toEqual({ type: 'game-over', winnerIds: ['player'] });
	});

	test('players tied for the longest path all get the bonus, and tied winners share first place', () => {
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

	test('a tied score goes to the most completed tickets, then to the longest path', () => {
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
	test('a game survives a save round trip, replays exactly from its history, and version 1 saves migrate', () => {
		const options = { seed: 'replay', humanName: 'Replay player', botCount: 1 } as const;
		let state = finishTicketSelection(createGame(options));
		const first = applyGameAction(state, { type: 'draw-train-deck' });
		if (!first.ok) throw new Error(first.error);
		const second = applyGameAction(first.state, { type: 'draw-train-deck' });
		if (!second.ok) throw new Error(second.error);
		state = playBotTurns(second.state);

		const serialized = JSON.stringify(state);
		expect(JSON.stringify(restoreGameState(JSON.parse(serialized)))).toBe(serialized);
		const replayed = replayGame(options, state.history);
		expect(replayed.ok).toBe(true);
		if (!replayed.ok) return;
		expect(replayed.state).toEqual(state);

		const legacy = JSON.parse(serialized) as Record<string, unknown>;
		legacy.version = 1;
		legacy.destinationDiscard = [];
		delete legacy.finalRound;
		delete legacy.finalResults;
		delete legacy.history;
		delete legacy.openingTicketOffers;
		const restored = restoreGameState(legacy);
		expect(restored.version).toBe(5);
		expect('destinationDiscard' in restored).toBe(false);
		expect(restored.finalRound).toBeNull();
		expect(restored.finalResults).toBeNull();
		expect(restored.history).toEqual([]);
		expect(restored.openingTicketOffers).toEqual({});
	});

	test('version 2 saves keep their text log as notes', () => {
		const state = restoreGameState({
			...createGame(),
			version: 2,
			events: undefined,
			log: ['You kept 2 destination tickets.'],
		});
		expect(state.events).toEqual([{ type: 'note', text: 'You kept 2 destination tickets.' }]);
		expect('log' in state).toBe(false);
	});

	test('version 3 saves from the sequential opening migrate to simultaneous picks that still replay', () => {
		const options: CreateGameOptions = {
			seed: 'legacy-opening',
			players: [
				{ id: 'a', name: 'Ada', color: 'red', isBot: false },
				{ id: 'b', name: 'Bea', color: 'blue', isBot: false },
				{ id: 'c', name: 'Cy', color: 'green', isBot: false },
			],
		};
		const afterAda = keepOpening(createGame(options), 'a');
		const legacy = JSON.parse(JSON.stringify(afterAda));
		legacy.version = 3;
		legacy.currentPlayerIndex = 1;
		legacy.phase = {
			type: 'ticket-selection',
			playerId: 'b',
			ticketIds: afterAda.openingTicketOffers.b,
			minimum: 2,
			source: 'opening',
		};
		legacy.history = [{ type: 'keep-tickets', ticketIds: afterAda.players[0]!.tickets }];

		const restored = restoreGameState(legacy);
		expect(restored).toEqual(afterAda);
		const finished = keepOpening(keepOpening(restored, 'c'), 'b');
		expect(finished.phase).toEqual({ type: 'turn', drawsTaken: 0 });
		expect(replayGame(options, finished.history)).toEqual({ ok: true, state: finished });

		const sequential = keepOpening(keepOpening(afterAda, 'b'), 'c');
		const drawn = applyGameAction(sequential, { type: 'draw-destination-tickets' });
		if (!drawn.ok || drawn.state.phase.type !== 'ticket-selection') throw new Error('Expected a turn selection.');
		const legacyTurn = JSON.parse(JSON.stringify(drawn.state));
		legacyTurn.version = 3;
		legacyTurn.phase.source = 'turn';
		legacyTurn.history = legacyTurn.history.map((action: { type: string; ticketIds?: string[] }) =>
			action.type === 'keep-opening-tickets' ? { type: 'keep-tickets', ticketIds: action.ticketIds } : action,
		);
		expect(restoreGameState(legacyTurn)).toEqual(drawn.state);
	});
});

test('bots choose only legal moves once both train piles are empty, whatever the market shows', () => {
	for (const locomotive of [false, true]) {
		const state = createDebugClaimScenario();
		state.currentPlayerIndex = 1;
		const bot = state.players[1]!;
		for (const color of TRAIN_CARDS) bot.hand[color] = 0;
		state.trainDeck = [];
		state.trainDiscard = [];
		state.faceUpTrainCards = ['red', 'blue', 'green', 'yellow', locomotive ? 'locomotive' : 'white'];
		const action = chooseBotAction(state)!;
		expect(action.type).toBe('draw-destination-tickets');
		const result = applyGameAction(state, action);
		expect(result.ok).toBe(true);
		expect(playBotTurns(result.state).currentPlayerIndex).toBe(0);
	}
});
