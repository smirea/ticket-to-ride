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
import { mandalasUi } from './mandalas';

type Send = (action: GameAction) => void | boolean | Promise<void | boolean>;

/*
 * UI for one mechanic. GameScreen renders each part in place, so a mechanic adds components here instead of
 * editing GameScreen, GameBoard or PlayerPlaque. Every part is optional.
 */
export interface MechanicUi {
	// SVG drawn on the board above routes and cities, in board coordinates.
	BoardLayer?: Component<{ state: GameState; layout: BoardLayout; viewerId: string }>;
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
	// Shown in the sidebar while one of this mechanic's phases is active.
	PhasePanel?: Component<{ state: GameState; viewerId: string; send: Send; disabled: boolean }>;
	// Extra turn actions in the sidebar, next to drawing tickets.
	TurnActions?: Component<{ state: GameState; viewerId: string; send: Send; disabled: boolean }>;
	// Small additions to each player's plaque.
	PlayerBadge?: Component<{ state: GameState; player: Player }>;
	// A mark printed on one of the viewer's held tickets, e.g. a bonus it already earns.
	TicketStamp?: Component<{ state: GameState; viewerId: string; ticket: DestinationTicket }>;
	// The status line while one of this mechanic's phases is active.
	describePhase?: (state: GameState, viewerId: string) => string | undefined;
}

export const MECHANIC_UI: Partial<Record<MapMechanic, MechanicUi>> = {
	mandalas: mandalasUi,
};

export function mechanicUis(map: GameMap): MechanicUi[] {
	return map.mechanicIds.flatMap(id => MECHANIC_UI[id] ?? []);
}
