import type { RoomEvent, RoomState } from '@repo/shared';
import { constants, createGzip } from 'node:zlib';
import { projectRoomForViewer } from './room-projection';

interface Subscriber {
	viewerId: string;
	backlog: () => number;
	write: (bytes: Uint8Array) => void;
	end: () => void;
	dispose: () => void;
}

const encoder = new TextEncoder();
const HEARTBEAT = encoder.encode(': ping\n\n');
// A subscriber this many events behind has stopped reading; it reconnects and gets a fresh snapshot.
const MAX_QUEUED_EVENTS = 8;

export class RoomStreams {
	private readonly subscribers = new Map<string, Set<Subscriber>>();
	private readonly heartbeat: ReturnType<typeof setInterval>;

	// Keeps quiet streams under the server idle timeout.
	constructor(heartbeatMs = 25_000) {
		this.heartbeat = setInterval(() => this.broadcast(() => HEARTBEAT), heartbeatMs);
		this.heartbeat.unref?.();
	}

	stop(): void {
		clearInterval(this.heartbeat);
	}

	create(room: RoomState, viewerId: string, signal: AbortSignal, gzip = false): ReadableStream<Uint8Array> {
		let subscriber: Subscriber | undefined;
		const detach = () => {
			if (!subscriber) return;
			const current = subscriber;
			subscriber = undefined;
			this.remove(room.code, current);
			current.dispose();
		};
		return new ReadableStream({
			start: controller => {
				subscriber = gzip ? gzipSubscriber(controller, viewerId, detach) : plainSubscriber(controller, viewerId);
				let roomSubscribers = this.subscribers.get(room.code);
				if (!roomSubscribers) {
					roomSubscribers = new Set();
					this.subscribers.set(room.code, roomSubscribers);
				}
				roomSubscribers.add(subscriber);
				subscriber.write(encodeEvent({ type: 'snapshot', room: projectRoomForViewer(room, viewerId) }));
				signal.addEventListener('abort', detach, { once: true });
			},
			cancel: detach,
		});
	}

	publish(room: RoomState): void {
		const subscribers = this.subscribers.get(room.code);
		if (!subscribers) return;
		for (const subscriber of subscribers) {
			this.send(room.code, subscriber, () =>
				encodeEvent({ type: 'snapshot', room: projectRoomForViewer(room, subscriber.viewerId) }),
			);
		}
	}

	close(code: string, revision: number): void {
		const subscribers = this.subscribers.get(code);
		if (!subscribers) return;
		const payload = encodeEvent({ type: 'closed', code, revision });
		for (const subscriber of subscribers) {
			try {
				subscriber.write(payload);
				subscriber.end();
			} catch {}
		}
		this.subscribers.delete(code);
	}

	// Ends a former member's stream; its reconnect is then refused, which tells that client it is out.
	disconnect(code: string, viewerId: string): void {
		for (const subscriber of this.subscribers.get(code) ?? []) {
			if (subscriber.viewerId !== viewerId) continue;
			this.remove(code, subscriber);
			try {
				subscriber.end();
			} catch {}
		}
	}

	private broadcast(payload: () => Uint8Array): void {
		for (const [code, subscribers] of this.subscribers) {
			for (const subscriber of subscribers) this.send(code, subscriber, payload);
		}
	}

	private send(code: string, subscriber: Subscriber, payload: () => Uint8Array): void {
		try {
			if (subscriber.backlog() > MAX_QUEUED_EVENTS) {
				this.remove(code, subscriber);
				subscriber.end();
				return;
			}
			subscriber.write(payload());
		} catch {
			this.remove(code, subscriber);
		}
	}

	private remove(code: string, subscriber: Subscriber): void {
		const subscribers = this.subscribers.get(code);
		if (!subscribers) return;
		subscribers.delete(subscriber);
		if (subscribers.size === 0) this.subscribers.delete(code);
	}
}

function plainSubscriber(controller: ReadableStreamDefaultController<Uint8Array>, viewerId: string): Subscriber {
	return {
		viewerId,
		backlog: () => -(controller.desiredSize ?? 0),
		write: bytes => controller.enqueue(bytes),
		end: () => controller.close(),
		dispose: () => {},
	};
}

// One gzip stream per connection, sync-flushed after every event: each event arrives immediately, and later
// snapshots compress against the earlier ones, so a repeated table costs a few dozen bytes.
// CompressionStream cannot flush mid-stream, which is why this uses node:zlib.
function gzipSubscriber(
	controller: ReadableStreamDefaultController<Uint8Array>,
	viewerId: string,
	detach: () => void,
): Subscriber {
	const gzip = createGzip();
	let pending = 0;
	gzip.on('data', (chunk: Buffer) => {
		try {
			controller.enqueue(new Uint8Array(chunk));
		} catch {
			detach();
			gzip.destroy();
		}
	});
	gzip.on('end', () => {
		try {
			controller.close();
		} catch {}
	});
	return {
		viewerId,
		backlog: () => pending - (controller.desiredSize ?? 0),
		write: bytes => {
			pending += 1;
			gzip.write(bytes);
			gzip.flush(constants.Z_SYNC_FLUSH, () => (pending -= 1));
		},
		end: () => gzip.end(),
		dispose: () => gzip.destroy(),
	};
}

function encodeEvent(event: RoomEvent): Uint8Array {
	const revision = event.type === 'snapshot' ? event.room.revision : event.revision;
	return encoder.encode(`id: ${revision}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
}
