import { MAPS } from './registry';
import type { GameMap } from './types';

export * from './types';
export { DEFAULT_RULES, defineGameMap } from './define';

export const GAME_MAPS: readonly GameMap[] = Object.values(MAPS);
export const DEFAULT_MAP_ID = 'usa';

const mapsById = new Map(GAME_MAPS.map(map => [map.id, map]));

export function findGameMap(id: string): GameMap | undefined {
	return mapsById.get(id);
}

export function getGameMap(id: string): GameMap {
	const map = mapsById.get(id);
	if (!map) throw new Error(`Unknown map: ${id}`);
	return map;
}
