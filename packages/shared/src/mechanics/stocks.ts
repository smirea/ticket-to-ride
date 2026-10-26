import { z } from 'zod';
import { gameMap, shuffleWithState } from '../game';
import type { GameState, Player, PlayerId } from '../game';
import type { Route } from '../maps/types';
import type { ClaimOptions, Mechanic, ScoreLine } from './types';

export interface StockShare {
	company: string;
	number: number;
}

export interface Railroad {
	short: string;
	shares: number;
	// Points for the 1st, 2nd, ... largest holder, as printed on the railroad's shares.
	points: readonly number[];
}

declare module './types' {
	interface MechanicStateMap {
		stocks: {
			// Shares taken from each railroad's pile; the next share is number `taken + 1`.
			taken: Record<string, number>;
			holdings: Record<PlayerId, StockShare[]>;
			// Face-down share counts of holdings that `redact` hid from the viewer.
			hidden?: Record<PlayerId, number>;
			// The 2-player dummy shareholder.
			dummy?: { shares: StockShare[]; hidden?: number; revealed?: StockShare[] };
		};
	}
	interface ClaimOptions {
		stockCompany?: string;
		dummyCompany?: string;
	}
	interface MechanicEventMap {
		'take-shares': { company?: string; dummyCompany?: string };
	}
}

export const RAILROADS: Readonly<Record<string, Railroad>> = {
	'pennsylvania-railroad': { short: 'PRR', shares: 15, points: [30, 21, 14, 9, 6] },
	'baltimore-ohio-railroad': { short: 'B&O', shares: 10, points: [20, 14, 9, 5, 2] },
	'erie-lackawanna-railway': { short: 'Erie', shares: 8, points: [16, 10, 5, 1] },
	'reading-railroad': { short: 'Reading', shares: 7, points: [14, 9, 5] },
	'lehigh-valley-railroad': { short: 'Lehigh', shares: 6, points: [12, 7, 3] },
	'new-york-central-system': { short: 'NYC', shares: 5, points: [10, 6, 3] },
	'western-maryland-railway': { short: 'WM', shares: 4, points: [9, 5] },
	'jersey-central-line': { short: 'JCL', shares: 3, points: [8, 5] },
	'buffalo-rochester-pittsburgh-railway': { short: 'BR&P', shares: 2, points: [7, 4] },
};

export const DUMMY = 'dummy';
const RANKS = ['1st', '2nd', '3rd', '4th', '5th'];

export function railroad(company: string): Railroad {
	const table = RAILROADS[company];
	if (!table) throw new Error(`Unknown railroad ${company}.`);
	return table;
}

export function stocksState(state: GameState): NonNullable<GameState['mechanics']['stocks']> {
	const stocks = state.mechanics.stocks;
	if (!stocks) throw new Error('This game has no stock shares.');
	return stocks;
}

export function hasDummy(state: GameState): boolean {
	return state.players.length === 2;
}

export function sharesLeft(state: GameState, company: string): number {
	return railroad(company).shares - (stocksState(state).taken[company] ?? 0);
}

export function routeCompanies(route: Route): readonly string[] {
	return route.spec.stockCompanies ?? [];
}

export function availableCompanies(state: GameState, route: Route, taken = stocksState(state).taken): string[] {
	return routeCompanies(route).filter(company => (taken[company] ?? 0) < railroad(company).shares);
}

export function shareCount(state: GameState, playerId: PlayerId): number {
	const stocks = stocksState(state);
	return (stocks.holdings[playerId]?.length ?? 0) + (stocks.hidden?.[playerId] ?? 0);
}

export function dummyShareCount(state: GameState): number {
	const dummy = stocksState(state).dummy;
	return (dummy?.shares.length ?? 0) + (dummy?.hidden ?? 0);
}

export interface Standing {
	holderId: string;
	count: number;
	rank: number;
	points: number;
}

// Most shares ranks first; equal counts go to whoever holds the lowest-numbered share, as they invested first.
export function companyStandings(company: string, holdings: ReadonlyMap<string, readonly StockShare[]>): Standing[] {
	const { points } = railroad(company);
	return [...holdings]
		.map(([holderId, shares]) => {
			const own = shares.filter(share => share.company === company);
			return { holderId, count: own.length, first: Math.min(...own.map(share => share.number)) };
		})
		.filter(entry => entry.count > 0)
		.sort((left, right) => right.count - left.count || left.first - right.first)
		.map((entry, index) => ({
			holderId: entry.holderId,
			count: entry.count,
			rank: index + 1,
			points: entry.holderId === DUMMY ? 0 : (points[index] ?? 0),
		}));
}

function holdingsMap(state: GameState, dummyShares?: readonly StockShare[]): Map<string, readonly StockShare[]> {
	const stocks = stocksState(state);
	const holdings = new Map<string, readonly StockShare[]>(
		state.players.map(player => [player.id, stocks.holdings[player.id] ?? []]),
	);
	if (dummyShares) holdings.set(DUMMY, dummyShares);
	return holdings;
}

function totalPoints(holdings: ReadonlyMap<string, readonly StockShare[]>): Map<string, number> {
	const totals = new Map([...holdings.keys()].map(holderId => [holderId, 0]));
	const companies = new Set([...holdings.values()].flatMap(shares => shares.map(share => share.company)));
	for (const company of companies) {
		for (const standing of companyStandings(company, holdings)) {
			totals.set(standing.holderId, totals.get(standing.holderId)! + standing.points);
		}
	}
	return totals;
}

function pickValue(state: GameState, player: Player, choice: ShareChoice): number {
	const stocks = stocksState(state);
	const holdings = holdingsMap(state, stocks.dummy?.shares);
	const taken = { ...stocks.taken };
	const give = (holderId: string, company: string | undefined) => {
		if (!company) return;
		taken[company] = (taken[company] ?? 0) + 1;
		holdings.set(holderId, [...(holdings.get(holderId) ?? []), { company, number: taken[company] }]);
	};
	give(player.id, choice.company);
	give(DUMMY, choice.dummyCompany);
	const totals = totalPoints(holdings);
	const rivals = state.players.filter(other => other.id !== player.id).map(other => totals.get(other.id) ?? 0);
	return (totals.get(player.id) ?? 0) - Math.max(0, ...rivals);
}

export interface ShareChoice {
	company?: string;
	dummyCompany?: string;
}

// Every legal share pick on a route, narrowed to the parts `fixed` already decides.
export function shareChoices(state: GameState, route: Route, fixed: ClaimOptions = {}): ShareChoice[] {
	const stocks = stocksState(state);
	const companies = fixed.stockCompany ? [fixed.stockCompany] : availableCompanies(state, route);
	return companies.flatMap(company => {
		if (!hasDummy(state)) return [{ company }];
		const taken = { ...stocks.taken, [company]: (stocks.taken[company] ?? 0) + 1 };
		const dummyOptions = fixed.dummyCompany ? [fixed.dummyCompany] : availableCompanies(state, route, taken);
		return dummyOptions.length ? dummyOptions.map(dummyCompany => ({ company, dummyCompany })) : [{ company }];
	});
}

// What a claim takes when its options leave a choice open: the share that most improves the claimer's lead.
export function bestShareChoice(state: GameState, player: Player, route: Route, fixed: ClaimOptions = {}): ShareChoice {
	// Bigger untouched pots are worth more later, so they break ties between equal immediate gains.
	const potential = (company: string | undefined) =>
		company ? (railroad(company).points[0]! * sharesLeft(state, company)) / railroad(company).shares : 0;
	let best: { choice: ShareChoice; value: number; potential: number } | undefined;
	for (const choice of shareChoices(state, route, fixed)) {
		const value = pickValue(state, player, choice);
		const tieBreak = potential(choice.company) - potential(choice.dummyCompany);
		if (!best || value > best.value || (value === best.value && tieBreak > best.potential)) {
			best = { choice, value, potential: tieBreak };
		}
	}
	return best?.choice ?? {};
}

function validateChoice(state: GameState, route: Route, options: ClaimOptions | undefined): string | undefined {
	if (!options) return undefined;
	const { stockCompany, dummyCompany } = options;
	if (stockCompany !== undefined && !availableCompanies(state, route).includes(stockCompany)) {
		return 'Choose a railroad on this route that still has shares.';
	}
	if (dummyCompany === undefined) return undefined;
	if (!hasDummy(state)) return 'Only 2-player games have a dummy shareholder.';
	if (stockCompany === undefined) return 'Choose your own share before the dummy’s.';
	const taken = { ...stocksState(state).taken };
	taken[stockCompany] = (taken[stockCompany] ?? 0) + 1;
	if (!availableCompanies(state, route, taken).includes(dummyCompany)) {
		return 'Choose a railroad on this route that still has a share for the dummy.';
	}
	return undefined;
}

function take(next: GameState, holder: StockShare[], company: string): void {
	const stocks = stocksState(next);
	stocks.taken[company] = (stocks.taken[company] ?? 0) + 1;
	holder.push({ company, number: stocks.taken[company] });
}

// The dummy's shares are shuffled and only half (rounded up) are revealed and counted; the draw is kept in state.
function revealDummy(state: GameState): StockShare[] | undefined {
	const dummy = stocksState(state).dummy;
	if (!dummy) return undefined;
	dummy.revealed ??= shuffleWithState(state, dummy.shares).slice(0, Math.ceil(dummy.shares.length / 2));
	return dummy.revealed;
}

export function companyName(state: GameState, company: string): string {
	return gameMap(state).companies.find(item => item.id === company)?.name ?? company;
}

export const stocks: Mechanic = {
	id: 'stocks',
	validate(map) {
		const missing = map.companies.filter(company => !RAILROADS[company.id]);
		return missing.length ? `railroads ${missing.map(company => company.id)} have no share table.` : undefined;
	},
	setup(state) {
		state.mechanics.stocks = {
			taken: {},
			holdings: Object.fromEntries(state.players.map(player => [player.id, []])),
			...(hasDummy(state) ? { dummy: { shares: [] } } : {}),
		};
	},
	claimOptions: {
		stockCompany: z.string().max(64).optional(),
		dummyCompany: z.string().max(64).optional(),
	},
	validateClaim(state, _player, route, claim) {
		return validateChoice(state, route, claim.options);
	},
	onClaim(next, player, route, claim) {
		const choice = bestShareChoice(next, player, route, claim.options);
		if (!choice.company) return;
		const stocks = stocksState(next);
		take(next, (stocks.holdings[player.id] ??= []), choice.company);
		if (choice.dummyCompany && stocks.dummy) take(next, stocks.dummy.shares, choice.dummyCompany);
		next.events.push({
			type: 'take-shares',
			playerId: player.id,
			turnNumber: next.turnNumber,
			company: choice.company,
			...(choice.dummyCompany ? { dummyCompany: choice.dummyCompany } : {}),
		});
	},
	scoring(state) {
		const holdings = holdingsMap(state, revealDummy(state));
		const lines = new Map<string, ScoreLine[]>(state.players.map(player => [player.id, []]));
		for (const company of gameMap(state).companies) {
			for (const standing of companyStandings(company.id, holdings)) {
				if (standing.points === 0) continue;
				lines.get(standing.holderId)?.push({
					id: `stocks-${company.id}`,
					label: `${railroad(company.id).short} ${RANKS[standing.rank - 1]} (${standing.count})`,
					points: standing.points,
				});
			}
		}
		return Object.fromEntries(lines);
	},
	redact(state, viewerId) {
		if (state.phase.type === 'game-over') return;
		const stocks = stocksState(state);
		stocks.hidden = {};
		for (const [playerId, shares] of Object.entries(stocks.holdings)) {
			if (playerId === viewerId) continue;
			stocks.hidden[playerId] = shares.length;
			stocks.holdings[playerId] = [];
		}
		if (stocks.dummy) stocks.dummy = { shares: [], hidden: stocks.dummy.shares.length };
		state.events = state.events.map(event =>
			event.type === 'take-shares' && event.playerId !== viewerId
				? { type: event.type, playerId: event.playerId, turnNumber: event.turnNumber }
				: event,
		);
		state.history = state.history.map(action => {
			if (action.type !== 'claim-route' || !action.options) return action;
			const { options: _, ...rest } = action;
			return rest;
		});
	},
	describeEvent(event, playerName) {
		if (event.type !== 'take-shares') return undefined;
		const name = (company: string) => (RAILROADS[company] ? railroad(company).short : company);
		if (!event.company) return `${playerName} took a stock share.`;
		const dummy = event.dummyCompany ? ` and gave the dummy a ${name(event.dummyCompany)} share` : '';
		return `${playerName} took a ${name(event.company)} share${dummy}.`;
	},
};
