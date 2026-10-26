import type { z } from 'zod';
import type { ActionResult, ClaimRouteAction, GameAction, GameState, Player, PlayerId } from '../game';
import type { MapMechanic } from '../map-schema';
import type { GameMap, Route } from '../maps/types';

/*
 * Mechanics extend the core game through module augmentation, so each one lives in its own file:
 *
 *   declare module './types' {
 *     interface MechanicStateMap { stations: { left: Record<PlayerId, number> } }
 *     interface MechanicActionMap { 'build-station': { cityId: string } }
 *     interface MechanicPhaseMap { tunnel: { routeId: string; revealed: TrainCard[] } }
 *     interface MechanicEventMap { 'build-station': { cityId: string } }
 *     interface ClaimOptions { stockCompany?: string }
 *     interface MechanicRulesMap { stations: { costs: number[] } }
 *   }
 */
export interface MechanicStateMap {}
export interface MechanicActionMap {}
export interface MechanicPhaseMap {}
export interface MechanicEventMap {}
export interface ClaimOptions {}
// Per-map settings of a mechanic, given in `MapRules.mechanics`.
export interface MechanicRulesMap {}

export type MechanicActionType = keyof MechanicActionMap & string;
export type MechanicAction = { [K in MechanicActionType]: { type: K } & MechanicActionMap[K] }[MechanicActionType];
export type MechanicPhase = {
	[K in keyof MechanicPhaseMap & string]: { type: K } & MechanicPhaseMap[K];
}[keyof MechanicPhaseMap & string];
export type MechanicEvent = {
	[K in keyof MechanicEventMap & string]: { type: K; playerId: PlayerId; turnNumber: number } & MechanicEventMap[K];
}[keyof MechanicEventMap & string];
export type MechanicStates = Partial<MechanicStateMap>;

/**
 * Where an action is legal:
 * - `turn`: as the whole turn, before anything else was taken.
 * - `draw`: wherever a train card draw is legal (first or second draw); call `finishDraw` from the action.
 * - `phase`: while one of this mechanic's own phases is active for the current player.
 */
export type ActionTiming = 'turn' | 'draw' | 'phase';

export interface MechanicActionDef<T extends MechanicActionType = MechanicActionType> {
	timing: ActionTiming;
	// Validates the client payload (everything but `type`); the server stores only what this returns, so use z.object.
	schema: z.ZodType<MechanicActionMap[T]>;
	// Must not mutate `state`. Clone with `cloneState`, then end the turn with `endTurn` or `finishDraw` when due.
	apply(state: GameState, action: { type: T } & MechanicActionMap[T]): ActionResult;
}

export function defineAction<T extends MechanicActionType>(def: MechanicActionDef<T>): MechanicActionDef {
	return def as unknown as MechanicActionDef;
}

export interface ClaimPayment {
	color: TrainColor;
	cars: number;
	locomotives: number;
}
type TrainColor = ClaimRouteAction['paymentColor'];

export interface ScoreLine {
	id: string;
	label: string;
	points: number;
	// Lines sharing a group are shown as one total in the standings, with each line as detail.
	group?: string;
}

export interface Mechanic {
	id: MapMechanic;
	// Checks a map's data when it is defined; a returned problem fails the import.
	validate?(map: GameMap): string | undefined;
	// Mutates a freshly dealt game: initial mechanic state, extra decks, hands.
	setup?(state: GameState): void;
	actions?: Readonly<Record<string, MechanicActionDef>>;
	// Extra fields accepted in `claim-route.options`, validated before the engine sees them.
	claimOptions?: z.ZodRawShape;
	validateClaim?(state: GameState, player: Player, route: Route, claim: ClaimRouteAction): string | undefined;
	// Take over a validated claim instead of completing it now, e.g. to reveal tunnel cards first.
	interceptClaim?(state: GameState, claim: ClaimRouteAction, payment: ClaimPayment): ActionResult | undefined;
	// Side effects on the cloned state after the route is claimed and scored, before the turn ends.
	onClaim?(next: GameState, player: Player, route: Route, claim: ClaimRouteAction, payment: ClaimPayment): void;
	// Points for claiming a route when they differ from the length table.
	routePoints?(state: GameState, route: Route): number | undefined;
	// Adjusts the points of one claim from its options, e.g. doubling them.
	claimPoints?(state: GameState, route: Route, options: ClaimOptions, points: number): number;
	// Train pieces a claim takes from the player when they differ from the route length.
	claimTrains?(state: GameState, route: Route): number | undefined;
	// Routes a player may use for tickets besides their own, e.g. shared track or borrowed routes.
	ticketRoutes?(state: GameState, playerId: PlayerId): readonly Route[];
	hasTurnAction?(state: GameState, player: Player): boolean;
	// A supply of this mechanic that a draw can take from, which keeps a second draw open when train cards run out.
	canDraw?(state: GameState): boolean;
	// Extra final-round trigger, checked at the end of each turn.
	triggersFinalRound?(state: GameState, player: Player): boolean;
	// Holds back the core train-count trigger while true, for maps whose end needs a second condition.
	holdsFinalRound?(state: GameState): boolean;
	// End-of-game score lines per player, added to the final score.
	scoring?(state: GameState): Record<PlayerId, ScoreLine[]>;
	// Tie breaker after completed tickets and before the longest path bonus; higher wins.
	tiebreak?(state: GameState, playerId: PlayerId): number;
	// Lets a bot hold back from a legal claim it would play badly, e.g. a tunnel without spare cards.
	botDeclinesClaim?(state: GameState, player: Player, route: Route, payment: ClaimPayment): boolean;
	// Bots try mechanics before the core strategy; must answer every mechanic phase.
	chooseBotAction?(state: GameState, player: Player): GameAction | undefined;
	// Options a bot adds to a route claim the core strategy chose.
	botClaimOptions?(state: GameState, player: Player, route: Route, claim: ClaimRouteAction): ClaimOptions | undefined;
	// Routes a bot builds toward once its tickets are done or out of reach, e.g. for an end-game bonus.
	botGoalRoutes?(state: GameState, player: Player): readonly Route[];
	// Hide private mechanic state from other viewers in multiplayer snapshots.
	redact?(state: GameState, viewerId: PlayerId): void;
	// What the player did, e.g. 'drew a terrain card'; the journal adds the player's name.
	describeEvent?(event: MechanicEvent, state: Pick<GameState, 'mapId' | 'players'>): string | undefined;
}
