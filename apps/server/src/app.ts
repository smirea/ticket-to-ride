import type {
	CreateRoomRequest,
	JoinRoomRequest,
	SetReadyRequest,
	SubmitGameActionRequest,
	UpdateRoomSettingsRequest,
} from '@repo/shared';
import { CLIENT_ID_HEADER } from '@repo/shared';
import { projectRoomForViewer } from './room-projection';
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
				const identity = clientId(request, url);
				const room = service.getCurrentRoom(identity);
				return json({ ok: true, room: room ? projectRoomForViewer(room, identity) : null });
			}

			if (request.method === 'POST' && url.pathname === '/api/rooms') {
				const identity = clientId(request, url);
				const body = (await readJsonObject(request)) as unknown as CreateRoomRequest;
				return json({ ok: true, room: projectRoomForViewer(service.createRoom(identity, body), identity) }, 201);
			}

			const match = url.pathname.match(
				/^\/api\/rooms\/([^/]+)(?:\/(join|leave|abandon|ready|settings|start|actions|events))?$/,
			);
			if (match) {
				const code = decodeURIComponent(match[1]!);
				const command = match[2];
				const identity = clientId(request, url);

				if (request.method === 'GET' && !command) {
					return json({ ok: true, room: projectRoomForViewer(service.getRoom(identity, code), identity) });
				}
				if (request.method === 'GET' && command === 'events') {
					const room = service.getRoom(identity, code);
					return new Response(service.streams.create(room, identity, request.signal), {
						headers: {
							'Cache-Control': 'no-cache, no-transform',
							Connection: 'keep-alive',
							'Content-Type': 'text/event-stream',
						},
					});
				}
				if (request.method === 'POST' && command === 'join') {
					const body = (await readJsonObject(request)) as unknown as JoinRoomRequest;
					return json({ ok: true, room: projectRoomForViewer(service.joinRoom(identity, code, body), identity) });
				}
				if (request.method === 'POST' && command === 'leave') {
					const room = service.leaveRoom(identity, code);
					return json({ ok: true, room: room ? projectRoomForViewer(room, identity) : null });
				}
				if (request.method === 'POST' && command === 'abandon') {
					return json({ ok: true, room: projectRoomForViewer(service.abandonRoom(identity, code), identity) });
				}
				if (request.method === 'POST' && command === 'ready') {
					const body = (await readJsonObject(request)) as unknown as SetReadyRequest;
					return json({ ok: true, room: projectRoomForViewer(service.setReady(identity, code, body), identity) });
				}
				if (request.method === 'POST' && command === 'settings') {
					const body = (await readJsonObject(request)) as unknown as UpdateRoomSettingsRequest;
					return json({ ok: true, room: projectRoomForViewer(service.updateSettings(identity, code, body), identity) });
				}
				if (request.method === 'POST' && command === 'start') {
					return json({ ok: true, room: projectRoomForViewer(service.startRoom(identity, code), identity) });
				}
				if (request.method === 'POST' && command === 'actions') {
					const body = (await readJsonObject(request)) as unknown as SubmitGameActionRequest;
					const room = service.submitGameAction(identity, code, body);
					return json({ ok: true, room: projectRoomForViewer(room, identity), acceptedActionId: body.actionId });
				}
			}

			if (url.pathname.startsWith('/api/')) return json({ ok: false, error: 'Not found' }, 404);
			if (!uiBuildPath) return new Response('UI build not found.', { status: 404 });
			return await staticFile(uiBuildPath, url.pathname, request);
		} catch (error) {
			if (error instanceof RoomError) return json({ ok: false, error: error.message }, error.status);
			if (error instanceof URIError) return json({ ok: false, error: 'Not found' }, 404);
			console.error(error);
			return json({ ok: false, error: 'Internal server error.' }, 500);
		}
	};
}

// EventSource cannot send headers, so only the events stream accepts the identity as a query parameter.
function clientId(request: Request, url: URL): string {
	const header = request.headers.get(CLIENT_ID_HEADER);
	if (header) return header;
	return url.pathname.endsWith('/events') ? (url.searchParams.get('clientId') ?? '') : '';
}

async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
	const body: unknown = await request.json().catch(() => undefined);
	if (!body || typeof body !== 'object' || Array.isArray(body)) throw new RoomError('Request body is invalid.', 400);
	return body as Record<string, unknown>;
}

function json(body: unknown, status = 200): Response {
	return Response.json(body, { status });
}

async function staticFile(uiBuildPath: URL, pathname: string, request: Request): Promise<Response> {
	const path = pathname === '/' ? '/index.html' : decodeURIComponent(pathname);
	const fileUrl = new URL(`.${path}`, uiBuildPath);
	if (path.includes('\0') || !fileUrl.href.startsWith(uiBuildPath.href))
		return new Response('Not found', { status: 404 });
	const file = Bun.file(fileUrl);
	if (await file.exists()) return cachedFile(file, cacheControl(path), request);
	// Only page routes fall back to the SPA shell; a missing asset must not come back as HTML.
	if (/\.[a-z0-9]+$/i.test(path) || path.startsWith('/_app/') || path.startsWith('/game-assets/')) {
		return new Response('Not found', { status: 404 });
	}

	const index = Bun.file(new URL('./index.html', uiBuildPath));
	if (await index.exists()) return cachedFile(index, 'no-cache', request);

	return new Response('UI build not found. Run `bun run build` or use `bun run dev`.', { status: 404 });
}

// Game assets keep stable names across builds, so they get a week plus revalidation instead of immutable.
function cacheControl(path: string): string {
	if (path.startsWith('/_app/immutable/')) return 'public, max-age=31536000, immutable';
	if (path.startsWith('/game-assets/')) return 'public, max-age=604800, stale-while-revalidate=2592000';
	return 'no-cache';
}

const COMPRESSIBLE = /\.(?:js|css|html|json|svg|txt)$/;
const gzipCache = new Map<string, { modified: number; body: Uint8Array<ArrayBuffer> }>();

async function cachedFile(file: ReturnType<typeof Bun.file>, cache: string, request: Request): Promise<Response> {
	const lastModified = new Date(Math.floor(file.lastModified / 1000) * 1000);
	const headers: Record<string, string> = {
		'Cache-Control': cache,
		'Last-Modified': lastModified.toUTCString(),
		Vary: 'Accept-Encoding',
	};
	const since = request.headers.get('If-Modified-Since');
	if (since && Date.parse(since) >= lastModified.getTime()) return new Response(null, { status: 304, headers });
	const path = file.name ?? '';
	if (file.size < 1024 || !COMPRESSIBLE.test(path) || !request.headers.get('Accept-Encoding')?.includes('gzip')) {
		return new Response(file, { headers });
	}
	let compressed = gzipCache.get(path);
	if (compressed?.modified !== file.lastModified) {
		compressed = { modified: file.lastModified, body: Bun.gzipSync(await file.bytes()) };
		gzipCache.set(path, compressed);
	}
	return new Response(compressed.body, {
		headers: { ...headers, 'Content-Encoding': 'gzip', 'Content-Type': file.type },
	});
}
