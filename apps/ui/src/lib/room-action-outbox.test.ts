import { afterEach, beforeEach, expect, test } from 'bun:test';
import type { RoomState, SubmitGameActionRequest } from '@repo/shared';
import { RoomActionOutbox } from './room-action-outbox';
import { RoomApiError } from './multiplayer-client';

const realSetTimeout = globalThis.setTimeout;
// The outbox backs off between retries; the waits are skipped so the rule runs in milliseconds.
beforeEach(() => {
	globalThis.setTimeout = ((callback: () => void) => realSetTimeout(callback, 0)) as typeof setTimeout;
});
afterEach(() => {
	globalThis.setTimeout = realSetTimeout;
});

function storage() {
	const values = new Map<string, string>();
	return {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => {
			values.set(key, value);
		},
		removeItem: (key: string) => {
			values.delete(key);
		},
	};
}

test('a move whose acknowledgment is lost is retried with the same action ID, blocks new moves, and survives a reload', async () => {
	const saved = storage();
	const requests: SubmitGameActionRequest[] = [];
	const offline = new RoomActionOutbox(
		async request => {
			requests.push(structuredClone(request));
			throw new RoomApiError('Connection lost after acceptance', 0);
		},
		saved,
		'room',
	);
	await expect(offline.submit({ type: 'draw-face-up', index: 2 }, 7)).rejects.toThrow();
	expect(offline.pending).toBe(true);
	expect(requests).toHaveLength(3);
	expect(requests.every(request => JSON.stringify(request) === JSON.stringify(requests[0]))).toBe(true);
	await expect(offline.submit({ type: 'draw-train-deck' }, 8)).rejects.toThrow('unconfirmed');
	const restored = new RoomActionOutbox(
		async request => {
			expect(request).toEqual(requests[0]!);
			return { room: { revision: 8 } as RoomState, acceptedActionId: request.actionId };
		},
		saved,
		'room',
	);
	await restored.retry();
	expect(restored.pending).toBe(false);
	expect(saved.getItem('room')).toBeNull();
});

test('a definitive rejection clears the move without retrying it', async () => {
	const saved = storage();
	let attempts = 0;
	const outbox = new RoomActionOutbox(
		async () => {
			attempts++;
			throw new RoomApiError('Stale move', 409);
		},
		saved,
		'room',
	);
	await expect(outbox.submit({ type: 'draw-train-deck' }, 7)).rejects.toThrow('Stale');
	expect(attempts).toBe(1);
	expect(outbox.pending).toBe(false);
});
