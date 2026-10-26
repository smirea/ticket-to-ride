import { describe, expect, test } from 'bun:test';
import { projectRoomForViewer } from '../../../../apps/server/src/room-projection';
import { applyGameAction, createGame, getRoute, type GameAction, type GameState } from '../game';
import type { RoomState } from '../room';

function pennsylvaniaTurn(players = 3): GameState {
	const state = createGame({ mapId: 'pennsylvania', seed: 'stocks', humanName: 'Player', botCount: players - 1 });
	state.openingTicketOffers = {};
	state.phase = { type: 'turn', drawsTaken: 0 };
	state.currentPlayerIndex = 0;
	for (const player of state.players) {
		player.tickets = [];
		player.score = 0;
		for (const card of Object.keys(player.hand) as (keyof typeof player.hand)[]) player.hand[card] = 8;
	}
	return state;
}

function play(state: GameState, action: GameAction): GameState {
	const result = applyGameAction(state, action);
	if (!result.ok) throw new Error(result.error);
	return result.state;
}

function claim(state: GameState, routeId: string, options?: { stockCompany?: string; dummyCompany?: string }) {
	const color = getRoute(state, routeId)!.color;
	return applyGameAction(state, {
		type: 'claim-route',
		routeId,
		paymentColor: color === 'gray' ? 'yellow' : color,
		options,
	});
}

function finish(state: GameState): GameState {
	state.finalRound = { triggeredBy: state.players[1]!.id, turnsRemaining: 1 };
	state.currentPlayerIndex = 0;
	state.phase = { type: 'turn', drawsTaken: 0 };
	state.faceUpTrainCards[0] = 'locomotive';
	return play(state, { type: 'draw-face-up', index: 0 });
}

function stockLines(state: GameState, playerId: string) {
	return state
		.finalResults!.find(result => result.playerId === playerId)!
		.bonuses.filter(line => line.id.startsWith('stocks-'));
}

describe('Pennsylvania stock shares', () => {
	test('claiming a route takes the top share of the chosen railroad', () => {
		const state = pennsylvaniaTurn();
		const next = claim(state, 'harrisburg-gettysburg-1', { stockCompany: 'reading-railroad' });
		expect(next.ok && next.state.mechanics.stocks).toEqual({
			taken: { 'reading-railroad': 1 },
			holdings: { player: [{ company: 'reading-railroad', number: 1 }], 'bot-1': [], 'bot-2': [] },
		});
	});

	test('the next player who takes that railroad gets the next share number', () => {
		let state = pennsylvaniaTurn();
		state = play(state, {
			type: 'claim-route',
			routeId: 'reading-lancaster-1',
			paymentColor: 'yellow',
			options: { stockCompany: 'reading-railroad' },
		});
		state = play(state, {
			type: 'claim-route',
			routeId: 'harrisburg-reading-1',
			paymentColor: 'purple',
			options: { stockCompany: 'reading-railroad' },
		});
		expect(state.mechanics.stocks!.holdings['bot-1']).toEqual([{ company: 'reading-railroad', number: 2 }]);
	});

	test('only railroads printed on the route can be chosen', () => {
		const result = claim(pennsylvaniaTurn(), 'harrisburg-gettysburg-1', { stockCompany: 'jersey-central-line' });
		expect(result.ok ? undefined : result.error).toBe('Choose a railroad on this route that still has shares.');
	});

	test('a railroad with no shares left cannot be chosen, and a claim without a choice takes another', () => {
		const state = pennsylvaniaTurn();
		state.mechanics.stocks!.taken['reading-railroad'] = 7;
		const refused = claim(state, 'harrisburg-gettysburg-1', { stockCompany: 'reading-railroad' });
		expect(refused.ok ? undefined : refused.error).toBe('Choose a railroad on this route that still has shares.');
		const quick = claim(state, 'harrisburg-gettysburg-1');
		expect(quick.ok && quick.state.mechanics.stocks!.holdings.player).toEqual([
			{ company: 'pennsylvania-railroad', number: 1 },
		]);
	});

	test('a route without logos grants no share', () => {
		const next = claim(pennsylvaniaTurn(), 'pittsburgh-morgantown-1');
		expect(next.ok && next.state.mechanics.stocks!.holdings.player).toEqual([]);
	});

	test('majorities score by rank, ties go to the lowest share number and extra holders score nothing', () => {
		const state = pennsylvaniaTurn(4);
		const share = (company: string, number: number) => ({ company, number });
		state.mechanics.stocks!.holdings = {
			player: [share('jersey-central-line', 2)],
			'bot-1': [share('jersey-central-line', 1)],
			'bot-2': [share('jersey-central-line', 3), share('pennsylvania-railroad', 1)],
			'bot-3': [],
		};
		const done = finish(state);
		expect(stockLines(done, 'bot-1')).toEqual([
			{ id: 'stocks-jersey-central-line', label: 'JCL 1st (1)', points: 8, group: 'Shares' },
		]);
		expect(stockLines(done, 'player')).toEqual([
			{ id: 'stocks-jersey-central-line', label: 'JCL 2nd (1)', points: 5, group: 'Shares' },
		]);
		expect(stockLines(done, 'bot-2')).toEqual([
			{ id: 'stocks-pennsylvania-railroad', label: 'PRR 1st (1)', points: 30, group: 'Shares' },
		]);
	});

	test('globetrotter pays 15 to everyone tied for the most completed tickets', () => {
		const state = pennsylvaniaTurn();
		state.claimedRoutes = { 'philadelphia-atlantic-city-1': 'player' };
		state.players[0]!.tickets = ['philadelphia-atlantic-city'];
		const done = finish(state);
		expect(done.finalResults!.find(result => result.playerId === 'player')!.bonuses).toContainEqual({
			id: 'globetrotter',
			label: 'Globetrotter',
			points: 15,
		});
	});
});

describe('Pennsylvania 2-player dummy shareholder', () => {
	test('each share taken also gives the dummy a share from the same route', () => {
		const next = claim(pennsylvaniaTurn(2), 'scranton-wilkes-barre-stroudsburg-1', {
			stockCompany: 'jersey-central-line',
			dummyCompany: 'lehigh-valley-railroad',
		});
		expect(next.ok && next.state.mechanics.stocks!.dummy).toEqual({
			shares: [{ company: 'lehigh-valley-railroad', number: 1 }],
		});
	});

	test('the dummy cannot take a share that the claimer just took last', () => {
		const state = pennsylvaniaTurn(2);
		state.mechanics.stocks!.taken['buffalo-rochester-pittsburgh-railway'] = 1;
		const refused = claim(state, 'warren-dubois-1', {
			stockCompany: 'buffalo-rochester-pittsburgh-railway',
			dummyCompany: 'buffalo-rochester-pittsburgh-railway',
		});
		expect(refused.ok ? undefined : refused.error).toBe(
			'Choose a railroad on this route that still has a share for the dummy.',
		);
		const allowed = claim(state, 'warren-dubois-1', {
			stockCompany: 'buffalo-rochester-pittsburgh-railway',
			dummyCompany: 'erie-lackawanna-railway',
		});
		expect(allowed.ok).toBe(true);
	});

	test('the dummy holds a place in the majority without scoring, as in the rulebook B&O example', () => {
		const state = pennsylvaniaTurn(2);
		const bo = (number: number) => ({ company: 'baltimore-ohio-railroad', number });
		state.mechanics.stocks!.holdings = { player: [bo(1), bo(4)], 'bot-1': [bo(5)] };
		// Half of the dummy's four shares (two B&O) are revealed, whichever two the shuffle picks.
		state.mechanics.stocks!.dummy = { shares: [bo(2), bo(3), bo(6), bo(7)] };
		const done = finish(state);
		expect(done.mechanics.stocks!.dummy!.revealed).toHaveLength(2);
		expect(stockLines(done, 'player')).toEqual([
			{ id: 'stocks-baltimore-ohio-railroad', label: 'B&O 1st (2)', points: 20, group: 'Shares' },
		]);
		expect(stockLines(done, 'bot-1')).toEqual([
			{ id: 'stocks-baltimore-ohio-railroad', label: 'B&O 3rd (1)', points: 9, group: 'Shares' },
		]);
	});

	test('a claim without options still takes a share for the claimer and the dummy', () => {
		const state = play(pennsylvaniaTurn(2), {
			type: 'claim-route',
			routeId: 'scranton-wilkes-barre-stroudsburg-1',
			paymentColor: 'yellow',
		});
		expect(state.mechanics.stocks!.holdings.player).toHaveLength(1);
		expect(state.mechanics.stocks!.dummy!.shares).toHaveLength(1);
	});
});

describe('Pennsylvania share secrecy', () => {
	function room(game: GameState): RoomState {
		return {
			version: 1,
			code: 'STOCKS',
			revision: 1,
			phase: 'playing',
			hostId: 'player',
			players: [],
			settings: { mapId: game.mapId, maxPlayers: 5, seed: game.seed },
			game,
			createdAt: '',
			updatedAt: '',
			finishedAt: null,
			finishedReason: null,
		};
	}

	test('players see their own shares and only the number of everyone else’s', () => {
		const state = play(pennsylvaniaTurn(2), {
			type: 'claim-route',
			routeId: 'scranton-wilkes-barre-stroudsburg-1',
			paymentColor: 'yellow',
			options: { stockCompany: 'jersey-central-line', dummyCompany: 'reading-railroad' },
		});
		const seen = projectRoomForViewer(room(state), 'bot-1').game!;
		expect(seen.mechanics.stocks).toEqual({
			taken: { 'jersey-central-line': 1, 'reading-railroad': 1 },
			holdings: { player: [], 'bot-1': [] },
			hidden: { player: 1 },
			dummy: { shares: [], hidden: 1 },
		});
		expect(seen.events.at(-1)).toEqual({ type: 'take-shares', playerId: 'player', turnNumber: 1 });
		expect(seen.history.at(-1)).toEqual({
			type: 'claim-route',
			routeId: 'scranton-wilkes-barre-stroudsburg-1',
			paymentColor: 'yellow',
		});
		const own = projectRoomForViewer(room(state), 'player').game!;
		expect(own.mechanics.stocks!.holdings.player).toEqual([{ company: 'jersey-central-line', number: 1 }]);
	});
});
