import { GAME_MAPS } from '@repo/shared';
import atlas from '../../../static/game-assets/atlas/world-atlas.json';

export const ATLAS_IMAGE = '/game-assets/atlas/world-atlas.webp';
export const ATLAS_ASPECT = atlas.width / atlas.height;
const places: Record<string, { x: number; y: number }> = atlas.places;

for (const map of GAME_MAPS) {
	if (!places[map.id]) throw new Error(`Map ${map.id} has no place in static/game-assets/atlas/world-atlas.json.`);
}

export function atlasPlace(mapId: string): { x: number; y: number } {
	return places[mapId]!;
}
