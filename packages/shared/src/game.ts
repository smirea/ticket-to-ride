import { z } from 'zod';
import type { GameEvent } from './game-events';
import { DEFAULT_MAP_ID, getGameMap } from './maps';
import type { DestinationTicket, GameMap, Route, RouteId, TicketId, TrainColor } from './maps/types';
import type {
	ClaimOptions,
	ClaimPayment,
	MechanicAction,
	MechanicActionDef,
	MechanicPhase,
	MechanicStates,
	ScoreLine,
} from './mechanics/types';
import { findRoutePath } from './route-graph';

export type { City, CityId, DestinationTicket, GameMap, Route, RouteId, TicketId, TrainColor } from './maps/types';

export const TRAIN_COLORS = [
	'red',
	'orange',
	'yellow',
	'green',
	'blue',
	'purple',
	'black',
	'white',
] as const satisfies readonly TrainColor[];
export const TRAIN_CARDS = [...TRAIN_COLORS, 'locomotive'] as const;
export const PLAYER_COLORS = ['red', 'blue', 'green', 'yellow', 'black'] as const;

export type TrainCard = (typeof TRAIN_CARDS)[number];
export type PlayerColor = (typeof PLAYER_COLORS)[number];
export type PlayerId = string;
export type TrainHand = Record<TrainCard, number>;

export interface Player {
	id: PlayerId;
	name: string;
	color: PlayerColor;
	isBot: boolean;
	score: number;
	trains: number;
	hand: TrainHand;
	tickets: TicketId[];
	completedTicketCount?: number;
}

export type CorePhase =
	| { type: 'opening-tickets' }
	| { type: 'ticket-selection'; playerId: PlayerId; ticketIds: TicketId[]; minimum: number }
	| { type: 'turn'; drawsTaken: 0 | 1 }
	| { type: 'game-over'; winnerIds: PlayerId[] };
// Mechanic phases always belong to the current player.
export type GamePhase = CorePhase | MechanicPhase;

export interface FinalRound {
	triggeredBy: PlayerId;
	turnsRemaining: number;
}

export interface FinalPlayerResult {
	playerId: PlayerId;
	routePoints: number;
	ticketPoints: number;
	completedTickets: number;
	longestPath: number;
	longestRouteBonus: number;
	bonuses: ScoreLine[];
	finalScore: number;
	rank: number;
}

export interface GameState {
	version: 5;
	mapId: string;
	seed: string;
	rngState: number;
	phase: GamePhase;
	players: Player[];
	currentPlayerIndex: number;
	turnNumber: number;
	trainDeck: TrainCard[];
	trainDiscard: TrainCard[];
	faceUpTrainCards: TrainCard[];
	destinationDeck: TicketId[];
	// Players still choosing opening tickets; an entry is removed once that player keeps tickets.
	openingTicketOffers: Record<PlayerId, TicketId[]>;
	claimedRoutes: Record<RouteId, PlayerId>;
	mechanics: MechanicStates;
	events: GameEvent[];
	finalRound: FinalRound | null;
	finalResults: FinalPlayerResult[] | null;
	history: GameAction[];
}

export type ClaimRouteAction = {
	type: 'claim-route';
	routeId: RouteId;
	paymentColor: TrainColor;
	locomotives?: number;
	options?: ClaimOptions;
};

export type CoreAction =
	| { type: 'keep-opening-tickets'; playerId: PlayerId; ticketIds: TicketId[] }
	| { type: 'keep-tickets'; ticketIds: TicketId[] }
	| { type: 'draw-destination-tickets' }
	| { type: 'draw-face-up'; index: number }
	| { type: 'draw-train-deck' }
	| ClaimRouteAction
	| { type: 'pass' };
export type GameAction = CoreAction | MechanicAction;

export type ActionResult = { ok: true; state: GameState } | { ok: false; state: GameState; error: string };

export interface CreateGameOptions {
	mapId?: string;
	seed?: string | number;
	humanName?: string;
	botCount?: number;
	players?: Array<Pick<Player, 'id' | 'name' | 'color' | 'isBot'>>;
	startingPlayerId?: PlayerId;
}

export const DEBUG_ROUTE_ID = 'san-francisco-los-angeles-purple-b';

export function gameMap(state: Pick<GameState, 'mapId'>): GameMap {
	return getGameMap(state.mapId);
}

export function getRoute(state: Pick<GameState, 'mapId'>, routeId: RouteId): Route | undefined {
	return gameMap(state).route(routeId);
}

export function getTicket(state: Pick<GameState, 'mapId'>, ticketId: TicketId): DestinationTicket | undefined {
	return gameMap(state).ticket(ticketId);
}

export function routeScore(state: GameState, route: Route): number {
	const map = gameMap(state);
	for (const mechanic of map.mechanics) {
		const points = mechanic.routePoints?.(state, route);
		if (points !== undefined) return points;
	}
	return map.rules.routeScores[route.length] ?? route.length;
}

function emptyHand(): TrainHand {
	return Object.fromEntries(TRAIN_CARDS.map(color => [color, 0])) as TrainHand;
}

function initialRngState(seed: string): number {
	let value = 2166136261;
	for (let index = 0; index < seed.length; index += 1) {
		value ^= seed.charCodeAt(index);
		value = Math.imul(value, 16777619);
	}
	return value >>> 0 || 1;
}

function nextRandom(rngState: number): [number, number] {
	let next = (rngState + 0x6d2b79f5) >>> 0;
	let value = next;
	value = Math.imul(value ^ (value >>> 15), value | 1);
	value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
	return [((value ^ (value >>> 14)) >>> 0) / 4294967296, next];
}

function shuffle<T>(items: readonly T[], rngState: number): [T[], number] {
	const shuffled = [...items];
	let nextState = rngState;
	for (let index = shuffled.length - 1; index > 0; index -= 1) {
		const [random, advanced] = nextRandom(nextState);
		nextState = advanced;
		const swapIndex = Math.floor(random * (index + 1));
		[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
	}
	return [shuffled, nextState];
}

// Shuffles with the game's seeded generator so mechanic decks stay deterministic and replayable.
export function shuffleWithState<T>(state: GameState, items: readonly T[]): T[] {
	const [shuffled, rngState] = shuffle(items, state.rngState);
	state.rngState = rngState;
	return shuffled;
}

// Game state is plain JSON; structuredClone would reject the reactive proxies UI frameworks wrap it in.
function copy<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

// Events and actions are immutable once recorded, so the arrays are copied but not their entries.
export function cloneState(state: GameState): GameState {
	return {
		...state,
		phase: copy(state.phase),
		players: state.players.map(player => ({ ...player, hand: { ...player.hand }, tickets: [...player.tickets] })),
		trainDeck: [...state.trainDeck],
		trainDiscard: [...state.trainDiscard],
		faceUpTrainCards: [...state.faceUpTrainCards],
		destinationDeck: [...state.destinationDeck],
		openingTicketOffers: Object.fromEntries(
			Object.entries(state.openingTicketOffers).map(([playerId, ticketIds]) => [playerId, [...ticketIds]]),
		),
		claimedRoutes: { ...state.claimedRoutes },
		mechanics: copy(state.mechanics),
		events: [...state.events],
		finalRound: state.finalRound ? { ...state.finalRound } : null,
		finalResults: state.finalResults?.map(result => ({ ...result, bonuses: [...result.bonuses] })) ?? null,
		history: [...state.history],
	};
}

export function openingTicketMinimum(state: Pick<GameState, 'mapId'>, offer: readonly TicketId[]): number {
	return Math.min(gameMap(state).rules.openingTickets.keep, offer.length);
}

function createTrainDeck(map: GameMap): TrainCard[] {
	const { perColor, locomotives } = map.rules.trainDeck;
	return [
		...TRAIN_COLORS.flatMap(color => Array<TrainCard>(perColor).fill(color)),
		...Array<TrainCard>(locomotives).fill('locomotive'),
	];
}

function replenishTrainDeck(state: GameState): void {
	if (state.trainDeck.length > 0 || state.trainDiscard.length === 0) return;
	state.trainDeck = shuffleWithState(state, state.trainDiscard);
	state.trainDiscard = [];
}

export function takeTrainDeckCard(state: GameState): TrainCard | undefined {
	replenishTrainDeck(state);
	return state.trainDeck.pop();
}

function refillFaceUp(state: GameState): void {
	while (state.faceUpTrainCards.length < 5) {
		const card = takeTrainDeckCard(state);
		if (!card) break;
		state.faceUpTrainCards.push(card);
	}

	const availableNonLocomotives = () =>
		[...state.faceUpTrainCards, ...state.trainDeck, ...state.trainDiscard].filter(card => card !== 'locomotive').length;
	let redraws = 0;
	while (
		state.faceUpTrainCards.filter(card => card === 'locomotive').length >= 3 &&
		state.faceUpTrainCards.length === 5 &&
		state.trainDeck.length + state.trainDiscard.length + state.faceUpTrainCards.length >= 5 &&
		availableNonLocomotives() >= 3 &&
		redraws < 1000
	) {
		state.trainDiscard.push(...state.faceUpTrainCards);
		state.faceUpTrainCards = [];
		while (state.faceUpTrainCards.length < 5) {
			const card = takeTrainDeckCard(state);
			if (!card) break;
			state.faceUpTrainCards.push(card);
		}
		redraws += 1;
	}
}

export function canDrawTrainCards(state: GameState): boolean {
	return state.trainDeck.length > 0 || state.trainDiscard.length > 0;
}

export function hasTurnAction(state: GameState): boolean {
	const player = currentPlayer(state);
	const map = gameMap(state);
	return (
		canDrawTrainCards(state) ||
		state.destinationDeck.length > 0 ||
		map.mechanics.some(mechanic => mechanic.hasTurnAction?.(state, player)) ||
		map.routes.some(routeItem => TRAIN_COLORS.some(color => canClaimRoute(state, player.id, routeItem.id, color).ok))
	);
}

function drawDestinationIds(deck: TicketId[], count: number): TicketId[] {
	const drawn: TicketId[] = [];
	while (drawn.length < count) {
		const ticketId = deck.pop();
		if (!ticketId) break;
		drawn.push(ticketId);
	}
	return drawn;
}

export function createGame(options: CreateGameOptions = {}): GameState {
	const map = getGameMap(options.mapId ?? DEFAULT_MAP_ID);
	const seed = String(options.seed ?? 'ticket-to-ride');
	const maxPlayers = Math.max(...map.players);
	const botCount = options.botCount ?? Math.min(3, maxPlayers - 1);
	const playerCount = options.players?.length ?? botCount + 1;
	if (!options.players && (!Number.isInteger(botCount) || botCount < 1)) {
		throw new Error('botCount must be a positive integer');
	}
	if (!map.players.includes(playerCount)) {
		throw new Error(`${map.name} supports ${map.players.join(', ')} players, not ${playerCount}.`);
	}
	if (
		options.players &&
		(new Set(options.players.map(player => player.id)).size !== options.players.length ||
			new Set(options.players.map(player => player.color)).size !== options.players.length)
	) {
		throw new Error('Player IDs and colors must be unique.');
	}

	let rngState = initialRngState(seed);
	let trainDeck: TrainCard[];
	[trainDeck, rngState] = shuffle(createTrainDeck(map), rngState);
	let destinationDeck: TicketId[];
	[destinationDeck, rngState] = shuffle(
		map.tickets.filter(item => !item.long).map(item => item.id),
		rngState,
	);
	let longDeck: TicketId[] = [];
	if (map.rules.openingTickets.longDeal > 0) {
		[longDeck, rngState] = shuffle(
			map.tickets.filter(item => item.long).map(item => item.id),
			rngState,
		);
	}

	const names = ['You', 'Maya', 'Jasper', 'Nora', 'Theo'];
	const configuredPlayers =
		options.players ??
		Array.from({ length: botCount + 1 }, (_, index) => ({
			id: index === 0 ? 'player' : `bot-${index}`,
			name: index === 0 ? (options.humanName ?? names[0]!) : names[index]!,
			color: PLAYER_COLORS[index]!,
			isBot: index !== 0,
		}));
	const startingPlayerIndex = options.startingPlayerId
		? configuredPlayers.findIndex(player => player.id === options.startingPlayerId)
		: 0;
	if (startingPlayerIndex < 0) throw new Error('startingPlayerId must identify a configured player.');
	const playerSetups = [
		...configuredPlayers.slice(startingPlayerIndex),
		...configuredPlayers.slice(0, startingPlayerIndex),
	];
	const players: Player[] = playerSetups.map(player => ({
		...player,
		score: 0,
		trains: map.rules.trainsPerPlayer,
		hand: emptyHand(),
		tickets: [],
	}));

	for (let cardIndex = 0; cardIndex < map.rules.startingHand; cardIndex += 1) {
		for (const player of players) {
			const card = trainDeck.pop();
			if (card) player.hand[card] += 1;
		}
	}

	// Long tickets that are not dealt stay in the box.
	const openingTicketOffers = Object.fromEntries(
		players.map(player => [
			player.id,
			[
				...drawDestinationIds(longDeck, map.rules.openingTickets.longDeal),
				...drawDestinationIds(destinationDeck, map.rules.openingTickets.deal),
			],
		]),
	);

	const state: GameState = {
		version: 5,
		mapId: map.id,
		seed,
		rngState,
		phase: { type: 'opening-tickets' },
		players,
		currentPlayerIndex: 0,
		turnNumber: 1,
		trainDeck,
		trainDiscard: [],
		faceUpTrainCards: [],
		destinationDeck,
		openingTicketOffers,
		claimedRoutes: {},
		mechanics: {},
		events: [{ type: 'game-started', playerCount: players.length }],
		finalRound: null,
		finalResults: null,
		history: [],
	};
	refillFaceUp(state);
	for (const mechanic of map.mechanics) mechanic.setup?.(state);
	return state;
}

function fail(state: GameState, error: string): ActionResult {
	return { ok: false, state, error };
}

export function currentPlayer(state: GameState): Player {
	return state.players[state.currentPlayerIndex]!;
}

export function endTurn(state: GameState): void {
	// Discards reshuffled by later draws must also restock a market that ran short.
	refillFaceUp(state);
	const player = currentPlayer(state);
	const map = gameMap(state);
	if (state.finalRound) {
		state.finalRound.turnsRemaining -= 1;
		if (state.finalRound.turnsRemaining === 0) {
			state.turnNumber += 1;
			finalizeGame(state);
			return;
		}
	} else if (
		player.trains <= map.rules.finalRoundTrains ||
		map.mechanics.some(mechanic => mechanic.triggersFinalRound?.(state, player))
	) {
		state.finalRound = { triggeredBy: player.id, turnsRemaining: state.players.length };
		state.events.push({ type: 'final-round', playerId: player.id, turnNumber: state.turnNumber });
	}
	state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
	state.turnNumber += 1;
	state.phase = { type: 'turn', drawsTaken: 0 };
}

// Ends the turn after a second draw, a face-up locomotive or an exhausted deck; otherwise opens the second draw.
export function finishDraw(state: GameState, endsTurn = false): void {
	if (endsTurn || (state.phase.type === 'turn' && state.phase.drawsTaken === 1) || !canDrawTrainCards(state)) {
		endTurn(state);
	} else {
		state.phase = { type: 'turn', drawsTaken: 1 };
	}
}

export function hasParallelConflict(state: GameState, routeToClaim: Route, playerId: PlayerId): boolean {
	if (!routeToClaim.parallelGroup) return false;
	const map = gameMap(state);
	const owners = map.routes
		.filter(routeItem => routeItem.parallelGroup === routeToClaim.parallelGroup && routeItem.id !== routeToClaim.id)
		.flatMap(routeItem => state.claimedRoutes[routeItem.id] ?? []);
	return (
		owners.includes(playerId) || owners.length >= map.parallelLimit(routeToClaim.parallelGroup, state.players.length)
	);
}

export function claimPayment(
	route: Route,
	player: Player,
	paymentColor: TrainColor,
	locomotives?: number,
): ClaimPayment {
	const wilds = locomotives ?? Math.max(route.locomotives, route.length - player.hand[paymentColor]);
	return { color: paymentColor, cars: route.length - wilds, locomotives: wilds };
}

export function canClaimRoute(
	state: GameState,
	playerId: PlayerId,
	routeId: RouteId,
	paymentColor: TrainColor,
	locomotives?: number,
	options?: ClaimOptions,
): { ok: true } | { ok: false; error: string } {
	const player = state.players.find(item => item.id === playerId);
	if (!player) return { ok: false, error: 'Unknown player.' };
	const routeToClaim = getRoute(state, routeId);
	if (!routeToClaim) return { ok: false, error: 'Unknown route.' };
	if (state.claimedRoutes[routeId]) return { ok: false, error: 'That route is already claimed.' };
	if (hasParallelConflict(state, routeToClaim, player.id)) {
		return { ok: false, error: 'The parallel route is not available in this game.' };
	}
	if (player.trains < routeToClaim.length) return { ok: false, error: 'Not enough train pieces.' };
	if (routeToClaim.color !== 'gray' && routeToClaim.color !== paymentColor) {
		return { ok: false, error: `This route requires ${routeToClaim.color} cards.` };
	}
	const payment = claimPayment(routeToClaim, player, paymentColor, locomotives);
	if (!Number.isInteger(payment.locomotives) || payment.locomotives < 0 || payment.locomotives > routeToClaim.length) {
		return { ok: false, error: 'Invalid locomotive count.' };
	}
	if (payment.locomotives < routeToClaim.locomotives) {
		return { ok: false, error: `This ferry needs ${routeToClaim.locomotives} locomotives.` };
	}
	if (player.hand[paymentColor] < payment.cars || player.hand.locomotive < payment.locomotives) {
		return { ok: false, error: 'Not enough matching cards.' };
	}
	const claim: ClaimRouteAction = { type: 'claim-route', routeId, paymentColor, locomotives, options };
	for (const mechanic of gameMap(state).mechanics) {
		const error = mechanic.validateClaim?.(state, player, routeToClaim, claim);
		if (error) return { ok: false, error };
	}
	return { ok: true };
}

// Pays for, places and scores a validated claim on an already cloned state. The caller ends the turn.
export function completeClaim(next: GameState, claim: ClaimRouteAction, payment: ClaimPayment): void {
	const map = gameMap(next);
	const player = currentPlayer(next);
	const routeToClaim = map.route(claim.routeId)!;
	for (let count = 0; count < payment.cars; count += 1) next.trainDiscard.push(payment.color);
	for (let count = 0; count < payment.locomotives; count += 1) next.trainDiscard.push('locomotive');
	player.hand[payment.color] -= payment.cars;
	player.hand.locomotive -= payment.locomotives;
	player.trains -= routeToClaim.length;
	const points = routeScore(next, routeToClaim);
	player.score += points;
	next.claimedRoutes[routeToClaim.id] = player.id;
	next.events.push({
		type: 'claim-route',
		playerId: player.id,
		turnNumber: next.turnNumber,
		routeId: routeToClaim.id,
		paymentColor: payment.color,
		cars: payment.cars,
		locomotives: payment.locomotives,
		points,
	});
	for (const mechanic of map.mechanics) mechanic.onClaim?.(next, player, routeToClaim, claim, payment);
}

function keepOffer(
	state: GameState,
	playerId: PlayerId,
	offer: readonly TicketId[],
	minimum: number,
	keptIds: readonly TicketId[],
): ActionResult {
	const uniqueTicketIds = [...new Set(keptIds)];
	if (uniqueTicketIds.length < minimum) return fail(state, `Keep at least ${minimum} tickets.`);
	if (uniqueTicketIds.some(ticketId => !offer.includes(ticketId))) {
		return fail(state, 'A selected ticket was not offered.');
	}
	const next = cloneState(state);
	const map = gameMap(state);
	next.players.find(player => player.id === playerId)!.tickets.push(...uniqueTicketIds);
	next.destinationDeck.unshift(
		...offer.filter(ticketId => !uniqueTicketIds.includes(ticketId) && !map.ticket(ticketId)?.long),
	);
	next.events.push({
		type: 'keep-tickets',
		playerId,
		turnNumber: next.turnNumber,
		count: uniqueTicketIds.length,
		ticketIds: uniqueTicketIds,
	});
	return { ok: true, state: next };
}

type Step = 'opening' | 'turn' | 'second-draw' | 'tickets' | 'phase' | 'over';

function stepOf(state: GameState): Step {
	switch (state.phase.type) {
		case 'game-over':
			return 'over';
		case 'opening-tickets':
			return 'opening';
		case 'ticket-selection':
			return 'tickets';
		case 'turn':
			return state.phase.drawsTaken === 1 ? 'second-draw' : 'turn';
		default:
			return 'phase';
	}
}

type CoreActionDef<T extends CoreAction['type']> = {
	steps: readonly Step[];
	apply(state: GameState, action: Extract<CoreAction, { type: T }>): ActionResult;
};

const CORE_ACTIONS: { [T in CoreAction['type']]: CoreActionDef<T> } = {
	'keep-opening-tickets': {
		steps: ['opening'],
		apply(state, action) {
			const offer = state.openingTicketOffers[action.playerId];
			if (!offer) return fail(state, 'That player has no opening tickets to choose.');
			const kept = keepOffer(state, action.playerId, offer, openingTicketMinimum(state, offer), action.ticketIds);
			if (!kept.ok) return kept;
			const next = kept.state;
			delete next.openingTicketOffers[action.playerId];
			if (Object.keys(next.openingTicketOffers).length === 0) {
				next.currentPlayerIndex = 0;
				next.phase = { type: 'turn', drawsTaken: 0 };
			}
			return kept;
		},
	},
	'keep-tickets': {
		steps: ['tickets'],
		apply(state, action) {
			if (state.phase.type !== 'ticket-selection') return fail(state, 'No tickets are being selected.');
			const { playerId, ticketIds, minimum } = state.phase;
			const kept = keepOffer(state, playerId, ticketIds, minimum, action.ticketIds);
			if (kept.ok) endTurn(kept.state);
			return kept;
		},
	},
	'draw-destination-tickets': {
		steps: ['turn'],
		apply(state) {
			if (state.destinationDeck.length === 0) return fail(state, 'There are no destination tickets left.');
			const next = cloneState(state);
			const { deal, keep } = gameMap(state).rules.ticketDraw;
			const offered = drawDestinationIds(next.destinationDeck, deal);
			next.phase = {
				type: 'ticket-selection',
				playerId: currentPlayer(next).id,
				ticketIds: offered,
				minimum: Math.min(keep, offered.length),
			};
			next.events.push({
				type: 'draw-destination-tickets',
				playerId: currentPlayer(next).id,
				turnNumber: next.turnNumber,
				count: offered.length,
			});
			return { ok: true, state: next };
		},
	},
	'draw-face-up': {
		steps: ['turn', 'second-draw'],
		apply(state, action) {
			if (!canDrawTrainCards(state)) return fail(state, 'There are no train cards left to draw.');
			const card = state.faceUpTrainCards[action.index];
			if (!card) return fail(state, 'Choose an available face-up card.');
			const secondDraw = state.phase.type === 'turn' && state.phase.drawsTaken === 1;
			if (card === 'locomotive' && secondDraw) {
				return fail(state, 'A face-up locomotive can only be the first and only draw.');
			}
			const next = cloneState(state);
			const player = currentPlayer(next);
			next.faceUpTrainCards.splice(action.index, 1);
			player.hand[card] += 1;
			refillFaceUp(next);
			next.events.push({ type: 'draw-face-up', playerId: player.id, turnNumber: next.turnNumber, card });
			finishDraw(next, card === 'locomotive');
			return { ok: true, state: next };
		},
	},
	'draw-train-deck': {
		steps: ['turn', 'second-draw'],
		apply(state) {
			if (!canDrawTrainCards(state)) return fail(state, 'There are no train cards left to draw.');
			const next = cloneState(state);
			const player = currentPlayer(next);
			const card = takeTrainDeckCard(next);
			if (!card) return fail(state, 'There are no train cards left to draw.');
			player.hand[card] += 1;
			next.events.push({ type: 'draw-train-deck', playerId: player.id, turnNumber: next.turnNumber });
			finishDraw(next);
			return { ok: true, state: next };
		},
	},
	'claim-route': {
		steps: ['turn'],
		apply(state, action) {
			const player = currentPlayer(state);
			const validation = canClaimRoute(
				state,
				player.id,
				action.routeId,
				action.paymentColor,
				action.locomotives,
				action.options,
			);
			if (!validation.ok) return fail(state, validation.error);
			const payment = claimPayment(getRoute(state, action.routeId)!, player, action.paymentColor, action.locomotives);
			for (const mechanic of gameMap(state).mechanics) {
				const intercepted = mechanic.interceptClaim?.(state, action, payment);
				if (intercepted) return intercepted;
			}
			const next = cloneState(state);
			completeClaim(next, action, payment);
			if (next.phase.type === 'turn') endTurn(next);
			return { ok: true, state: next };
		},
	},
	pass: {
		steps: ['turn'],
		// The rules have no pass; it only exists so a table with nothing left to draw or claim cannot stall.
		apply(state) {
			if (hasTurnAction(state)) return fail(state, 'You still have a move available.');
			const next = cloneState(state);
			next.events.push({ type: 'pass', playerId: currentPlayer(next).id, turnNumber: next.turnNumber });
			const recent = [...next.history.slice(1 - next.players.length), { type: 'pass' }];
			if (recent.length === next.players.length && recent.every(item => item.type === 'pass')) finalizeGame(next);
			else endTurn(next);
			return { ok: true, state: next };
		},
	},
};

const TIMING_STEPS: Record<MechanicActionDef['timing'], readonly Step[]> = {
	turn: ['turn'],
	draw: ['turn', 'second-draw'],
	phase: ['phase'],
};

function actionDefinition(
	state: GameState,
	type: string,
): { steps: readonly Step[]; apply(state: GameState, action: GameAction): ActionResult } | undefined {
	if (type in CORE_ACTIONS) return CORE_ACTIONS[type as CoreAction['type']] as CoreActionDef<CoreAction['type']>;
	for (const mechanic of gameMap(state).mechanics) {
		const def = mechanic.actions?.[type];
		if (def)
			return { steps: TIMING_STEPS[def.timing], apply: def.apply as (s: GameState, a: GameAction) => ActionResult };
	}
	return undefined;
}

function disallowedActionError(step: Step, action: GameAction): string {
	if (step === 'over') return 'The game is over.';
	const keepsTickets = action.type === 'keep-tickets' || action.type === 'keep-opening-tickets';
	if (step === 'opening' || step === 'tickets') {
		return keepsTickets ? 'That ticket selection is not available.' : 'Finish selecting tickets first.';
	}
	if (keepsTickets) return 'No tickets are being selected.';
	if (step === 'phase') return 'Finish the current move first.';
	if (step === 'second-draw') {
		return action.type === 'claim-route'
			? 'A route cannot be claimed after drawing.'
			: 'Destination tickets must be the only action this turn.';
	}
	return 'That action is not available now.';
}

export function applyGameAction(state: GameState, action: GameAction): ActionResult {
	const step = stepOf(state);
	const def = actionDefinition(state, action.type);
	if (!def) return fail(state, 'That action is not available on this map.');
	if (!def.steps.includes(step)) return fail(state, disallowedActionError(step, action));
	const result = def.apply(state, action);
	if (result.ok) result.state.history.push(copy(action));
	return result;
}

const ticketIdsSchema = z.array(z.string().max(64)).max(16);
const coreActionSchemas = [
	z.object({ type: z.literal('keep-opening-tickets'), playerId: z.string().max(64), ticketIds: ticketIdsSchema }),
	z.object({ type: z.literal('keep-tickets'), ticketIds: ticketIdsSchema }),
	z.object({ type: z.literal('draw-destination-tickets') }),
	z.object({ type: z.literal('draw-face-up'), index: z.int().min(0).max(16) }),
	z.object({ type: z.literal('draw-train-deck') }),
	z.object({ type: z.literal('pass') }),
];

// Parses an untrusted action for a map. Unknown fields are stripped so they never reach the stored history.
export function parseGameAction(mapId: string, value: unknown): GameAction {
	const map = getGameMap(mapId);
	const type = typeof value === 'object' && value !== null && 'type' in value ? value.type : undefined;
	if (type === 'claim-route') {
		const options = Object.assign({}, ...map.mechanics.map(mechanic => mechanic.claimOptions ?? {}));
		return z
			.strictObject({
				type: z.literal('claim-route'),
				routeId: z.string().max(128),
				paymentColor: z.enum(TRAIN_COLORS),
				locomotives: z.int().min(0).max(32).optional(),
				options: z.object(options).optional(),
			})
			.parse(value) as GameAction;
	}
	for (const mechanic of map.mechanics) {
		const def = typeof type === 'string' ? mechanic.actions?.[type] : undefined;
		if (def) {
			const { type: _, ...payload } = value as Record<string, unknown>;
			return { ...(def.schema.parse(payload) as object), type } as GameAction;
		}
	}
	return z.union(coreActionSchemas).parse(value) as GameAction;
}

function paymentColorForRoute(player: Player, routeItem: Route): TrainColor | undefined {
	if (player.hand.locomotive < routeItem.locomotives) return undefined;
	const colors = routeItem.color === 'gray' ? TRAIN_COLORS : [routeItem.color];
	return colors
		.filter(color => player.hand[color] + player.hand.locomotive >= routeItem.length)
		.sort((left, right) => player.hand[right] - player.hand[left] || left.localeCompare(right))[0];
}

interface BotTicketPlan {
	ticketId: TicketId;
	routes: Route[];
	remainingCost: number;
}

function shortestTicketPath(state: GameState, player: Player, ticketId: TicketId): BotTicketPlan | undefined {
	const map = gameMap(state);
	const ticket = map.ticket(ticketId);
	if (!ticket) return undefined;
	const usable = new Set(ticketNetwork(state, player.id).map(routeItem => routeItem.id));
	const path = findRoutePath(map.graph, map.vertices(ticket.cityA), map.vertices(ticket.cityB), route => {
		if (usable.has(route.id)) return 0;
		if (state.claimedRoutes[route.id] || route.length > player.trains || hasParallelConflict(state, route, player.id))
			return undefined;
		return route.length;
	});
	if (!path || path.cost > player.trains) return undefined;
	return { ticketId, routes: path.steps.map(step => step.route), remainingCost: path.cost };
}

function botTicketPlans(state: GameState, player: Player): BotTicketPlan[] {
	return player.tickets
		.filter(ticketId => !isTicketComplete(state, player.id, ticketId))
		.map(ticketId => shortestTicketPath(state, player, ticketId))
		.filter((plan): plan is BotTicketPlan => plan !== undefined)
		.sort((left, right) => {
			const cost = left.remainingCost - right.remainingCost;
			if (cost !== 0) return cost;
			const points = (getTicket(state, right.ticketId)?.points ?? 0) - (getTicket(state, left.ticketId)?.points ?? 0);
			return points || left.ticketId.localeCompare(right.ticketId);
		});
}

function availableBotRoutes(state: GameState, player: Player): Route[] {
	return gameMap(state).routes.filter(
		routeItem =>
			!state.claimedRoutes[routeItem.id] &&
			player.trains >= routeItem.length &&
			!hasParallelConflict(state, routeItem, player.id),
	);
}

function claimableBotAction(state: GameState, player: Player, routes: Route[]): GameAction | undefined {
	const choice = routes
		.map(routeItem => ({ routeItem, paymentColor: paymentColorForRoute(player, routeItem) }))
		.filter(
			(candidate): candidate is { routeItem: Route; paymentColor: TrainColor } =>
				candidate.paymentColor !== undefined &&
				canClaimRoute(state, player.id, candidate.routeItem.id, candidate.paymentColor).ok,
		)
		.sort(
			(left, right) =>
				right.routeItem.length - left.routeItem.length || left.routeItem.id.localeCompare(right.routeItem.id),
		)[0];
	return choice ? { type: 'claim-route', routeId: choice.routeItem.id, paymentColor: choice.paymentColor } : undefined;
}

function usefulRouteColor(state: GameState, player: Player, routeItem: Route): TrainColor {
	if (routeItem.color !== 'gray') return routeItem.color;
	const faceUpCounts = Object.fromEntries(TRAIN_COLORS.map(color => [color, 0])) as Record<TrainColor, number>;
	for (const card of state.faceUpTrainCards) {
		if (card !== 'locomotive') faceUpCounts[card] += 1;
	}
	return [...TRAIN_COLORS].sort(
		(left, right) =>
			player.hand[right] + faceUpCounts[right] - (player.hand[left] + faceUpCounts[left]) || left.localeCompare(right),
	)[0]!;
}

function usefulFaceUpIndex(state: GameState, player: Player, routes: Route[]): number {
	if (state.phase.type !== 'turn') return -1;
	if (state.phase.drawsTaken === 0) {
		const locomotive = state.faceUpTrainCards.indexOf('locomotive');
		if (locomotive >= 0) return locomotive;
	}
	const colorScores = new Map<TrainColor, number>();
	for (const routeItem of routes) {
		const color = usefulRouteColor(state, player, routeItem);
		const missing = Math.max(1, routeItem.length - player.hand[color] - player.hand.locomotive);
		colorScores.set(color, (colorScores.get(color) ?? 0) + missing);
	}
	return (
		state.faceUpTrainCards
			.map((card, index) => ({ card, index, score: card === 'locomotive' ? 0 : (colorScores.get(card) ?? 0) }))
			.filter(candidate => candidate.score > 0)
			.sort((left, right) => right.score - left.score || left.index - right.index)[0]?.index ?? -1
	);
}

const BOT_NEW_TICKET_MIN_TRAINS = 15;

function botTicketPick(state: GameState, player: Player, offer: readonly TicketId[], minimum: number): TicketId[] {
	const midGame = player.tickets.length > 0;
	const ranked = offer
		.map(ticketId => ({
			ticketId,
			points: getTicket(state, ticketId)?.points ?? 0,
			cost: shortestTicketPath(state, player, ticketId)?.remainingCost ?? Number.POSITIVE_INFINITY,
		}))
		.sort(
			(left, right) =>
				Number(right.cost === 0) - Number(left.cost === 0) ||
				Number(Number.isFinite(right.cost)) - Number(Number.isFinite(left.cost)) ||
				(midGame ? left.cost - right.cost : right.points - left.points),
		);
	const free = ranked.filter(candidate => candidate.cost === 0).length;
	return ranked.slice(0, Math.max(minimum, free)).map(candidate => candidate.ticketId);
}

export function chooseBotAction(state: GameState): GameAction | undefined {
	if (state.phase.type === 'opening-tickets') {
		const bot = state.players.find(player => player.isBot && state.openingTicketOffers[player.id]);
		if (!bot) return undefined;
		const offer = state.openingTicketOffers[bot.id]!;
		return {
			type: 'keep-opening-tickets',
			playerId: bot.id,
			ticketIds: botTicketPick(state, bot, offer, openingTicketMinimum(state, offer)),
		};
	}
	const player = currentPlayer(state);
	if (!player.isBot || state.phase.type === 'game-over') return undefined;
	if (state.phase.type === 'ticket-selection') {
		return {
			type: 'keep-tickets',
			ticketIds: botTicketPick(state, player, state.phase.ticketIds, state.phase.minimum),
		};
	}
	for (const mechanic of gameMap(state).mechanics) {
		const action = mechanic.chooseBotAction?.(state, player);
		if (action) return action;
	}
	if (state.phase.type !== 'turn') return undefined;

	const availableRoutes = availableBotRoutes(state, player);
	const ticketPlan = botTicketPlans(state, player)[0];
	const ticketRoutes = ticketPlan?.routes.filter(routeItem => !state.claimedRoutes[routeItem.id]) ?? [];
	const strategicRoutes = ticketRoutes.length > 0 ? ticketRoutes : availableRoutes;

	if (state.phase.drawsTaken === 0) {
		const routeAction = claimableBotAction(state, player, strategicRoutes);
		if (routeAction) return routeAction;
		if (!ticketPlan && player.trains >= BOT_NEW_TICKET_MIN_TRAINS && state.destinationDeck.length > 0) {
			return { type: 'draw-destination-tickets' };
		}
	}

	if (canDrawTrainCards(state)) {
		const preferredFaceUpIndex = usefulFaceUpIndex(state, player, strategicRoutes);
		if (preferredFaceUpIndex >= 0) return { type: 'draw-face-up', index: preferredFaceUpIndex };
		return { type: 'draw-train-deck' };
	}
	if (state.phase.drawsTaken === 0) {
		const fallbackRoute = claimableBotAction(state, player, availableRoutes);
		if (fallbackRoute) return fallbackRoute;
	}
	if (state.phase.drawsTaken === 0 && state.destinationDeck.length > 0) {
		return { type: 'draw-destination-tickets' };
	}
	if (state.phase.drawsTaken === 0 && !hasTurnAction(state)) return { type: 'pass' };
	return undefined;
}

export function playBotTurns(state: GameState, maxActions = 100): GameState {
	let next = state;
	for (let actions = 0; actions < maxActions; actions += 1) {
		const action = chooseBotAction(next);
		if (!action) return next;
		const result = applyGameAction(next, action);
		if (!result.ok) return next;
		next = result.state;
	}
	return next;
}

export function createDebugClaimScenario(): GameState {
	let state = playBotTurns(createGame({ seed: 'debug-claim', humanName: 'Debug Player', botCount: 1 }));
	const offer = state.openingTicketOffers.player ?? [];
	const result = applyGameAction(state, {
		type: 'keep-opening-tickets',
		playerId: 'player',
		ticketIds: offer.slice(0, openingTicketMinimum(state, offer)),
	});
	if (result.ok) state = result.state;
	state = playBotTurns(state);
	const debugState = cloneState(state);
	debugState.players[0]!.hand = emptyHand();
	debugState.players[0]!.hand.purple = 3;
	debugState.phase = { type: 'turn', drawsTaken: 0 };
	debugState.currentPlayerIndex = 0;
	debugState.events.push({
		type: 'note',
		text: 'Debug scenario: claim San Francisco–Los Angeles with three purple cards.',
	});
	return debugState;
}

export function createDebugTicketScenario(): GameState {
	const state = createDebugClaimScenario();
	const result = applyGameAction(state, { type: 'draw-destination-tickets' });
	return result.ok ? result.state : state;
}

export function createDebugFinalRoundScenario(): GameState {
	const state = createDebugClaimScenario();
	state.finalRound = { triggeredBy: state.players[1]!.id, turnsRemaining: 1 };
	state.events.push({ type: 'note', text: 'Debug scenario: the next completed turn ends the game.' });
	return state;
}

export function createDebugFinalScenario(): GameState {
	const state = createDebugFinalRoundScenario();
	const result = applyGameAction(state, {
		type: 'claim-route',
		routeId: DEBUG_ROUTE_ID,
		paymentColor: 'purple',
	});
	return result.ok ? result.state : state;
}

// Every route a player may travel on for tickets: their own claims plus whatever mechanics lend them.
export function ticketNetwork(state: GameState, playerId: PlayerId): Route[] {
	const map = gameMap(state);
	const own = map.routes.filter(routeItem => state.claimedRoutes[routeItem.id] === playerId);
	const extra = map.mechanics.flatMap(mechanic => mechanic.ticketRoutes?.(state, playerId) ?? []);
	return extra.length ? [...new Set([...own, ...extra])] : own;
}

export function shortestTicketConnection(
	state: GameState,
	playerId: PlayerId,
	ticket: Pick<DestinationTicket, 'cityA' | 'cityB'>,
	network: readonly Route[] = ticketNetwork(state, playerId),
): { routeId: string; reverse: boolean }[] {
	const map = gameMap(state);
	const usable = new Set(network.map(routeItem => routeItem.id));
	const path = findRoutePath(map.graph, map.vertices(ticket.cityA), map.vertices(ticket.cityB), route =>
		usable.has(route.id) ? route.length : undefined,
	);
	return path?.steps.map(step => ({ routeId: step.route.id, reverse: step.reverse })) ?? [];
}

export function isTicketComplete(state: GameState, playerId: PlayerId, ticketId: TicketId): boolean {
	const ticket = getTicket(state, ticketId);
	return Boolean(ticket && shortestTicketConnection(state, playerId, ticket).length);
}

export function calculateLongestPath(state: GameState, playerId: PlayerId): number {
	const map = gameMap(state);
	const edges = map.routes.filter(routeItem => state.claimedRoutes[routeItem.id] === playerId);
	if (edges.length === 0) return 0;
	const edgeIndexById = new Map(edges.map((edge, index) => [edge.id, index]));
	const memo = new Map<string, number>();
	const visit = (vertex: string, used: bigint): number => {
		const key = `${vertex}:${used.toString(36)}`;
		const cached = memo.get(key);
		if (cached !== undefined) return cached;
		let longest = 0;
		for (const step of map.graph.get(vertex) ?? []) {
			const edgeIndex = edgeIndexById.get(step.route.id);
			if (edgeIndex === undefined) continue;
			const bit = 1n << BigInt(edgeIndex);
			if ((used & bit) !== 0n) continue;
			longest = Math.max(longest, step.route.length + visit(step.city, used | bit));
		}
		memo.set(key, longest);
		return longest;
	};
	const starts = [...map.graph].filter(([, steps]) => steps.some(step => edgeIndexById.has(step.route.id)));
	return Math.max(...starts.map(([vertex]) => visit(vertex, 0n)));
}

function finalizeGame(state: GameState): void {
	const map = gameMap(state);
	const longestPaths = new Map(state.players.map(player => [player.id, calculateLongestPath(state, player.id)]));
	const longestPath = Math.max(...longestPaths.values());
	const mechanicLines = map.mechanics.map(mechanic => mechanic.scoring?.(state) ?? {});
	const results = state.players.map(player => {
		let ticketPoints = 0;
		let completedTickets = 0;
		for (const ticketId of player.tickets) {
			const destination = map.ticket(ticketId);
			if (!destination) continue;
			if (isTicketComplete(state, player.id, ticketId)) {
				ticketPoints += destination.points;
				completedTickets += 1;
			} else {
				ticketPoints -= destination.points;
			}
		}
		const playerLongestPath = longestPaths.get(player.id) ?? 0;
		const longestRouteBonus =
			map.rules.longestPathBonus > 0 && longestPath > 0 && playerLongestPath === longestPath
				? map.rules.longestPathBonus
				: 0;
		return {
			playerId: player.id,
			routePoints: player.score,
			ticketPoints,
			completedTickets,
			longestPath: playerLongestPath,
			longestRouteBonus,
			bonuses: mechanicLines.flatMap(lines => lines[player.id] ?? []),
			finalScore: 0,
			rank: 0,
		};
	});
	if (map.rules.globetrotterBonus > 0) {
		const most = Math.max(...results.map(result => result.completedTickets));
		for (const result of results) {
			if (most > 0 && result.completedTickets === most) {
				result.bonuses.push({ id: 'globetrotter', label: 'Globetrotter', points: map.rules.globetrotterBonus });
			}
		}
	}
	for (const result of results) {
		result.finalScore =
			result.routePoints +
			result.ticketPoints +
			result.longestRouteBonus +
			result.bonuses.reduce((sum, line) => sum + line.points, 0);
		state.players.find(player => player.id === result.playerId)!.score = result.finalScore;
	}
	const compare = (left: FinalPlayerResult, right: FinalPlayerResult) =>
		right.finalScore - left.finalScore ||
		right.completedTickets - left.completedTickets ||
		right.longestRouteBonus - left.longestRouteBonus;
	results.sort(compare);
	for (const [index, result] of results.entries()) {
		const previous = results[index - 1];
		result.rank = previous && compare(previous, result) === 0 ? previous.rank : index + 1;
	}
	state.finalResults = results;
	const winnerIds = results.filter(result => result.rank === 1).map(result => result.playerId);
	state.phase = { type: 'game-over', winnerIds };
	state.events.push({ type: 'game-over', winnerIds });
}

export function restoreGameState(value: unknown): GameState {
	if (
		typeof value !== 'object' ||
		value === null ||
		!('version' in value) ||
		![1, 2, 3, 4, 5].includes(value.version as number) ||
		!('players' in value) ||
		!Array.isArray(value.players) ||
		!('phase' in value) ||
		typeof value.phase !== 'object' ||
		value.phase === null ||
		!('type' in value.phase)
	) {
		throw new Error('Invalid game state.');
	}
	const restored = copy(value) as Record<string, unknown>;
	const mapId = typeof restored.mapId === 'string' ? restored.mapId : DEFAULT_MAP_ID;
	getGameMap(mapId);
	const events: GameEvent[] = Array.isArray(restored.events)
		? restored.events
		: Array.isArray(restored.log)
			? restored.log.filter((text): text is string => typeof text === 'string').map(text => ({ type: 'note', text }))
			: [];
	delete restored.log;
	if (Array.isArray(restored.destinationDiscard) && Array.isArray(restored.destinationDeck)) {
		restored.destinationDeck.unshift(...restored.destinationDiscard);
	}
	delete restored.destinationDiscard;
	const phase = restored.phase as Record<string, unknown>;
	const players = restored.players as Player[];
	let history: GameAction[] = Array.isArray(restored.history) ? (restored.history as GameAction[]) : [];
	let openingTicketOffers =
		typeof restored.openingTicketOffers === 'object' && restored.openingTicketOffers !== null
			? (restored.openingTicketOffers as Record<PlayerId, TicketId[]>)
			: {};
	const version = restored.version as number;
	const legacyOpening =
		version < 4 &&
		phase.type === 'ticket-selection' &&
		(phase.source === 'opening' ||
			(phase.source === undefined && history.every(action => action.type === 'keep-tickets')));
	if (legacyOpening) {
		// Versions before 4 picked opening tickets one player at a time and recorded them as plain keep-tickets.
		openingTicketOffers = { ...openingTicketOffers, [String(phase.playerId)]: phase.ticketIds as TicketId[] };
		restored.phase = { type: 'opening-tickets' };
		restored.currentPlayerIndex = 0;
	} else if (phase.type === 'ticket-selection') {
		delete phase.source;
	}
	if (version < 4) {
		const firstTurnAction = history.findIndex(action => action.type !== 'keep-tickets');
		const openingKeeps = Math.min(players.length, firstTurnAction < 0 ? history.length : firstTurnAction);
		history = history.map((action, index) =>
			index < openingKeeps && action.type === 'keep-tickets'
				? { type: 'keep-opening-tickets', playerId: players[index]!.id, ticketIds: action.ticketIds }
				: action,
		);
	}
	const finalResults = (restored.finalResults as FinalPlayerResult[] | null | undefined) ?? null;
	return {
		...(restored as unknown as GameState),
		version: 5,
		mapId,
		mechanics: (restored.mechanics as MechanicStates | undefined) ?? {},
		events,
		openingTicketOffers,
		finalRound: (restored.finalRound as FinalRound | null | undefined) ?? null,
		finalResults: finalResults?.map(result => ({ ...result, bonuses: result.bonuses ?? [] })) ?? null,
		history,
	};
}

export function replayGame(options: CreateGameOptions, actions: GameAction[]): ActionResult {
	let state = createGame(options);
	for (const [index, action] of actions.entries()) {
		const result = applyGameAction(state, action);
		if (!result.ok) return fail(result.state, `Action ${index + 1}: ${result.error}`);
		state = result.state;
	}
	return { ok: true, state };
}
