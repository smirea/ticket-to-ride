import type { RoomEvent, RoomState } from '@repo/shared';
import { projectRoomForViewer } from './room-projection';

interface Subscriber {
	controller: ReadableStreamDefaultController<Uint8Array>;
	close: () => void;
	viewerId: string;
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

	create(room: RoomState, viewerId: string, signal: AbortSignal): ReadableStream<Uint8Array> {
		let subscriber: Subscriber | undefined;
		return new ReadableStream({
			start: controller => {
				const close = () => {
					if (!subscriber) return;
					this.remove(room.code, subscriber);
					subscriber = undefined;
				};
				subscriber = { controller, close, viewerId };
				let roomSubscribers = this.subscribers.get(room.code);
				if (!roomSubscribers) {
					roomSubscribers = new Set();
					this.subscribers.set(room.code, roomSubscribers);
				}
				roomSubscribers.add(subscriber);
				controller.enqueue(encodeEvent({ type: 'snapshot', room: projectRoomForViewer(room, viewerId) }));
				signal.addEventListener('abort', close, { once: true });
			},
			cancel: () => subscriber?.close(),
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

	// Ends a former member's stream; its reconnect is then refused, which tells that client it is out.
	disconnect(code: string, viewerId: string): void {
		for (const subscriber of this.subscribers.get(code) ?? []) {
			if (subscriber.viewerId !== viewerId) continue;
			this.remove(code, subscriber);
			try {
				subscriber.controller.close();
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
			if ((subscriber.controller.desiredSize ?? 0) < -MAX_QUEUED_EVENTS) {
				this.remove(code, subscriber);
				subscriber.controller.close();
				return;
			}
			subscriber.controller.enqueue(payload());
		} catch {
			this.remove(code, subscriber);
		}
	}

	close(code: string, revision: number): void {
		const subscribers = this.subscribers.get(code);
		if (!subscribers) return;
		const payload = encodeEvent({ type: 'closed', code, revision });
		for (const subscriber of subscribers) {
			try {
				subscriber.controller.enqueue(payload);
				subscriber.controller.close();
			} catch {}
		}
		this.subscribers.delete(code);
	}

	private remove(code: string, subscriber: Subscriber): void {
		const subscribers = this.subscribers.get(code);
		if (!subscribers) return;
		subscribers.delete(subscriber);
		if (subscribers.size === 0) this.subscribers.delete(code);
	}
}

function encodeEvent(event: RoomEvent): Uint8Array {
	const revision = event.type === 'snapshot' ? event.room.revision : event.revision;
	return encoder.encode(`id: ${revision}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
}
