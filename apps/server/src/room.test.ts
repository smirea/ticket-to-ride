import { afterEach, describe, expect, test } from 'bun:test';
import { CLIENT_ID_HEADER, type RoomState } from '@repo/shared';
import { createRequestHandler } from './app';
import { RoomService } from './room-service';
import { RoomStore } from './room-store';
import { RoomStreams } from './room-streams';

interface TestContext {
	store: RoomStore;
	request: (method: string, path: string, clientId?: string, body?: unknown) => Promise<Response>;
}

const stores: RoomStore[] = [];

afterEach(() => {
	for (const store of stores.splice(0)) store.close();
});

function setup(): TestContext {
	const store = new RoomStore(':memory:');
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
