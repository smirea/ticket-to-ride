import type {
	CreateRoomRequest,
	JoinRoomRequest,
	SetReadyRequest,
	SubmitGameActionRequest,
	UpdateRoomSettingsRequest,
} from '@repo/shared';
import { CLIENT_ID_HEADER } from '@repo/shared';
import { RoomError, RoomService } from './room-service';

export interface AppOptions {
	service: RoomService;
	uiBuildPath?: URL;
}

export function createRequestHandler({ service, uiBuildPath }: AppOptions) {
	return async (request: Request): Promise<Response> => {
		const url = new URL(request.url);
		try {
			if (request.method === 'GET' && url.pathname === '/api/status') {
				return json({ ok: true, now: new Date().toISOString() });
			}

			if (request.method === 'GET' && url.pathname === '/api/rooms/current') {
				return json({ ok: true, room: service.getCurrentRoom(clientId(request, url)) });
			}

			if (request.method === 'POST' && url.pathname === '/api/rooms') {
				const body = (await readJsonObject(request)) as unknown as CreateRoomRequest;
				return json({ ok: true, room: service.createRoom(clientId(request, url), body) }, 201);
			}

			const match = url.pathname.match(
				/^\/api\/rooms\/([^/]+)(?:\/(join|leave|abandon|ready|settings|start|actions|events))?$/,
			);
			if (match) {
				const code = decodeURIComponent(match[1]!);
				const command = match[2];
				const identity = clientId(request, url);

				if (request.method === 'GET' && !command) {
					return json({ ok: true, room: service.getRoom(identity, code) });
				}
				if (request.method === 'GET' && command === 'events') {
					const room = service.getRoom(identity, code);
					return new Response(service.streams.create(room, request.signal), {
						headers: {
							'Cache-Control': 'no-cache, no-transform',
							Connection: 'keep-alive',
							'Content-Type': 'text/event-stream',
						},
					});
				}
				if (request.method === 'POST' && command === 'join') {
					const body = (await readJsonObject(request)) as unknown as JoinRoomRequest;
					return json({ ok: true, room: service.joinRoom(identity, code, body) });
				}
				if (request.method === 'POST' && command === 'leave') {
					return json({ ok: true, room: service.leaveRoom(identity, code) });
				}
				if (request.method === 'POST' && command === 'abandon') {
					return json({ ok: true, room: service.abandonRoom(identity, code) });
				}
				if (request.method === 'POST' && command === 'ready') {
					const body = (await readJsonObject(request)) as unknown as SetReadyRequest;
					return json({ ok: true, room: service.setReady(identity, code, body) });
				}
				if (request.method === 'POST' && command === 'settings') {
					const body = (await readJsonObject(request)) as unknown as UpdateRoomSettingsRequest;
					return json({ ok: true, room: service.updateSettings(identity, code, body) });
				}
				if (request.method === 'POST' && command === 'start') {
					return json({ ok: true, room: service.startRoom(identity, code) });
				}
				if (request.method === 'POST' && command === 'actions') {
					const body = (await readJsonObject(request)) as unknown as SubmitGameActionRequest;
					const room = service.submitGameAction(identity, code, body);
					return json({ ok: true, room, acceptedActionId: body.actionId });
				}
			}

			if (url.pathname.startsWith('/api/')) return json({ ok: false, error: 'Not found' }, 404);
			if (!uiBuildPath) return new Response('UI build not found.', { status: 404 });
			return staticFile(uiBuildPath, url.pathname);
		} catch (error) {
			if (error instanceof RoomError) return json({ ok: false, error: error.message }, error.status);
			if (error instanceof SyntaxError || error instanceof URIError) {
				return json({ ok: false, error: 'Request body is invalid.' }, 400);
			}
			console.error(error);
			return json({ ok: false, error: 'Internal server error.' }, 500);
		}
	};
}

function clientId(request: Request, url: URL): string {
	return request.headers.get(CLIENT_ID_HEADER) ?? url.searchParams.get('clientId') ?? '';
}

async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
	const body: unknown = await request.json();
	if (!body || typeof body !== 'object' || Array.isArray(body)) throw new SyntaxError('Expected a JSON object.');
	return body as Record<string, unknown>;
}

function json(body: unknown, status = 200): Response {
	return Response.json(body, { status });
}

async function staticFile(uiBuildPath: URL, pathname: string): Promise<Response> {
	const path = pathname === '/' ? '/index.html' : pathname;
	const file = Bun.file(new URL(`.${path}`, uiBuildPath));
	if (await file.exists()) return new Response(file);

	const index = Bun.file(new URL('./index.html', uiBuildPath));
	if (await index.exists()) return new Response(index);

	return new Response('UI build not found. Run `bun run build` or use `bun run dev`.', { status: 404 });
}
