import type { MapMechanic } from '../map-schema';
import { stations } from './stations';
import { tunnels } from './tunnels';
import type { Mechanic } from './types';

export * from './types';
export * from './stations';
export * from './tunnels';

// A map can only be registered once every mechanic in its map.json has an entry here.
export const MECHANICS: Partial<Record<MapMechanic, Mechanic>> = {
	// Printed locomotive spaces are a core payment rule (`Route.locomotives`), so ferries need no hooks.
	ferries: { id: 'ferries' },
	stations,
	tunnels,
};
