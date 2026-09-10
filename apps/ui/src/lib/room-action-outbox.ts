import type { GameAction, RoomState, SubmitGameActionRequest } from '@repo/shared';
import { RoomApiError } from './multiplayer-client';

type ActionResponse = { room: RoomState; acceptedActionId: string };

export class RoomActionOutbox {
	private request: SubmitGameActionRequest | null;
	private running = false;
	constructor(
		private readonly transport: (request: SubmitGameActionRequest) => Promise<ActionResponse>,
		private readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
		private readonly key: string,
	) {
		const saved = storage.getItem(key);
		this.request = saved ? JSON.parse(saved) : null;
	}
	get pending(): boolean {
		return this.request !== null;
	}

	async submit(action: GameAction, expectedRevision: number): Promise<ActionResponse> {
		if (this.request) throw new Error('Your previous move is unconfirmed. Retry it before choosing another move.');
		const request = { actionId: crypto.randomUUID(), action, expectedRevision };
		this.storage.setItem(this.key, JSON.stringify(request));
		this.request = request;
		return this.retry();
	}

	async retry(): Promise<ActionResponse> {
		if (!this.request || this.running) throw new Error('No move is ready to retry.');
		this.running = true;
		const request = this.request;
		try {
			for (let attempt = 0; ; attempt++) {
				try {
					const response = await this.transport(request);
					if (response.acceptedActionId !== request.actionId) throw new Error('The server did not confirm this move.');
					this.clear();
					return response;
				} catch (error) {
					const rejected =
						error instanceof RoomApiError && error.status >= 400 && error.status < 500 && error.status !== 408;
					if (rejected) this.clear();
					if (rejected || attempt === 2) throw error;
					await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
				}
			}
		} finally {
			this.running = false;
		}
	}
	private clear() {
		this.storage.removeItem(this.key);
		this.request = null;
	}
}
