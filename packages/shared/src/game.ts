export const TRAIN_COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'black', 'white'] as const;

export const TRAIN_CARDS = [...TRAIN_COLORS, 'locomotive'] as const;
export const PLAYER_COLORS = ['red', 'blue', 'green', 'yellow', 'black'] as const;

export type TrainColor = (typeof TRAIN_COLORS)[number];
export type TrainCard = (typeof TRAIN_CARDS)[number];
export type PlayerColor = (typeof PLAYER_COLORS)[number];
export type CityId = string;
export type RouteId = string;
export type TicketId = string;
export type PlayerId = string;

export interface City {
	id: CityId;
	name: string;
	x: number;
	y: number;
}

export interface Route {
	id: RouteId;
	cityA: CityId;
	cityB: CityId;
	length: number;
	color: TrainColor | 'gray';
	parallelGroup?: string;
}

export interface DestinationTicket {
	id: TicketId;
	cityA: CityId;
	cityB: CityId;
	points: number;
}

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
}

export type GamePhase =
	| {
			type: 'ticket-selection';
			playerId: PlayerId;
			ticketIds: TicketId[];
			minimum: number;
	  }
	| { type: 'turn'; drawsTaken: 0 | 1 }
	| { type: 'game-over'; winnerIds: PlayerId[] };

export interface GameState {
	version: 1;
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
	destinationDiscard: TicketId[];
	claimedRoutes: Record<RouteId, PlayerId>;
	log: string[];
}

export type GameAction =
	| { type: 'keep-tickets'; ticketIds: TicketId[] }
	| { type: 'draw-face-up'; index: number }
	| { type: 'draw-train-deck' }
	| { type: 'claim-route'; routeId: RouteId; paymentColor: TrainColor };

export type ActionResult = { ok: true; state: GameState } | { ok: false; state: GameState; error: string };

export interface CreateGameOptions {
	seed?: string | number;
	humanName?: string;
	botCount?: number;
}

export const USA_CITIES: City[] = [
	{ id: 'vancouver', name: 'Vancouver', x: 6, y: 8 },
	{ id: 'calgary', name: 'Calgary', x: 19, y: 9 },
	{ id: 'winnipeg', name: 'Winnipeg', x: 39, y: 10 },
	{ id: 'sault-ste-marie', name: 'Sault Ste. Marie', x: 62, y: 13 },
	{ id: 'montreal', name: 'Montréal', x: 82, y: 13 },
	{ id: 'boston', name: 'Boston', x: 94, y: 21 },
	{ id: 'seattle', name: 'Seattle', x: 7, y: 20 },
	{ id: 'helena', name: 'Helena', x: 27, y: 28 },
	{ id: 'duluth', name: 'Duluth', x: 50, y: 26 },
	{ id: 'toronto', name: 'Toronto', x: 72, y: 27 },
	{ id: 'new-york', name: 'New York', x: 90, y: 34 },
	{ id: 'portland', name: 'Portland', x: 6, y: 31 },
	{ id: 'omaha', name: 'Omaha', x: 47, y: 43 },
	{ id: 'chicago', name: 'Chicago', x: 62, y: 40 },
	{ id: 'pittsburgh', name: 'Pittsburgh', x: 78, y: 41 },
	{ id: 'salt-lake-city', name: 'Salt Lake City', x: 27, y: 48 },
	{ id: 'denver', name: 'Denver', x: 40, y: 51 },
	{ id: 'kansas-city', name: 'Kansas City', x: 51, y: 55 },
	{ id: 'saint-louis', name: 'Saint Louis', x: 63, y: 55 },
	{ id: 'washington', name: 'Washington', x: 84, y: 52 },
	{ id: 'san-francisco', name: 'San Francisco', x: 8, y: 55 },
	{ id: 'las-vegas', name: 'Las Vegas', x: 19, y: 64 },
	{ id: 'santa-fe', name: 'Santa Fe', x: 36, y: 65 },
	{ id: 'oklahoma-city', name: 'Oklahoma City', x: 49, y: 66 },
	{ id: 'little-rock', name: 'Little Rock', x: 61, y: 67 },
	{ id: 'nashville', name: 'Nashville', x: 70, y: 62 },
	{ id: 'raleigh', name: 'Raleigh', x: 81, y: 64 },
	{ id: 'charleston', name: 'Charleston', x: 85, y: 73 },
	{ id: 'los-angeles', name: 'Los Angeles', x: 12, y: 75 },
	{ id: 'phoenix', name: 'Phoenix', x: 26, y: 75 },
	{ id: 'el-paso', name: 'El Paso', x: 37, y: 82 },
	{ id: 'dallas', name: 'Dallas', x: 52, y: 77 },
	{ id: 'atlanta', name: 'Atlanta', x: 74, y: 73 },
	{ id: 'new-orleans', name: 'New Orleans', x: 62, y: 86 },
	{ id: 'houston', name: 'Houston', x: 52, y: 88 },
	{ id: 'miami', name: 'Miami', x: 87, y: 93 },
];

function route(cityA: CityId, cityB: CityId, length: number, color: Route['color'], variant?: 'a' | 'b'): Route {
	const pair = `${cityA}-${cityB}`;
	return {
		id: `${pair}-${color}${variant ? `-${variant}` : ''}`,
		cityA,
		cityB,
		length,
		color,
		...(variant ? { parallelGroup: pair } : {}),
	};
}

export const USA_ROUTES: Route[] = [
	route('vancouver', 'seattle', 1, 'gray', 'a'),
	route('vancouver', 'seattle', 1, 'gray', 'b'),
	route('vancouver', 'calgary', 3, 'gray'),
	route('seattle', 'calgary', 4, 'gray'),
	route('seattle', 'portland', 1, 'gray', 'a'),
	route('seattle', 'portland', 1, 'gray', 'b'),
	route('seattle', 'helena', 6, 'yellow'),
	route('portland', 'salt-lake-city', 6, 'blue'),
	route('portland', 'san-francisco', 5, 'green', 'a'),
	route('portland', 'san-francisco', 5, 'purple', 'b'),
	route('calgary', 'helena', 4, 'gray'),
	route('calgary', 'winnipeg', 6, 'white'),
	route('winnipeg', 'helena', 4, 'blue'),
	route('winnipeg', 'duluth', 4, 'black'),
	route('winnipeg', 'sault-ste-marie', 6, 'gray'),
	route('sault-ste-marie', 'duluth', 3, 'gray'),
	route('sault-ste-marie', 'toronto', 2, 'gray'),
	route('sault-ste-marie', 'montreal', 5, 'black'),
	route('montreal', 'toronto', 3, 'gray'),
	route('montreal', 'new-york', 3, 'blue'),
	route('montreal', 'boston', 2, 'gray', 'a'),
	route('montreal', 'boston', 2, 'gray', 'b'),
	route('boston', 'new-york', 2, 'yellow', 'a'),
	route('boston', 'new-york', 2, 'red', 'b'),
	route('helena', 'duluth', 6, 'orange'),
	route('helena', 'omaha', 5, 'red'),
	route('helena', 'denver', 4, 'green'),
	route('helena', 'salt-lake-city', 3, 'purple'),
	route('duluth', 'toronto', 6, 'purple'),
	route('duluth', 'chicago', 3, 'red'),
	route('duluth', 'omaha', 2, 'gray', 'a'),
	route('duluth', 'omaha', 2, 'gray', 'b'),
	route('toronto', 'chicago', 4, 'white'),
	route('toronto', 'pittsburgh', 2, 'gray'),
	route('new-york', 'pittsburgh', 2, 'white', 'a'),
	route('new-york', 'pittsburgh', 2, 'green', 'b'),
	route('new-york', 'washington', 2, 'orange', 'a'),
	route('new-york', 'washington', 2, 'black', 'b'),
	route('san-francisco', 'salt-lake-city', 5, 'orange', 'a'),
	route('san-francisco', 'salt-lake-city', 5, 'white', 'b'),
	route('san-francisco', 'los-angeles', 3, 'yellow', 'a'),
	route('san-francisco', 'los-angeles', 3, 'purple', 'b'),
	route('salt-lake-city', 'las-vegas', 3, 'orange'),
	route('salt-lake-city', 'denver', 3, 'orange', 'a'),
	route('salt-lake-city', 'denver', 3, 'red', 'b'),
	route('las-vegas', 'los-angeles', 2, 'gray'),
	route('los-angeles', 'phoenix', 3, 'gray'),
	route('los-angeles', 'el-paso', 6, 'black'),
	route('phoenix', 'denver', 5, 'white'),
	route('phoenix', 'santa-fe', 3, 'gray'),
	route('phoenix', 'el-paso', 3, 'gray'),
	route('denver', 'santa-fe', 2, 'gray'),
	route('denver', 'oklahoma-city', 4, 'red'),
	route('denver', 'kansas-city', 4, 'black', 'a'),
	route('denver', 'kansas-city', 4, 'orange', 'b'),
	route('denver', 'omaha', 4, 'purple'),
	route('omaha', 'chicago', 4, 'blue'),
	route('omaha', 'kansas-city', 1, 'gray', 'a'),
	route('omaha', 'kansas-city', 1, 'gray', 'b'),
	route('chicago', 'pittsburgh', 3, 'orange', 'a'),
	route('chicago', 'pittsburgh', 3, 'black', 'b'),
	route('chicago', 'saint-louis', 2, 'green', 'a'),
	route('chicago', 'saint-louis', 2, 'white', 'b'),
	route('pittsburgh', 'saint-louis', 5, 'green'),
	route('pittsburgh', 'nashville', 4, 'yellow'),
	route('pittsburgh', 'raleigh', 2, 'gray'),
	route('pittsburgh', 'washington', 2, 'gray'),
	route('washington', 'raleigh', 2, 'gray', 'a'),
	route('washington', 'raleigh', 2, 'gray', 'b'),
	route('kansas-city', 'saint-louis', 2, 'blue', 'a'),
	route('kansas-city', 'saint-louis', 2, 'purple', 'b'),
	route('kansas-city', 'oklahoma-city', 2, 'gray', 'a'),
	route('kansas-city', 'oklahoma-city', 2, 'gray', 'b'),
	route('saint-louis', 'little-rock', 2, 'gray'),
	route('saint-louis', 'nashville', 2, 'gray'),
	route('oklahoma-city', 'santa-fe', 3, 'blue'),
	route('oklahoma-city', 'el-paso', 5, 'yellow'),
	route('oklahoma-city', 'dallas', 2, 'gray', 'a'),
	route('oklahoma-city', 'dallas', 2, 'gray', 'b'),
	route('oklahoma-city', 'little-rock', 2, 'gray'),
	route('santa-fe', 'el-paso', 2, 'gray'),
	route('el-paso', 'dallas', 4, 'red'),
	route('el-paso', 'houston', 6, 'green'),
	route('dallas', 'houston', 1, 'gray', 'a'),
	route('dallas', 'houston', 1, 'gray', 'b'),
	route('dallas', 'little-rock', 2, 'gray'),
	route('houston', 'new-orleans', 2, 'gray'),
	route('little-rock', 'new-orleans', 3, 'green'),
	route('little-rock', 'nashville', 3, 'white'),
	route('nashville', 'raleigh', 3, 'black'),
	route('nashville', 'atlanta', 1, 'gray'),
	route('raleigh', 'atlanta', 2, 'gray', 'a'),
	route('raleigh', 'atlanta', 2, 'gray', 'b'),
	route('raleigh', 'charleston', 2, 'gray'),
	route('charleston', 'atlanta', 2, 'gray'),
	route('new-orleans', 'atlanta', 4, 'yellow', 'a'),
	route('new-orleans', 'atlanta', 4, 'orange', 'b'),
	route('new-orleans', 'miami', 6, 'red'),
	route('atlanta', 'miami', 5, 'blue'),
	route('charleston', 'miami', 4, 'purple'),
];

function ticket(cityA: CityId, cityB: CityId, points: number): DestinationTicket {
	return { id: `${cityA}-${cityB}`, cityA, cityB, points };
}

export const USA_TICKETS: DestinationTicket[] = [
	ticket('seattle', 'new-york', 22),
	ticket('los-angeles', 'new-york', 21),
	ticket('los-angeles', 'miami', 20),
	ticket('vancouver', 'montreal', 20),
	ticket('san-francisco', 'atlanta', 17),
	ticket('portland', 'nashville', 17),
	ticket('los-angeles', 'chicago', 16),
	ticket('montreal', 'new-orleans', 13),
	ticket('calgary', 'phoenix', 13),
	ticket('vancouver', 'santa-fe', 13),
	ticket('boston', 'miami', 12),
	ticket('winnipeg', 'houston', 12),
	ticket('portland', 'phoenix', 11),
	ticket('dallas', 'new-york', 11),
	ticket('denver', 'pittsburgh', 11),
	ticket('winnipeg', 'little-rock', 11),
	ticket('toronto', 'miami', 10),
	ticket('duluth', 'el-paso', 10),
	ticket('sault-ste-marie', 'oklahoma-city', 9),
	ticket('seattle', 'los-angeles', 9),
	ticket('chicago', 'santa-fe', 9),
	ticket('montreal', 'atlanta', 9),
	ticket('duluth', 'houston', 8),
	ticket('helena', 'los-angeles', 8),
	ticket('sault-ste-marie', 'nashville', 8),
	ticket('calgary', 'salt-lake-city', 7),
	ticket('chicago', 'new-orleans', 7),
	ticket('new-york', 'atlanta', 6),
	ticket('kansas-city', 'houston', 5),
	ticket('denver', 'el-paso', 4),
];

export const ROUTE_SCORES: Record<number, number> = {
	1: 1,
	2: 2,
	3: 4,
	4: 7,
	5: 10,
	6: 15,
};

export const DEBUG_ROUTE_ID = 'san-francisco-los-angeles-purple-b';

const ROUTES_BY_ID = new Map(USA_ROUTES.map(item => [item.id, item]));
const TICKETS_BY_ID = new Map(USA_TICKETS.map(item => [item.id, item]));

export function getRoute(routeId: RouteId): Route | undefined {
	return ROUTES_BY_ID.get(routeId);
}

export function getTicket(ticketId: TicketId): DestinationTicket | undefined {
	return TICKETS_BY_ID.get(ticketId);
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

function shuffle<T>(items: T[], rngState: number): [T[], number] {
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

function cloneState(state: GameState): GameState {
	return {
		...state,
		phase:
			state.phase.type === 'ticket-selection'
				? { ...state.phase, ticketIds: [...state.phase.ticketIds] }
				: state.phase.type === 'game-over'
					? { ...state.phase, winnerIds: [...state.phase.winnerIds] }
					: { ...state.phase },
		players: state.players.map(player => ({
			...player,
			hand: { ...player.hand },
			tickets: [...player.tickets],
		})),
		trainDeck: [...state.trainDeck],
		trainDiscard: [...state.trainDiscard],
		faceUpTrainCards: [...state.faceUpTrainCards],
		destinationDeck: [...state.destinationDeck],
		destinationDiscard: [...state.destinationDiscard],
		claimedRoutes: { ...state.claimedRoutes },
		log: [...state.log],
	};
}

function createTrainDeck(): TrainCard[] {
	return [
		...TRAIN_COLORS.flatMap(color => Array<TrainCard>(12).fill(color)),
		...Array<TrainCard>(14).fill('locomotive'),
	];
}

function replenishTrainDeck(state: GameState): void {
	if (state.trainDeck.length > 0 || state.trainDiscard.length === 0) return;
	const [deck, rngState] = shuffle(state.trainDiscard, state.rngState);
	state.trainDeck = deck;
	state.trainDiscard = [];
	state.rngState = rngState;
}

function takeTrainDeckCard(state: GameState): TrainCard | undefined {
	replenishTrainDeck(state);
	return state.trainDeck.pop();
}

function refillFaceUp(state: GameState): void {
	while (state.faceUpTrainCards.length < 5) {
		const card = takeTrainDeckCard(state);
		if (!card) break;
		state.faceUpTrainCards.push(card);
	}

	let redraws = 0;
	while (
		state.faceUpTrainCards.filter(card => card === 'locomotive').length >= 3 &&
		state.trainDeck.length + state.trainDiscard.length >= 5 &&
		redraws < 8
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
	const seed = String(options.seed ?? 'ticket-to-ride');
	const botCount = options.botCount ?? 3;
	if (!Number.isInteger(botCount) || botCount < 1 || botCount > 4) {
		throw new Error('botCount must be an integer from 1 to 4');
	}

	let rngState = initialRngState(seed);
	let trainDeck: TrainCard[];
	[trainDeck, rngState] = shuffle(createTrainDeck(), rngState);
	let destinationDeck: TicketId[];
	[destinationDeck, rngState] = shuffle(
		USA_TICKETS.map(item => item.id),
		rngState,
	);

	const names = ['You', 'Maya', 'Jasper', 'Nora', 'Theo'];
	const players: Player[] = Array.from({ length: botCount + 1 }, (_, index) => ({
		id: index === 0 ? 'player' : `bot-${index}`,
		name: index === 0 ? (options.humanName ?? names[0]!) : names[index]!,
		color: PLAYER_COLORS[index]!,
		isBot: index !== 0,
		score: 0,
		trains: 45,
		hand: emptyHand(),
		tickets: [],
	}));

	for (let cardIndex = 0; cardIndex < 4; cardIndex += 1) {
		for (const player of players) {
			const card = trainDeck.pop();
			if (card) player.hand[card] += 1;
		}
	}

	const humanTickets = drawDestinationIds(destinationDeck, 3);
	const destinationDiscard: TicketId[] = [];
	for (const player of players.slice(1)) {
		const offered = drawDestinationIds(destinationDeck, 3);
		player.tickets.push(...offered.slice(0, 2));
		destinationDiscard.push(...offered.slice(2));
	}

	const state: GameState = {
		version: 1,
		seed,
		rngState,
		phase: {
			type: 'ticket-selection',
			playerId: players[0]!.id,
			ticketIds: humanTickets,
			minimum: Math.min(2, humanTickets.length),
		},
		players,
		currentPlayerIndex: 0,
		turnNumber: 1,
		trainDeck,
		trainDiscard: [],
		faceUpTrainCards: [],
		destinationDeck,
		destinationDiscard,
		claimedRoutes: {},
		log: [`Game started with ${players.length} players.`],
	};
	refillFaceUp(state);
	return state;
}

function fail(state: GameState, error: string): ActionResult {
	return { ok: false, state, error };
}

function currentPlayer(state: GameState): Player {
	return state.players[state.currentPlayerIndex]!;
}

function endTurn(state: GameState): void {
	state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
	state.turnNumber += 1;
	state.phase = { type: 'turn', drawsTaken: 0 };
}

function hasParallelConflict(state: GameState, routeToClaim: Route, player: Player): boolean {
	if (!routeToClaim.parallelGroup) return false;
	const parallels = USA_ROUTES.filter(
		routeItem => routeItem.parallelGroup === routeToClaim.parallelGroup && routeItem.id !== routeToClaim.id,
	);
	return parallels.some(parallel => {
		const owner = state.claimedRoutes[parallel.id];
		return owner && (state.players.length <= 3 || owner === player.id);
	});
}

export function canClaimRoute(
	state: GameState,
	playerId: PlayerId,
	routeId: RouteId,
	paymentColor: TrainColor,
): { ok: true } | { ok: false; error: string } {
	const player = state.players.find(item => item.id === playerId);
	if (!player) return { ok: false, error: 'Unknown player.' };
	const routeToClaim = getRoute(routeId);
	if (!routeToClaim) return { ok: false, error: 'Unknown route.' };
	if (state.claimedRoutes[routeId]) return { ok: false, error: 'That route is already claimed.' };
	if (hasParallelConflict(state, routeToClaim, player)) {
		return { ok: false, error: 'The parallel route is not available in this game.' };
	}
	if (player.trains < routeToClaim.length) return { ok: false, error: 'Not enough train pieces.' };
	if (routeToClaim.color !== 'gray' && routeToClaim.color !== paymentColor) {
		return { ok: false, error: `This route requires ${routeToClaim.color} cards.` };
	}
	if (player.hand[paymentColor] + player.hand.locomotive < routeToClaim.length) {
		return { ok: false, error: 'Not enough matching cards.' };
	}
	return { ok: true };
}

export function getClaimableRoutes(state: GameState, playerId: PlayerId): Route[] {
	return USA_ROUTES.filter(routeItem =>
		TRAIN_COLORS.some(color => canClaimRoute(state, playerId, routeItem.id, color).ok),
	);
}

export function applyGameAction(state: GameState, action: GameAction): ActionResult {
	if (state.phase.type === 'game-over') return fail(state, 'The game is over.');
	const player = currentPlayer(state);

	if (action.type === 'keep-tickets') {
		if (state.phase.type !== 'ticket-selection') return fail(state, 'No tickets are being selected.');
		const selection = state.phase;
		if (selection.playerId !== player.id) return fail(state, 'It is not this player’s selection.');
		const uniqueTicketIds = [...new Set(action.ticketIds)];
		if (uniqueTicketIds.length < selection.minimum) {
			return fail(state, `Keep at least ${selection.minimum} tickets.`);
		}
		if (uniqueTicketIds.some(ticketId => !selection.ticketIds.includes(ticketId))) {
			return fail(state, 'A selected ticket was not offered.');
		}
		const next = cloneState(state);
		const nextPlayer = currentPlayer(next);
		nextPlayer.tickets.push(...uniqueTicketIds);
		const returned = selection.ticketIds.filter(ticketId => !uniqueTicketIds.includes(ticketId));
		next.destinationDiscard.push(...returned);
		next.phase = { type: 'turn', drawsTaken: 0 };
		next.log.push(`${nextPlayer.name} kept ${uniqueTicketIds.length} destination tickets.`);
		return { ok: true, state: next };
	}

	if (state.phase.type !== 'turn') return fail(state, 'Finish selecting tickets first.');

	if (action.type === 'draw-face-up') {
		const card = state.faceUpTrainCards[action.index];
		if (!card) return fail(state, 'Choose an available face-up card.');
		if (card === 'locomotive' && state.phase.drawsTaken === 1) {
			return fail(state, 'A face-up locomotive can only be the first and only draw.');
		}
		const next = cloneState(state);
		const nextPlayer = currentPlayer(next);
		const [drawn] = next.faceUpTrainCards.splice(action.index, 1);
		if (!drawn) return fail(state, 'Choose an available face-up card.');
		nextPlayer.hand[drawn] += 1;
		refillFaceUp(next);
		next.log.push(`${nextPlayer.name} drew a face-up ${drawn} card.`);
		if (drawn === 'locomotive' || state.phase.drawsTaken === 1) endTurn(next);
		else next.phase = { type: 'turn', drawsTaken: 1 };
		return { ok: true, state: next };
	}

	if (action.type === 'draw-train-deck') {
		if (state.trainDeck.length === 0 && state.trainDiscard.length === 0) {
			return fail(state, 'There are no train cards left to draw.');
		}
		const next = cloneState(state);
		const nextPlayer = currentPlayer(next);
		const card = takeTrainDeckCard(next);
		if (!card) return fail(state, 'There are no train cards left to draw.');
		nextPlayer.hand[card] += 1;
		next.log.push(`${nextPlayer.name} drew from the train deck.`);
		if (state.phase.drawsTaken === 1) endTurn(next);
		else next.phase = { type: 'turn', drawsTaken: 1 };
		return { ok: true, state: next };
	}

	if (state.phase.drawsTaken !== 0) return fail(state, 'A route cannot be claimed after drawing.');
	const validation = canClaimRoute(state, player.id, action.routeId, action.paymentColor);
	if (!validation.ok) return fail(state, validation.error);
	const routeToClaim = getRoute(action.routeId)!;
	const next = cloneState(state);
	const nextPlayer = currentPlayer(next);
	const coloredCards = Math.min(nextPlayer.hand[action.paymentColor], routeToClaim.length);
	const locomotives = routeToClaim.length - coloredCards;
	for (let count = 0; count < coloredCards; count += 1) next.trainDiscard.push(action.paymentColor);
	for (let count = 0; count < locomotives; count += 1) next.trainDiscard.push('locomotive');
	nextPlayer.hand[action.paymentColor] -= coloredCards;
	nextPlayer.hand.locomotive -= locomotives;
	nextPlayer.trains -= routeToClaim.length;
	nextPlayer.score += ROUTE_SCORES[routeToClaim.length] ?? routeToClaim.length;
	next.claimedRoutes[routeToClaim.id] = nextPlayer.id;
	const cityA = USA_CITIES.find(city => city.id === routeToClaim.cityA)?.name ?? routeToClaim.cityA;
	const cityB = USA_CITIES.find(city => city.id === routeToClaim.cityB)?.name ?? routeToClaim.cityB;
	next.log.push(`${nextPlayer.name} claimed ${cityA}–${cityB}.`);
	endTurn(next);
	return { ok: true, state: next };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
	const result = applyGameAction(state, action);
	return result.ok ? result.state : state;
}

function paymentColorForRoute(player: Player, routeItem: Route): TrainColor | undefined {
	const colors = routeItem.color === 'gray' ? TRAIN_COLORS : [routeItem.color];
	return colors
		.filter(color => player.hand[color] + player.hand.locomotive >= routeItem.length)
		.sort((left, right) => player.hand[right] - player.hand[left] || left.localeCompare(right))[0];
}

export function chooseBotAction(state: GameState): GameAction | undefined {
	if (state.phase.type !== 'turn') return undefined;
	const player = currentPlayer(state);
	if (!player.isBot) return undefined;

	if (state.phase.drawsTaken === 0) {
		const routeChoice = USA_ROUTES.filter(routeItem => !state.claimedRoutes[routeItem.id])
			.map(routeItem => ({ routeItem, paymentColor: paymentColorForRoute(player, routeItem) }))
			.filter(
				(choice): choice is { routeItem: Route; paymentColor: TrainColor } =>
					choice.paymentColor !== undefined &&
					canClaimRoute(state, player.id, choice.routeItem.id, choice.paymentColor).ok,
			)
			.sort(
				(left, right) =>
					right.routeItem.length - left.routeItem.length || left.routeItem.id.localeCompare(right.routeItem.id),
			)[0];
		if (routeChoice) {
			return {
				type: 'claim-route',
				routeId: routeChoice.routeItem.id,
				paymentColor: routeChoice.paymentColor,
			};
		}
	}

	const preferredFaceUpIndex = state.faceUpTrainCards.findIndex(
		card => card !== 'locomotive' || (state.phase.type === 'turn' && state.phase.drawsTaken === 0),
	);
	if (preferredFaceUpIndex >= 0) return { type: 'draw-face-up', index: preferredFaceUpIndex };
	if (state.trainDeck.length > 0 || state.trainDiscard.length > 0) return { type: 'draw-train-deck' };
	return undefined;
}

export function playBotTurns(state: GameState, maxActions = 100): GameState {
	let next = state;
	for (let actions = 0; actions < maxActions; actions += 1) {
		if (next.phase.type !== 'turn' || !currentPlayer(next).isBot) return next;
		const action = chooseBotAction(next);
		if (!action) return next;
		const result = applyGameAction(next, action);
		if (!result.ok) return next;
		next = result.state;
	}
	return next;
}

export function createDebugClaimScenario(): GameState {
	let state = createGame({ seed: 'debug-claim', humanName: 'Debug Player', botCount: 1 });
	if (state.phase.type === 'ticket-selection') {
		const result = applyGameAction(state, {
			type: 'keep-tickets',
			ticketIds: state.phase.ticketIds.slice(0, state.phase.minimum),
		});
		if (result.ok) state = result.state;
	}
	const debugState = cloneState(state);
	debugState.players[0]!.hand = emptyHand();
	debugState.players[0]!.hand.purple = 3;
	debugState.phase = { type: 'turn', drawsTaken: 0 };
	debugState.currentPlayerIndex = 0;
	debugState.log.push('Debug scenario: claim San Francisco–Los Angeles with three purple cards.');
	return debugState;
}

export function isTicketComplete(state: GameState, playerId: PlayerId, ticketId: TicketId): boolean {
	const destination = getTicket(ticketId);
	if (!destination) return false;
	const adjacency = new Map<CityId, CityId[]>();
	for (const routeItem of USA_ROUTES) {
		if (state.claimedRoutes[routeItem.id] !== playerId) continue;
		adjacency.set(routeItem.cityA, [...(adjacency.get(routeItem.cityA) ?? []), routeItem.cityB]);
		adjacency.set(routeItem.cityB, [...(adjacency.get(routeItem.cityB) ?? []), routeItem.cityA]);
	}
	const seen = new Set<CityId>([destination.cityA]);
	const queue = [destination.cityA];
	while (queue.length > 0) {
		const cityId = queue.shift()!;
		if (cityId === destination.cityB) return true;
		for (const neighbor of adjacency.get(cityId) ?? []) {
			if (seen.has(neighbor)) continue;
			seen.add(neighbor);
			queue.push(neighbor);
		}
	}
	return false;
}
