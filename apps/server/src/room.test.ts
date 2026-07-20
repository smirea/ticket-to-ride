import { afterEach, describe, expect, test } from 'bun:test';
import { existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CLIENT_ID_HEADER, chooseBotAction, type RoomState } from '@repo/shared';
import { createRequestHandler } from './app';
import { RoomService } from './room-service';
import { RoomStore } from './room-store';
import { RoomStreams } from './room-streams';

interface TestContext {
	store: RoomStore;
	request: (method: string, path: string, clientId?: string, body?: unknown) => Promise<Response>;
}

const stores: RoomStore[] = [];
const databaseFiles: string[] = [];

afterEach(() => {
	for (const store of stores.splice(0)) store.close();
	for (const filename of databaseFiles.splice(0)) {
		if (existsSync(filename)) unlinkSync(filename);
	}
});

function setup(filename = ':memory:'): TestContext {
	const store = new RoomStore(filename);
	stores.push(store);
	const service = new RoomService(store, new RoomStreams(), {
		createCode: () => 'ABC234',
		now: () => new Date('2026-07-20T12:00:00.000Z'),
	});
	const handler = createRequestHandler({ service });
	return {
		store,
		request: (method, path, clientId, body) => {
			const headers = new Headers();
			if (clientId) headers.set(CLIENT_ID_HEADER, clientId);
			if (body !== undefined) headers.set('content-type', 'application/json');
			const init: RequestInit = { method, headers };
			if (body !== undefined) init.body = JSON.stringify(body);
			return handler(new Request(`http://test.local${path}`, init));
		},
	};
}

function closeStore(store: RoomStore): void {
	store.close();
	const index = stores.indexOf(store);
	if (index >= 0) stores.splice(index, 1);
}

async function responseRoom(response: Response): Promise<RoomState> {
	const body = (await response.json()) as { ok: true; room: RoomState } | { ok: false; error: string };
	if (!body.ok) throw new Error(body.error);
	return body.room;
}

async function createTwoPlayerRoom(context: TestContext): Promise<RoomState> {
	const created = await context.request('POST', '/api/rooms', 'alice', {
		name: 'Alice',
		color: 'red',
		settings: { maxPlayers: 2, seed: 'multiplayer-test' },
	});
	expect(created.status).toBe(201);
	const room = await responseRoom(created);
	const joined = await context.request('POST', `/api/rooms/${room.code}/join`, 'bob', {
		name: 'Bob',
		color: 'blue',
	});
	expect(joined.status).toBe(200);
	return responseRoom(joined);
}

async function startTwoPlayerRoom(context: TestContext): Promise<RoomState> {
	const room = await createTwoPlayerRoom(context);
	for (const clientId of ['alice', 'bob']) {
		const ready = await context.request('POST', `/api/rooms/${room.code}/ready`, clientId, { ready: true });
		expect(ready.status).toBe(200);
	}
	const started = await context.request('POST', `/api/rooms/${room.code}/start`, 'alice');
	expect(started.status).toBe(200);
	return responseRoom(started);
}

describe('room HTTP lifecycle', () => {
	test('creates, joins, readies, starts, and reconnects to an authoritative room', async () => {
		const context = setup();
		const room = await startTwoPlayerRoom(context);

		expect(room.phase).toBe('playing');
		expect(room.players.map(player => player.id)).toEqual(['alice', 'bob']);
		expect(room.game?.players.map(player => ({ id: player.id, isBot: player.isBot }))).toEqual([
			{ id: 'alice', isBot: false },
			{ id: 'bob', isBot: false },
		]);
		expect(room.game?.phase.type).toBe('ticket-selection');

		const current = await context.request('GET', '/api/rooms/current?clientId=bob');
		expect(current.status).toBe(200);
		expect((await responseRoom(current)).code).toBe(room.code);
		expect(context.store.getCurrentRoom('bob')?.revision).toBe(room.revision);
	});

	test('clears readiness when membership or settings change', async () => {
		const context = setup();
		const created = await context.request('POST', '/api/rooms', 'alice', {
			name: 'Alice',
			color: 'red',
		});
		const room = await responseRoom(created);
		await context.request('POST', `/api/rooms/${room.code}/ready`, 'alice', { ready: true });
		const joined = await context.request('POST', `/api/rooms/${room.code}/join`, 'bob', {
			name: 'Bob',
			color: 'blue',
		});
		expect((await responseRoom(joined)).players.every(player => !player.ready)).toBe(true);

		await context.request('POST', `/api/rooms/${room.code}/ready`, 'alice', { ready: true });
		await context.request('POST', `/api/rooms/${room.code}/ready`, 'bob', { ready: true });
		const settings = await context.request('POST', `/api/rooms/${room.code}/settings`, 'alice', {
			seed: 'changed',
		});
		expect((await responseRoom(settings)).players.every(player => !player.ready)).toBe(true);
	});
});

describe('authoritative game actions', () => {
	test('enforces turn ownership and only persists accepted idempotent actions', async () => {
		const context = setup();
		const room = await startTwoPlayerRoom(context);
		if (room.game?.phase.type !== 'ticket-selection') throw new Error('Expected opening tickets.');
		const aliceTickets = room.game.phase.ticketIds.slice(0, room.game.phase.minimum);

		const outOfTurn = await context.request('POST', `/api/rooms/${room.code}/actions`, 'bob', {
			actionId: 'bob-too-early',
			action: { type: 'keep-tickets', ticketIds: aliceTickets },
		});
		expect(outOfTurn.status).toBe(409);
		expect(context.store.listAcceptedActions(room.code)).toHaveLength(0);

		const accepted = await context.request('POST', `/api/rooms/${room.code}/actions`, 'alice', {
			actionId: 'alice-opening',
			action: { type: 'keep-tickets', ticketIds: aliceTickets },
		});
		expect(accepted.status).toBe(200);
		const afterAction = await responseRoom(accepted);
		expect(afterAction.game?.players[afterAction.game.currentPlayerIndex]?.id).toBe('bob');
		expect(context.store.listAcceptedActions(room.code)).toHaveLength(1);

		const duplicate = await context.request('POST', `/api/rooms/${room.code}/actions`, 'alice', {
			actionId: 'alice-opening',
			action: { type: 'keep-tickets', ticketIds: aliceTickets },
		});
		expect(duplicate.status).toBe(200);
		expect((await responseRoom(duplicate)).revision).toBe(afterAction.revision);
		expect(context.store.listAcceptedActions(room.code)).toHaveLength(1);

		const currentRoom = context.store.getRoom(room.code);
		if (currentRoom?.game?.phase.type !== 'ticket-selection') throw new Error('Expected Bob opening tickets.');
		const invalid = await context.request('POST', `/api/rooms/${room.code}/actions`, 'bob', {
			actionId: 'bob-invalid',
			action: { type: 'keep-tickets', ticketIds: [] },
		});
		expect(invalid.status).toBe(422);
		expect(context.store.listAcceptedActions(room.code)).toHaveLength(1);
	});

	test('plays and restores a complete deterministic two-player game', async () => {
		const databasePath = join(tmpdir(), `ticket-to-ride-${crypto.randomUUID()}.sqlite`);
		databaseFiles.push(databasePath);
		const context = setup(databasePath);
		let room = await startTwoPlayerRoom(context);
		let acceptedCount = 0;

		while (room.phase === 'playing' && acceptedCount < 10_000) {
			if (!room.game) throw new Error('Expected an active game.');
			const currentPlayer = room.game.players[room.game.currentPlayerIndex]!;
			const otherPlayer = room.game.players.find(player => player.id !== currentPlayer.id)!;
			const planningState = structuredClone(room.game);
			planningState.players[planningState.currentPlayerIndex]!.isBot = true;
			const action = chooseBotAction(planningState);
			if (!action) throw new Error(`No legal action for ${currentPlayer.id}.`);
			const actionId = `game-${acceptedCount}`;
			const revisionBefore = room.revision;

			const wrongTurn = await context.request('POST', `/api/rooms/${room.code}/actions`, otherPlayer.id, {
				actionId: `wrong-${acceptedCount}`,
				action,
			});
			expect(wrongTurn.status).toBe(409);
			expect(context.store.getRoom(room.code)?.revision).toBe(revisionBefore);

			const accepted = await context.request('POST', `/api/rooms/${room.code}/actions`, currentPlayer.id, {
				actionId,
				action,
			});
			expect(accepted.status).toBe(200);
			room = await responseRoom(accepted);
			expect(room.revision).toBe(revisionBefore + 1);

			const duplicate = await context.request('POST', `/api/rooms/${room.code}/actions`, currentPlayer.id, {
				actionId,
				action,
			});
			expect(duplicate.status).toBe(200);
			expect((await responseRoom(duplicate)).revision).toBe(room.revision);
			acceptedCount += 1;
		}

		expect(acceptedCount).toBeLessThan(10_000);
		if (!room.game) throw new Error('Expected a finished game.');
		expect(room.phase).toBe('finished');
		expect(room.finishedReason).toBe('game-over');
		expect(room.game.phase.type).toBe('game-over');
		expect(room.game.finalResults).toHaveLength(2);
		const acceptedActions = context.store.listAcceptedActions(room.code);
		expect(acceptedActions).toHaveLength(acceptedCount);
		expect(acceptedActions.slice(0, 2).map(item => item.action.type)).toEqual(['keep-tickets', 'keep-tickets']);
		expect(acceptedActions.some(item => item.action.type === 'draw-train-deck')).toBe(true);
		expect(acceptedActions.some(item => item.action.type === 'claim-route')).toBe(true);
		expect(acceptedActions.map(item => item.action)).toEqual(room.game.history);
		expect(acceptedActions.at(-1)?.resultingRevision).toBe(room.revision);

		const expectedRoom = structuredClone(room);
		const expectedActions = structuredClone(acceptedActions);
		closeStore(context.store);
		const reopenedStore = new RoomStore(databasePath);
		stores.push(reopenedStore);
		const reopenedService = new RoomService(reopenedStore, new RoomStreams());

		expect(reopenedService.getRoom('alice', room.code)).toEqual(expectedRoom);
		expect(reopenedService.getCurrentRoom('bob')).toEqual(expectedRoom);
		expect(reopenedStore.listAcceptedActions(room.code)).toEqual(expectedActions);
	});
});

describe('departures and room events', () => {
	test('requires explicit abandon for a live game and retains its final snapshot', async () => {
		const context = setup();
		const room = await startTwoPlayerRoom(context);
		const leave = await context.request('POST', `/api/rooms/${room.code}/leave`, 'bob');
		expect(leave.status).toBe(409);

		const abandoned = await context.request('POST', `/api/rooms/${room.code}/abandon`, 'bob');
		expect(abandoned.status).toBe(200);
		const finished = await responseRoom(abandoned);
		expect(finished.phase).toBe('finished');
		expect(finished.finishedReason).toBe('abandoned');
		expect(context.store.getCurrentRoom('bob')).toBeNull();
		expect(context.store.getCurrentRoom('alice')?.phase).toBe('finished');

		const action = await context.request('POST', `/api/rooms/${room.code}/actions`, 'alice', {
			actionId: 'after-finish',
			action: { type: 'draw-train-deck' },
		});
		expect(action.status).toBe(409);
	});

	test('streams the initial and subsequent authoritative snapshots', async () => {
		const context = setup();
		const created = await context.request('POST', '/api/rooms', 'alice', {
			name: 'Alice',
			color: 'red',
		});
		const room = await responseRoom(created);
		const events = await context.request('GET', `/api/rooms/${room.code}/events`, 'alice');
		expect(events.headers.get('content-type')).toBe('text/event-stream');
		const reader = events.body!.getReader();
		const decoder = new TextDecoder();
		const initial = decoder.decode((await reader.read()).value);
		expect(initial).toContain('event: snapshot');
		expect(initial).toContain(`"code":"${room.code}"`);

		await context.request('POST', `/api/rooms/${room.code}/join`, 'bob', {
			name: 'Bob',
			color: 'blue',
		});
		const update = decoder.decode((await reader.read()).value);
		expect(update).toContain('"name":"Bob"');
		await reader.cancel();
	});
});
