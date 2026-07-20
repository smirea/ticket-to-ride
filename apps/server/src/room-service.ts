import {
	PLAYER_COLORS,
	TRAIN_COLORS,
	applyGameAction,
	createGame,
	type CreateGameOptions,
	type CreateRoomRequest,
	type GameAction,
	type JoinRoomRequest,
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
			maxPlayers: request.settings?.maxPlayers ?? 5,
			seed: request.settings?.seed ?? `room-${code}`,
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
		clearReadiness(room);
		this.persist(room);
		return room;
	}

	leaveRoom(clientId: string, code: string): RoomState | null {
		validateClientId(clientId);
		const room = this.requireRoom(code);
		const player = requirePlayer(room, clientId);
		if (player.status !== 'active') return room;
		if (room.phase === 'playing') throw new RoomError('Abandon the active game explicitly.', 409);

		if (room.phase === 'lobby') {
			room.players = room.players.filter(item => item.id !== clientId);
			if (room.players.length === 0) {
				this.store.deleteRoom(room.code);
				this.streams.close(room.code, room.revision + 1);
				return null;
			}
			if (room.hostId === clientId) room.hostId = room.players[0]!.id;
			clearReadiness(room);
		} else {
			player.status = 'left';
			player.ready = false;
		}
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
			maxPlayers: request.maxPlayers ?? room.settings.maxPlayers,
			seed: request.seed ?? room.settings.seed,
		});
		if (settings.maxPlayers < activeRoomPlayers(room).length) {
			throw new RoomError('maxPlayers cannot be smaller than the current player count.', 400);
		}
		room.settings = settings;
		clearReadiness(room);
		this.persist(room);
		return room;
	}

	startRoom(clientId: string, code: string): RoomState {
		validateClientId(clientId);
		const room = this.requireRoom(code);
		if (room.phase !== 'lobby') throw new RoomError('This room has already started.', 409);
		if (room.hostId !== clientId) throw new RoomError('Only the room host can start the game.', 403);
		const players = activeRoomPlayers(room);
		if (players.length < 2) throw new RoomError('At least two players are required.', 409);
		if (players.some(player => !player.ready)) throw new RoomError('Every player must be ready.', 409);

		const gameOptions: CreateGameOptions & {
			players: Array<Pick<RoomPlayer, 'id' | 'name' | 'color'> & { isBot: boolean }>;
		} = {
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
		validateGameAction(request.action);
		const room = this.requireRoom(code);
		const duplicate = this.store.getAcceptedAction(room.code, request.actionId);
		if (duplicate) {
			if (duplicate.playerId !== clientId) throw new RoomError('actionId was already used.', 409);
			return room;
		}
		if (room.phase !== 'playing' || !room.game) throw new RoomError('The room is not in an active game.', 409);
		requireActivePlayer(room, clientId);
		const currentPlayer = room.game.players[room.game.currentPlayerIndex];
		if (!currentPlayer || currentPlayer.id !== clientId) throw new RoomError('It is not your turn.', 409);

		const result = applyGameAction(room.game, request.action);
		if (!result.ok) throw new RoomError(result.error, 422);
		room.game = result.state;
		if (room.game.phase.type === 'game-over') {
			room.phase = 'finished';
			room.finishedAt = this.timestamp();
			room.finishedReason = 'game-over';
		}
		const acceptedAt = this.timestamp();
		this.bump(room, acceptedAt);
		this.store.saveRoom(room, { playerId: clientId, request, acceptedAt });
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
	if (![2, 3, 4, 5].includes(settings.maxPlayers)) throw new RoomError('maxPlayers must be from 2 to 5.', 400);
	if (typeof settings.seed !== 'string' || settings.seed.trim().length < 1 || settings.seed.length > 80) {
		throw new RoomError('seed must contain 1 to 80 characters.', 400);
	}
	return { maxPlayers: settings.maxPlayers, seed: settings.seed.trim() };
}

function validateGameAction(action: GameAction): void {
	if (!action || typeof action !== 'object' || typeof action.type !== 'string') {
		throw new RoomError('action is invalid.', 400);
	}
	if (action.type === 'keep-tickets') {
		if (!Array.isArray(action.ticketIds) || action.ticketIds.some(ticketId => typeof ticketId !== 'string')) {
			throw new RoomError('ticketIds is invalid.', 400);
		}
		return;
	}
	if (action.type === 'draw-destination-tickets' || action.type === 'draw-train-deck') return;
	if (action.type === 'draw-face-up') {
		if (!Number.isInteger(action.index) || action.index < 0) throw new RoomError('index is invalid.', 400);
		return;
	}
	if (action.type === 'claim-route') {
		if (typeof action.routeId !== 'string' || !TRAIN_COLORS.includes(action.paymentColor)) {
			throw new RoomError('route claim is invalid.', 400);
		}
		return;
	}
	throw new RoomError('action type is invalid.', 400);
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
