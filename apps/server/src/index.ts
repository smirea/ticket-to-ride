import env from '@repo/shared/env';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequestHandler } from './app';
import { RoomService } from './room-service';
import { RoomStore } from './room-store';
import { RoomStreams } from './room-streams';

const uiBuildPath = new URL('../../ui/build/', import.meta.url);
const databasePath =
	process.env.ROOM_DATABASE_PATH ?? fileURLToPath(new URL('../.cache/ticket-to-ride.sqlite', import.meta.url));
if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true });

const store = new RoomStore(databasePath);
const streams = new RoomStreams();
const service = new RoomService(store, streams);
const fetch = createRequestHandler({ service, uiBuildPath });

const server = Bun.serve({
	development: process.env.NODE_ENV !== 'production',
	idleTimeout: 120,
	maxRequestBodySize: 64 * 1024,
	port: env.PORT,
	fetch,
});

console.log(`server listening on http://${server.hostname}:${server.port}`);
