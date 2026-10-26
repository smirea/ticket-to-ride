import { z } from 'zod';
import {
	botPlannedRoutes,
	claimPayment,
	cloneState,
	currentPlayer,
	finishDraw,
	gameMap,
	shuffleWithState,
	type GameAction,
	type GameState,
	type Player,
	type PlayerId,
} from '../game';
import type { Route } from '../maps/types';
import { defineAction, type Mechanic } from './types';

export const TERRAINS = ['desert', 'jungle', 'mountain'] as const;
export type Terrain = (typeof TERRAINS)[number];
export type TerrainHand = Record<Terrain, number>;

export const TERRAIN_NAMES: Record<Terrain, string> = {
	desert: 'Desert & Savanna',
	jungle: 'Jungle & Forest',
	mountain: 'Mountain & Cliff',
};
const TERRAIN_OF_COLOR: Record<Route['color'], Terrain> = {
	yellow: 'desert',
	orange: 'desert',
	red: 'desert',
	purple: 'jungle',
	blue: 'jungle',
	green: 'jungle',
	white: 'mountain',
	gray: 'mountain',
	black: 'mountain',
};
const CARDS_PER_TERRAIN = 15;
const FACE_UP = 2;
// Spending a locomotive as wild terrain only pays off on routes worth at least this much.
const BOT_LOCOMOTIVE_MIN_POINTS = 4;

declare module './types' {
	interface MechanicStateMap {
		'terrain-cards': {
			deck: Terrain[];
			discard: Terrain[];
			faceUp: Terrain[];
			// Terrain cards lie face up in front of their owner, so every count is public.
			held: Record<PlayerId, TerrainHand>;
		};
	}
	interface MechanicActionMap {
		'draw-terrain-card': { index?: number };
	}
	interface MechanicEventMap {
		'draw-terrain-card': { terrain: Terrain; faceUp: boolean };
		'double-route': { routeId: string; terrain: Terrain; cards: number; locomotives: number };
	}
	interface ClaimOptions {
		// Present when the claim doubles its points; `locomotives` are extra locomotives played as wild terrain.
		terrain?: { locomotives: number };
	}
}

type TerrainState = NonNullable<GameState['mechanics']['terrain-cards']>;

function terrainState(state: GameState): TerrainState {
	const terrain = state.mechanics['terrain-cards'];
	if (!terrain) throw new Error('Terrain cards were not set up.');
	return terrain;
}

export function routeTerrain(route: Pick<Route, 'color'>): Terrain {
	return TERRAIN_OF_COLOR[route.color];
}

export function terrainCardsToDouble(route: Pick<Route, 'length'>): number {
	return route.length <= 3 ? 1 : 2;
}

export function terrainHand(state: GameState, playerId: PlayerId): TerrainHand {
	return state.mechanics['terrain-cards']?.held[playerId] ?? { desert: 0, jungle: 0, mountain: 0 };
}

function rivalMost(state: GameState, playerId: PlayerId, terrain: Terrain): number {
	return Math.max(
		0,
		...state.players.filter(player => player.id !== playerId).map(player => terrainHand(state, player.id)[terrain]),
	);
}

export interface DoublingTerms {
	terrain: Terrain;
	// Cards discarded to double the route.
	required: number;
	held: number;
	rivalMost: number;
	// Fewest and most locomotives worth playing as wild terrain.
	minLocomotives: number;
	maxLocomotives: number;
}

export function doublingTerms(state: GameState, playerId: PlayerId, route: Route): DoublingTerms {
	const terrain = routeTerrain(route);
	const required = terrainCardsToDouble(route);
	const held = terrainHand(state, playerId)[terrain];
	const most = rivalMost(state, playerId, terrain);
	return {
		terrain,
		required,
		held,
		rivalMost: most,
		minLocomotives: Math.max(0, required - held, most - held),
		maxLocomotives: Math.max(required, most - held),
	};
}

// Locomotives left in hand once the train payment for this claim is made.
export function spareLocomotives(
	state: GameState,
	player: Player,
	route: Route,
	paymentColor: Parameters<typeof claimPayment>[2],
	locomotives?: number,
): number {
	return player.hand.locomotive - claimPayment(route, player, paymentColor, locomotives).locomotives;
}

function draw(terrain: TerrainState, state: GameState): Terrain | undefined {
	if (terrain.deck.length === 0 && terrain.discard.length) {
		terrain.deck = shuffleWithState(state, terrain.discard);
		terrain.discard = [];
	}
	return terrain.deck.pop();
}

function refill(terrain: TerrainState, state: GameState): void {
	while (terrain.faceUp.length < FACE_UP) {
		const card = draw(terrain, state);
		if (!card) return;
		terrain.faceUp.push(card);
	}
}

function canDrawTerrain(state: GameState): boolean {
	const terrain = state.mechanics['terrain-cards'];
	return Boolean(terrain && terrain.deck.length + terrain.discard.length + terrain.faceUp.length > 0);
}

const drawTerrainCard = defineAction<'draw-terrain-card'>({
	timing: 'draw',
	schema: z.object({
		index: z
			.int()
			.min(0)
			.max(FACE_UP - 1)
			.optional(),
	}),
	apply(state, action) {
		const next = cloneState(state);
		const terrain = terrainState(next);
		const player = currentPlayer(next);
		const card = action.index === undefined ? draw(terrain, next) : terrain.faceUp.splice(action.index, 1)[0];
		if (!card) return { ok: false, state, error: 'There is no terrain card to draw there.' };
		refill(terrain, next);
		terrain.held[player.id]![card] += 1;
		next.events.push({
			type: 'draw-terrain-card',
			playerId: player.id,
			turnNumber: next.turnNumber,
			terrain: card,
			faceUp: action.index !== undefined,
		});
		finishDraw(next);
		return { ok: true, state: next };
	},
});

// A second draw toward the terrain a bot's next routes need, while it does not lead that terrain yet.
function botTerrainDraw(state: GameState, player: Player): GameAction | undefined {
	if (state.phase.type !== 'turn' || state.phase.drawsTaken !== 1) return undefined;
	const terrain = state.mechanics['terrain-cards'];
	if (!terrain) return undefined;
	const wanted = new Map<Terrain, number>();
	for (const route of botPlannedRoutes(state, player)) {
		if (route.length < 3) continue;
		const terms = doublingTerms(state, player.id, route);
		if (terms.held >= Math.max(terms.required, terms.rivalMost + 1)) continue;
		wanted.set(terms.terrain, (wanted.get(terms.terrain) ?? 0) + route.length);
	}
	const index = terrain.faceUp
		.map((card, index) => ({ index, weight: wanted.get(card) ?? 0 }))
		.filter(candidate => candidate.weight > 0)
		.sort((left, right) => right.weight - left.weight || left.index - right.index)[0]?.index;
	return index === undefined ? undefined : { type: 'draw-terrain-card', index };
}

export const terrainCards: Mechanic = {
	id: 'terrain-cards',
	setup(state) {
		const deck = shuffleWithState(
			state,
			TERRAINS.flatMap(terrain => Array<Terrain>(CARDS_PER_TERRAIN).fill(terrain)),
		);
		const held: Record<PlayerId, TerrainHand> = {};
		for (const player of state.players) {
			held[player.id] = { desert: 0, jungle: 0, mountain: 0 };
			held[player.id]![deck.pop()!] += 1;
		}
		const terrain: TerrainState = { deck, discard: [], faceUp: [], held };
		refill(terrain, state);
		state.mechanics['terrain-cards'] = terrain;
	},
	actions: { 'draw-terrain-card': drawTerrainCard },
	claimOptions: {
		terrain: z.object({ locomotives: z.int().min(0).max(8) }).optional(),
	},
	validateClaim(state, player, route, claim) {
		const choice = claim.options?.terrain;
		if (!choice) return undefined;
		const terms = doublingTerms(state, player.id, route);
		const name = TERRAIN_NAMES[terms.terrain];
		if (choice.locomotives > spareLocomotives(state, player, route, claim.paymentColor, claim.locomotives)) {
			return 'Not enough locomotives left to play as wild terrain.';
		}
		if (choice.locomotives > terms.maxLocomotives) return 'Play only the locomotives the doubling needs.';
		if (terms.held + choice.locomotives < terms.required) {
			return `Doubling this route takes ${terms.required} ${name} ${terms.required === 1 ? 'card' : 'cards'}.`;
		}
		if (terms.held + choice.locomotives < terms.rivalMost) {
			return `You need at least as many ${name} cards as every other player.`;
		}
		return undefined;
	},
	claimPoints(_state, _route, options, points) {
		return options.terrain ? points * 2 : points;
	},
	onClaim(next, player, route, claim) {
		const choice = claim.options?.terrain;
		if (!choice) return;
		const terrain = terrainState(next);
		const kind = routeTerrain(route);
		const cards = Math.max(0, terrainCardsToDouble(route) - choice.locomotives);
		terrain.held[player.id]![kind] -= cards;
		terrain.discard.push(...Array<Terrain>(cards).fill(kind));
		player.hand.locomotive -= choice.locomotives;
		next.trainDiscard.push(...Array<'locomotive'>(choice.locomotives).fill('locomotive'));
		next.events.push({
			type: 'double-route',
			playerId: player.id,
			turnNumber: next.turnNumber,
			routeId: route.id,
			terrain: kind,
			cards,
			locomotives: choice.locomotives,
		});
	},
	hasTurnAction: canDrawTerrain,
	canDraw: canDrawTerrain,
	chooseBotAction: botTerrainDraw,
	botClaimOptions(state, player, route, claim) {
		const terms = doublingTerms(state, player.id, route);
		if (terms.minLocomotives > 0 && gameMap(state).rules.routeScores[route.length]! < BOT_LOCOMOTIVE_MIN_POINTS) {
			return undefined;
		}
		const options = { terrain: { locomotives: terms.minLocomotives } };
		const error = terrainCards.validateClaim!(state, player, route, { ...claim, options });
		return error ? undefined : options;
	},
	redact(state) {
		const terrain = state.mechanics['terrain-cards'];
		if (terrain) terrain.deck.fill('desert');
	},
	describeEvent(event) {
		if (event.type === 'draw-terrain-card') {
			return `drew a ${TERRAIN_NAMES[event.terrain]} card${event.faceUp ? '' : ' from the terrain deck'}`;
		}
		if (event.type === 'double-route') {
			const parts = [
				event.cards ? `${event.cards} ${TERRAIN_NAMES[event.terrain]} ${event.cards === 1 ? 'card' : 'cards'}` : '',
				event.locomotives ? `${event.locomotives} ${event.locomotives === 1 ? 'locomotive' : 'locomotives'}` : '',
			].filter(Boolean);
			return `doubled the route’s points with ${parts.join(' and ')}`;
		}
		return undefined;
	},
};
