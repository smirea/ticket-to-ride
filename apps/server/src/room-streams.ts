import type { RoomEvent, RoomState } from '@repo/shared';
import { projectRoomForViewer } from './room-projection';

interface Subscriber {
	controller: ReadableStreamDefaultController<Uint8Array>;
	close: () => void;
	viewerId: string;
}

const encoder = new TextEncoder();

export class RoomStreams {
	private readonly subscribers = new Map<string, Set<Subscriber>>();

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
			try {
				subscriber.controller.enqueue(
					encodeEvent({ type: 'snapshot', room: projectRoomForViewer(room, subscriber.viewerId) }),
				);
			} catch {
				this.remove(room.code, subscriber);
			}
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
