import type {
	ClaimOptions,
	DestinationTicket,
	GameAction,
	GameMap,
	GameState,
	MapMechanic,
	Player,
	Route,
} from '@repo/shared';
import type { Component } from 'svelte';
import type { BoardLayout } from '$lib/game/board/layout';
import { bulletTrainsUi } from './bullet-trains';
import { mandalasUi } from './mandalas';
import { stationsUi } from './stations';
import { tunnelsUi } from './tunnels';
import { stocksUi } from './stocks';
import { terrainCardsUi } from './terrain-cards';

type Send = (action: GameAction) => void | boolean | Promise<void | boolean>;
// Puts the board into pick mode: only `cityIds` can be chosen. Resolves with the city, or undefined if cancelled.
export type PickCity = (cityIds: readonly string[], prompt: string) => Promise<string | undefined>;
type ActionProps = { state: GameState; viewerId: string; send: Send; disabled: boolean; pickCity: PickCity };

/*
 * UI for one mechanic. GameScreen renders each part in place, so a mechanic adds components here instead of
 * editing GameScreen, GameBoard or PlayerPlaque. Every part is optional.
 */
export interface MechanicUi {
	// SVG drawn on the board above routes and cities, in board coordinates.
	BoardLayer?: Component<{ state: GameState; layout: BoardLayout; viewerId: string }>;
	// SVG drawn over routes and carriages but under cities, so city names stay readable.
	RouteLayer?: Component<{ state: GameState; layout: BoardLayout; viewerId: string }>;
	// Routes whose claimed piece the BoardLayer draws instead of the owner's carriages; asked before and after the claim.
	drawsClaim?: (state: GameState, route: Route) => boolean;
	// Shown beside the payment chooser; edits the claim's `options`.
	ClaimOptions?: Component<{
		state: GameState;
		viewerId: string;
		route: Route;
		value: ClaimOptions;
		onchange: (value: ClaimOptions) => void;
	}>;
	// Forces the payment chooser open (instead of one-click claims) so ClaimOptions can be seen.
	needsClaimChoice?: (state: GameState, viewerId: string, route: Route) => boolean;
	// The engine may answer this claim with a phase instead of claiming the route, so the claim is not animated.
	defersClaim?: (state: GameState, route: Route) => boolean;
	// Shown in the sidebar while one of this mechanic's phases is active.
	PhasePanel?: Component<ActionProps>;
	// Extra turn actions in the sidebar, next to drawing tickets.
	TurnActions?: Component<ActionProps>;
	// Always shown in the sidebar below the turn actions, e.g. the viewer's private holdings.
	SidebarPanel?: Component<{ state: GameState; viewerId: string }>;
	// A second card supply in the sidebar, enabled for both draws of the viewer's turn (`timing: 'draw'` actions).
	DrawPile?: Component<{ state: GameState; viewerId: string; send: Send; disabled: boolean }>;
	// Small additions to each player's plaque.
	PlayerBadge?: Component<{ state: GameState; player: Player }>;
	// A mark printed on one of the viewer's held tickets, e.g. a bonus it already earns.
	TicketStamp?: Component<{ state: GameState; viewerId: string; ticket: DestinationTicket }>;
	// The status line while one of this mechanic's phases is active.
	describePhase?: (state: GameState, viewerId: string) => string | undefined;
}

export const MECHANIC_UI: Partial<Record<MapMechanic, MechanicUi>> = {
	mandalas: mandalasUi,
	stations: stationsUi,
	tunnels: tunnelsUi,
	stocks: stocksUi,
	'terrain-cards': terrainCardsUi,
	'bullet-trains': bulletTrainsUi,
};

export function mechanicUis(map: GameMap): MechanicUi[] {
	return map.mechanicIds.flatMap(id => MECHANIC_UI[id] ?? []);
}
