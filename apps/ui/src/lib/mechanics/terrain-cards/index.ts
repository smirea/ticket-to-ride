import type { MechanicUi } from '..';
import { canDouble } from './doubling';
import TerrainBadge from './TerrainBadge.svelte';
import TerrainDouble from './TerrainDouble.svelte';
import TerrainSupply from './TerrainSupply.svelte';

export const terrainCardsUi: MechanicUi = {
	DrawPile: TerrainSupply,
	PlayerBadge: TerrainBadge,
	ClaimOptions: TerrainDouble,
	needsClaimChoice: canDouble,
};
