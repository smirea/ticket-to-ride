import { india } from './india';
import { japan } from './japan';
import { usa } from './usa';
import type { GameMap } from './types';

export * from './types';
export { DEFAULT_RULES, defineGameMap } from './define';

// Order is the atlas order. Add a map here once its tickets, rules and mechanics are complete.
export const GAME_MAPS: readonly GameMap[] = [usa, india, japan];
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
