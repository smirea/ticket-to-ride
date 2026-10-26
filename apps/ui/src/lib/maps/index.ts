import { GAME_MAPS } from '@repo/shared';
import { ART } from './registry';
import type { BoardArt } from './types';

export type * from './types';

for (const map of GAME_MAPS) {
	if (!ART[map.id]) throw new Error(`Map ${map.id} has no board art in apps/ui/src/lib/maps.`);
}

export function boardArt(mapId: string): BoardArt {
	const art = ART[mapId];
	if (!art) throw new Error(`Unknown map art: ${mapId}`);
	return art;
}
