import type { MapMechanic } from '../map-schema';
import { mandalas } from './mandalas';
import { stocks } from './stocks';
import type { Mechanic } from './types';

export * from './types';

// A map can only be registered once every mechanic in its map.json has an entry here.
export const MECHANICS: Partial<Record<MapMechanic, Mechanic>> = {
	// Printed locomotive spaces are a core payment rule (`Route.locomotives`), so ferries need no hooks.
	ferries: { id: 'ferries' },
	mandalas,
	stocks,
};
