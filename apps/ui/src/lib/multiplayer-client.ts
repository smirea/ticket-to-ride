import {
	CLIENT_ID_HEADER,
	PLAYER_COLORS,
	type CreateRoomRequest,
	type CurrentRoomResponse,
	type GameAction,
	type JoinRoomRequest,
	type RoomDepartureResponse,
	type RoomPlayerProfile,
	type RoomResponse,
	type RoomState,
	type SetReadyRequest,
	type SubmitGameActionRequest,
	type UpdateRoomSettingsRequest,
} from '@repo/shared';

export const CLIENT_STORAGE_KEY = 'ticket-to-ride:client:v1';
export const DEBUG_ID_PARAM = 'DEBUG_ID';
const CLIENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$/;

interface StoredClient {
	clientId: string;
	profiles: Record<string, RoomPlayerProfile>;
}

export class RoomApiError extends Error {
	constructor(
		message: string,
		readonly status: number,
	) {
		super(message);
	}
}

let memoryStore: StoredClient | null = null;

export function getClientId(): string {
	const debugId = getDebugClientId();
	if (debugId) return debugId;
	const stored = readStore();
	if (stored) return stored.clientId;
	const clientId = createClientId();
	writeStore({ clientId, profiles: {} });
	return clientId;
}

export function getDebugClientId(): string | null {
	if (typeof location === 'undefined') return null;
	const value = new URLSearchParams(location.search).get(DEBUG_ID_PARAM)?.trim() ?? '';
	return CLIENT_ID_PATTERN.test(value) ? value : null;
}

export function loadPlayerProfile(): RoomPlayerProfile | null {
	const profile = readStore()?.profiles[getClientId()];
	return profile && PLAYER_COLORS.includes(profile.color) && profile.name.trim() ? profile : null;
}

export function savePlayerProfile(profile: RoomPlayerProfile): void {
	const clientId = getClientId();
	const stored = readStore() ?? { clientId: createClientId(), profiles: {} };
	stored.profiles[clientId] = { name: profile.name.trim(), color: profile.color };
	writeStore(stored);
}

export function preserveDebugId(path: string): string {
	const debugId = getDebugClientId();
	if (!debugId || typeof location === 'undefined') return path;
	const url = new URL(path, location.origin);
	url.searchParams.set(DEBUG_ID_PARAM, debugId);
	return `${url.pathname}${url.search}${url.hash}`;
}

export function roomPageUrl(code: string): string {
	return preserveDebugId(`/room/${normalizeRoomCode(code)}`);
}

export function roomEventsUrl(code: string): string {
	const query = new URLSearchParams({ clientId: getClientId() });
	return `/api/rooms/${encodeURIComponent(normalizeRoomCode(code))}/events?${query}`;
}

export function normalizeRoomCode(value: string): string {
	return value
		.toUpperCase()
		.replace(/[^A-Z2-9]/g, '')
		.slice(0, 6);
}

export async function roomApiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
	const headers = new Headers(init.headers);
	headers.set(CLIENT_ID_HEADER, getClientId());
	if (init.body !== undefined && !headers.has('content-type')) headers.set('content-type', 'application/json');
	let response: Response;
	try {
		response = await fetch(path, { ...init, headers });
	} catch {
		throw new RoomApiError('Could not reach the game server.', 0);
	}
	let body: unknown;
	try {
		body = await response.json();
	} catch {
		throw new RoomApiError(
			response.ok ? 'The server returned an invalid response.' : 'The request failed.',
			response.status,
		);
	}
	if (!response.ok || isErrorResponse(body)) {
		throw new RoomApiError(isErrorResponse(body) ? body.error : 'The request failed.', response.status);
	}
	if (!isSuccessResponse(body)) throw new RoomApiError('The server returned an invalid response.', response.status);
	return body as T;
}

export async function getCurrentRoom(): Promise<RoomState | null> {
	return (await roomApiRequest<Extract<CurrentRoomResponse, { ok: true }>>('/api/rooms/current')).room;
}

export async function getRoom(code: string): Promise<RoomState> {
	return (await roomCommand(`/api/rooms/${roomCodePath(code)}`)).room;
}

export async function createRoom(request: CreateRoomRequest): Promise<RoomState> {
	return (await roomCommand('/api/rooms', request)).room;
}

export async function joinRoom(code: string, request: JoinRoomRequest): Promise<RoomState> {
	return (await roomCommand(`/api/rooms/${roomCodePath(code)}/join`, request)).room;
}

export async function leaveRoom(code: string): Promise<RoomState | null> {
	return (
		await roomApiRequest<Extract<RoomDepartureResponse, { ok: true }>>(`/api/rooms/${roomCodePath(code)}/leave`, {
			method: 'POST',
		})
	).room;
}

export async function abandonRoom(code: string): Promise<RoomState> {
	return (await roomCommand(`/api/rooms/${roomCodePath(code)}/abandon`, {})).room;
}

export async function setRoomReady(code: string, ready: boolean): Promise<RoomState> {
	const request: SetReadyRequest = { ready };
	return (await roomCommand(`/api/rooms/${roomCodePath(code)}/ready`, request)).room;
}

export async function updateRoomSettings(code: string, request: UpdateRoomSettingsRequest): Promise<RoomState> {
	return (await roomCommand(`/api/rooms/${roomCodePath(code)}/settings`, request)).room;
}

export async function startRoom(code: string): Promise<RoomState> {
	return (await roomCommand(`/api/rooms/${roomCodePath(code)}/start`, {})).room;
}

export async function submitRoomAction(
	code: string,
	action: GameAction,
	actionId = crypto.randomUUID(),
): Promise<{ room: RoomState; acceptedActionId: string }> {
	const request: SubmitGameActionRequest = { actionId, action };
	const response = await roomCommand(`/api/rooms/${roomCodePath(code)}/actions`, request);
	return { room: response.room, acceptedActionId: response.acceptedActionId ?? actionId };
}

async function roomCommand(path: string, body?: object): Promise<Extract<RoomResponse, { ok: true }>> {
	return roomApiRequest(path, {
		method: body === undefined ? 'GET' : 'POST',
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}

function roomCodePath(code: string): string {
	return encodeURIComponent(normalizeRoomCode(code));
}

function isErrorResponse(value: unknown): value is { ok: false; error: string } {
	return (
		typeof value === 'object' &&
		value !== null &&
		'ok' in value &&
		value.ok === false &&
		'error' in value &&
		typeof value.error === 'string'
	);
}

function isSuccessResponse(value: unknown): value is { ok: true } {
	return typeof value === 'object' && value !== null && 'ok' in value && value.ok === true;
}

function createClientId(): string {
	return `web-${crypto.randomUUID()}`;
}

function readStore(): StoredClient | null {
	if (memoryStore) return memoryStore;
	if (typeof localStorage === 'undefined') return null;
	try {
		const value: unknown = JSON.parse(localStorage.getItem(CLIENT_STORAGE_KEY) ?? 'null');
		if (
			typeof value !== 'object' ||
			value === null ||
			!('clientId' in value) ||
			typeof value.clientId !== 'string' ||
			!CLIENT_ID_PATTERN.test(value.clientId) ||
			!('profiles' in value) ||
			typeof value.profiles !== 'object' ||
			value.profiles === null
		) {
			return null;
		}
		memoryStore = value as StoredClient;
		return memoryStore;
	} catch {
		return null;
	}
}

function writeStore(value: StoredClient): void {
	memoryStore = value;
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(value));
	} catch {
		return;
	}
}
