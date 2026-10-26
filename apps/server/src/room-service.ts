import { isDeepStrictEqual } from 'node:util';
import {
	DEFAULT_MAP_ID,
	PLAYER_COLORS,
	applyGameAction,
	createGame,
	findGameMap,
	parseGameAction,
	type CreateGameOptions,
	type CreateRoomRequest,
	type GameAction,
	type JoinRoomRequest,
	type RemovePlayerRequest,
	type RoomPlayer,
	type RoomSettings,
	type RoomState,
	type SetReadyRequest,
	type SubmitGameActionRequest,
	type UpdateRoomSettingsRequest,
} from '@repo/shared';
import { RoomStore } from './room-store';
import { RoomStreams } from './room-streams';

const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CLIENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$/;
const ACTION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const ROOM_CODE_PATTERN = /^[A-Z2-9]{6}$/;

export interface RoomServiceOptions {
	now?: () => Date;
	createCode?: () => string;
}

export class RoomError extends Error {
	constructor(
		message: string,
		readonly status: number,
	) {
		super(message);
	}
}

export class RoomService {
	private readonly now: () => Date;
	private readonly createCode: () => string;

	constructor(
		readonly store: RoomStore,
		readonly streams: RoomStreams,
		options: RoomServiceOptions = {},
	) {
		this.now = options.now ?? (() => new Date());
		this.createCode = options.createCode ?? randomRoomCode;
	}

	createRoom(clientId: string, request: CreateRoomRequest): RoomState {
		validateClientId(clientId);
		validateProfile(request);
		if (this.store.getCurrentRoom(clientId)) throw new RoomError('Leave your current room first.', 409);

		let code = '';
		for (let attempt = 0; attempt < 20; attempt += 1) {
			const candidate = this.createCode().toUpperCase();
			if (!ROOM_CODE_PATTERN.test(candidate)) throw new Error('Room code generator returned an invalid code.');
			if (!this.store.getRoom(candidate)) {
				code = candidate;
				break;
			}
		}
		if (!code) throw new RoomError('Could not allocate a room code.', 503);

		const settings = validateSettings({
			mapId: request.settings?.mapId ?? DEFAULT_MAP_ID,
			maxPlayers: request.settings?.maxPlayers ?? 5,
			seed: request.settings?.seed ?? crypto.randomUUID(),
		});
		const timestamp = this.timestamp();
		const room: RoomState = {
			version: 1,
			code,
			revision: 1,
			phase: 'lobby',
			hostId: clientId,
			players: [createPlayer(clientId, request, timestamp)],
			settings,
			game: null,
			createdAt: timestamp,
			updatedAt: timestamp,
			finishedAt: null,
			finishedReason: null,
		};
		this.store.createRoom(room);
		this.streams.publish(room);
		return room;
	}

	joinRoom(clientId: string, code: string, request: JoinRoomRequest): RoomState {
		validateClientId(clientId);
		validateProfile(request);
		const room = this.requireRoom(code);
		const currentRoom = this.store.getCurrentRoom(clientId);
		if (currentRoom?.code === room.code) return currentRoom;
		if (currentRoom) throw new RoomError('Leave your current room first.', 409);
		if (room.phase !== 'lobby') throw new RoomError('This game has already started.', 409);
		const activePlayers = activeRoomPlayers(room);
		if (activePlayers.length >= room.settings.maxPlayers) throw new RoomError('This room is full.', 409);
		if (activePlayers.some(player => player.color === request.color)) {
			throw new RoomError('That player color is already in use.', 409);
		}

		room.players.push(createPlayer(clientId, request, this.timestamp()));
		this.persist(room);
		return room;
	}

	leaveRoom(clientId: string, code: string): RoomState | null {
		validateClientId(clientId);
		const room = this.store.getRoom(code.toUpperCase());
		// A retried leave whose first response was lost finds the player already gone.
		const player = room?.players.find(item => item.id === clientId);
		if (!room || !player || player.status !== 'active') return null;
		if (room.phase === 'playing') throw new RoomError('Abandon the active game explicitly.', 409);

		if (room.phase === 'lobby') {
			room.players = room.players.filter(item => item.id !== clientId);
			if (room.players.length === 0) {
				this.store.deleteRoom(room.code);
				this.streams.close(room.code, room.revision + 1);
				return null;
			}
			if (room.hostId === clientId) room.hostId = room.players[0]!.id;
		} else {
			player.status = 'left';
			player.ready = false;
		}
		this.streams.disconnect(room.code, clientId);
		this.persist(room);
		return room;
	}

	removePlayer(clientId: string, code: string, request: RemovePlayerRequest): RoomState {
		validateClientId(clientId);
		const room = this.requireRoom(code);
		if (room.hostId !== clientId) throw new RoomError('Only the room host can remove players.', 403);
		if (room.phase !== 'lobby') throw new RoomError('Players can only be removed before the game starts.', 409);
		if (request.playerId === clientId) throw new RoomError('Leave the room instead.', 400);
		if (!room.players.some(player => player.id === request.playerId)) return room;
		room.players = room.players.filter(player => player.id !== request.playerId);
		this.streams.disconnect(room.code, request.playerId);
		this.persist(room);
		return room;
	}

	abandonRoom(clientId: string, code: string): RoomState {
		validateClientId(clientId);
		const room = this.requireRoom(code);
		const player = requireActivePlayer(room, clientId);
		if (room.phase !== 'playing') throw new RoomError('Only an active game can be abandoned.', 409);
		player.status = 'abandoned';
		player.ready = false;
		room.phase = 'finished';
		room.finishedAt = this.timestamp();
		room.finishedReason = 'abandoned';
		this.persist(room);
		return room;
	}

	setReady(clientId: string, code: string, request: SetReadyRequest): RoomState {
		validateClientId(clientId);
		if (typeof request.ready !== 'boolean') throw new RoomError('ready must be a boolean.', 400);
		const room = this.requireRoom(code);
		if (room.phase !== 'lobby') throw new RoomError('Readiness only applies in the lobby.', 409);
		const player = requireActivePlayer(room, clientId);
		if (player.ready === request.ready) return room;
		player.ready = request.ready;
		this.persist(room);
		return room;
	}

	updateSettings(clientId: string, code: string, request: UpdateRoomSettingsRequest): RoomState {
		validateClientId(clientId);
		const room = this.requireRoom(code);
		if (room.phase !== 'lobby') throw new RoomError('Settings cannot change after the game starts.', 409);
		if (room.hostId !== clientId) throw new RoomError('Only the room host can change settings.', 403);
		const settings = validateSettings({
			mapId: request.mapId ?? room.settings.mapId,
			maxPlayers: request.maxPlayers ?? room.settings.maxPlayers,
			seed: request.seed ?? room.settings.seed,
		});
		if (settings.maxPlayers < activeRoomPlayers(room).length) {
			throw new RoomError('maxPlayers cannot be smaller than the current player count.', 400);
		}
		if (isDeepStrictEqual(settings, room.settings)) return room;
		room.settings = settings;
		clearReadiness(room);
		this.persist(room);
		return room;
	}

	startRoom(clientId: string, code: string): RoomState {
		validateClientId(clientId);
		const room = this.requireRoom(code);
		if (room.hostId !== clientId) throw new RoomError('Only the room host can start the game.', 403);
		if (room.phase === 'playing') return room;
		if (room.phase !== 'lobby') throw new RoomError('This room has already finished.', 409);
		const players = activeRoomPlayers(room);
		if (players.length < 2) throw new RoomError('At least two players are required.', 409);
		if (players.some(player => !player.ready)) throw new RoomError('Every player must be ready.', 409);
		const map = findGameMap(room.settings.mapId)!;
		if (!map.players.includes(players.length)) {
			throw new RoomError(`${map.name} is played with ${map.players.join(', ')} players.`, 409);
		}

		const gameOptions: CreateGameOptions & {
			players: Array<Pick<RoomPlayer, 'id' | 'name' | 'color'> & { isBot: boolean }>;
		} = {
			mapId: room.settings.mapId,
			seed: room.settings.seed,
			players: players.map(player => ({
				id: player.id,
				name: player.name,
				color: player.color,
				isBot: false,
			})),
		};
		room.game = createGame(gameOptions);
		room.phase = 'playing';
		this.persist(room);
		return room;
	}

	submitGameAction(clientId: string, code: string, request: SubmitGameActionRequest): RoomState {
		validateClientId(clientId);
		if (typeof request.actionId !== 'string' || !ACTION_ID_PATTERN.test(request.actionId)) {
			throw new RoomError('actionId is invalid.', 400);
		}
		if (!Number.isSafeInteger(request.expectedRevision) || request.expectedRevision < 1) {
			throw new RoomError('expectedRevision is invalid.', 400);
		}
		const room = this.requireRoom(code);
		const action = parseAction(room.settings.mapId, request.action);
		const duplicate = this.store.getAcceptedAction(room.code, request.actionId);
		if (duplicate) {
			if (duplicate.playerId !== clientId || !isDeepStrictEqual(duplicate.action, action)) {
				throw new RoomError('actionId was already used for another move.', 409);
			}
			return room;
		}
		// Opening picks only touch the actor's own offer, so a pick made against an older revision is still valid.
		const openingPick = action.type === 'keep-opening-tickets';
		if (!openingPick && request.expectedRevision !== room.revision)
			throw new RoomError('The table changed. Choose your move again.', 409);
		if (room.phase !== 'playing' || !room.game) throw new RoomError('The room is not in an active game.', 409);
		requireActivePlayer(room, clientId);
		if (action.type === 'keep-opening-tickets') {
			if (action.playerId !== clientId) throw new RoomError('You can only choose your own tickets.', 403);
		} else if (room.game.players[room.game.currentPlayerIndex]?.id !== clientId) {
			throw new RoomError('It is not your turn.', 409);
		}

		const result = applyGameAction(room.game, action);
		if (!result.ok) throw new RoomError(result.error, 422);
		room.game = result.state;
		if (room.game.phase.type === 'game-over') {
			room.phase = 'finished';
			room.finishedAt = this.timestamp();
			room.finishedReason = 'game-over';
		}
		const acceptedAt = this.timestamp();
		this.bump(room, acceptedAt);
		this.store.saveRoom(room, { playerId: clientId, actionId: request.actionId, action, acceptedAt });
		this.streams.publish(room);
		return room;
	}

	getRoom(clientId: string, code: string): RoomState {
		validateClientId(clientId);
		const room = this.requireRoom(code);
		requireActivePlayer(room, clientId);
		return room;
	}

	getCurrentRoom(clientId: string): RoomState | null {
		validateClientId(clientId);
		return this.store.getCurrentRoom(clientId);
	}

	private requireRoom(code: string): RoomState {
		const normalized = code.toUpperCase();
		if (!ROOM_CODE_PATTERN.test(normalized)) throw new RoomError('Room not found.', 404);
		const room = this.store.getRoom(normalized);
		if (!room) throw new RoomError('Room not found.', 404);
		return room;
	}

	private persist(room: RoomState): void {
		this.bump(room);
		this.store.saveRoom(room);
		this.streams.publish(room);
	}

	private bump(room: RoomState, timestamp = this.timestamp()): void {
		room.revision += 1;
		room.updatedAt = timestamp;
	}

	private timestamp(): string {
		return this.now().toISOString();
	}
}

function validateClientId(clientId: string): void {
	if (!CLIENT_ID_PATTERN.test(clientId)) throw new RoomError('A valid client identity is required.', 400);
}

function validateProfile(profile: JoinRoomRequest): void {
	if (typeof profile.name !== 'string' || profile.name.trim().length < 1 || profile.name.trim().length > 32) {
		throw new RoomError('name must contain 1 to 32 characters.', 400);
	}
	if (!PLAYER_COLORS.includes(profile.color)) throw new RoomError('color is invalid.', 400);
}

function validateSettings(settings: RoomSettings): RoomSettings {
	const map = typeof settings.mapId === 'string' ? findGameMap(settings.mapId) : undefined;
	if (!map) throw new RoomError('mapId is invalid.', 400);
	if (![2, 3, 4, 5].includes(settings.maxPlayers)) throw new RoomError('maxPlayers must be from 2 to 5.', 400);
	if (settings.maxPlayers > Math.max(...map.players)) {
		throw new RoomError(`${map.name} seats at most ${Math.max(...map.players)} players.`, 400);
	}
	if (typeof settings.seed !== 'string' || settings.seed.trim().length < 1 || settings.seed.length > 80) {
		throw new RoomError('seed must contain 1 to 80 characters.', 400);
	}
	return { mapId: map.id, maxPlayers: settings.maxPlayers, seed: settings.seed.trim() };
}

// The parsed action is what gets stored, so extra client payload never reaches the history.
function parseAction(mapId: string, action: unknown): GameAction {
	try {
		return parseGameAction(mapId, action);
	} catch {
		throw new RoomError('action is invalid.', 400);
	}
}

function createPlayer(clientId: string, profile: RoomPlayerProfile, joinedAt: string): RoomPlayer {
	return {
		id: clientId,
		name: profile.name.trim(),
		color: profile.color,
		ready: false,
		status: 'active',
		joinedAt,
	};
}

type RoomPlayerProfile = Pick<RoomPlayer, 'name' | 'color'>;

function requirePlayer(room: RoomState, clientId: string): RoomPlayer {
	const player = room.players.find(item => item.id === clientId);
	if (!player) throw new RoomError('You are not a member of this room.', 403);
	return player;
}

function requireActivePlayer(room: RoomState, clientId: string): RoomPlayer {
	const player = requirePlayer(room, clientId);
	if (player.status !== 'active') throw new RoomError('You are no longer active in this room.', 409);
	return player;
}

function activeRoomPlayers(room: RoomState): RoomPlayer[] {
	return room.players.filter(player => player.status === 'active');
}

function clearReadiness(room: RoomState): void {
	for (const player of room.players) player.ready = false;
}

function randomRoomCode(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(6));
	return Array.from(bytes, byte => ROOM_ALPHABET[byte % ROOM_ALPHABET.length]).join('');
}
