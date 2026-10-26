import { gameMap, type GameMap } from '@repo/shared';
import { getContext, setContext } from 'svelte';

const key = Symbol('game-map');

// The map of the game on screen; set once by GameScreen so cards and panels need no map prop.
export function setGameMapContext(mapId: () => string): void {
	setContext(key, {
		get map() {
			return gameMap({ mapId: mapId() });
		},
	});
}

export function useGameMap(): { readonly map: GameMap } {
	const context = getContext<{ readonly map: GameMap } | undefined>(key);
	if (!context) throw new Error('useGameMap needs a GameScreen (or setGameMapContext) above it.');
	return context;
}
