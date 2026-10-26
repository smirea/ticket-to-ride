import type { MapMechanic } from '@repo/shared';
import { bulletTrainsUi } from './bullet-trains';
import { mandalasUi } from './mandalas';
import { stationsUi } from './stations';
import { tunnelsUi } from './tunnels';
import { stocksUi } from './stocks';
import { terrainCardsUi } from './terrain-cards';
import type { MechanicUi } from '.';

// One import and one entry per line: git merges this file with the union driver (.gitattributes), so parallel
// branches that each add an entry merge cleanly.
export const MECHANIC_UI: Partial<Record<MapMechanic, MechanicUi>> = {
	mandalas: mandalasUi,
	stations: stationsUi,
	tunnels: tunnelsUi,
	stocks: stocksUi,
	'terrain-cards': terrainCardsUi,
	'bullet-trains': bulletTrainsUi,
};
