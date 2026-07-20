import type { GameAction, GameState, PlayerColor } from './game';

export const CLIENT_ID_HEADER = 'x-ticket-to-ride-client-id';

export type RoomCode = string;
export type RoomPhase = 'lobby' | 'playing' | 'finished';
export type RoomPlayerStatus = 'active' | 'abandoned' | 'left';
export type RoomFinishedReason = 'game-over' | 'abandoned';

export interface RoomPlayerProfile {
	name: string;
	color: PlayerColor;
}

export interface RoomPlayer extends RoomPlayerProfile {
	id: string;
	ready: boolean;
	status: RoomPlayerStatus;
	joinedAt: string;
}

export interface RoomSettings {
	maxPlayers: 2 | 3 | 4 | 5;
	seed: string;
}

export interface RoomState {
	version: 1;
	code: RoomCode;
	revision: number;
	phase: RoomPhase;
	hostId: string;
	players: RoomPlayer[];
	settings: RoomSettings;
	game: GameState | null;
	createdAt: string;
	updatedAt: string;
	finishedAt: string | null;
	finishedReason: RoomFinishedReason | null;
}

export interface CreateRoomRequest extends RoomPlayerProfile {
	settings?: Partial<RoomSettings>;
}

export type JoinRoomRequest = RoomPlayerProfile;

export interface SetReadyRequest {
	ready: boolean;
}

export interface UpdateRoomSettingsRequest {
	maxPlayers?: RoomSettings['maxPlayers'];
	seed?: string;
}

export interface SubmitGameActionRequest {
	actionId: string;
	action: GameAction;
}

export type RoomResponse = { ok: true; room: RoomState; acceptedActionId?: string } | { ok: false; error: string };

export type RoomDepartureResponse = { ok: true; room: RoomState | null } | { ok: false; error: string };

export type CurrentRoomResponse = { ok: true; room: RoomState | null } | { ok: false; error: string };

export type RoomEvent = { type: 'snapshot'; room: RoomState } | { type: 'closed'; code: RoomCode; revision: number };

export interface AcceptedGameAction {
	id: number;
	roomCode: RoomCode;
	actionId: string;
	playerId: string;
	action: GameAction;
	resultingRevision: number;
	acceptedAt: string;
}
