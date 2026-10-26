import { shareChoices } from '@repo/shared/mechanics/stocks';
import type { MechanicUi } from '..';
import ShareBadge from './ShareBadge.svelte';
import StockChoice from './StockChoice.svelte';
import StockPortfolio from './StockPortfolio.svelte';

export const stocksUi: MechanicUi = {
	ClaimOptions: StockChoice,
	needsClaimChoice: (state, _viewerId, route) => shareChoices(state, route).length > 1,
	SidebarPanel: StockPortfolio,
	PlayerBadge: ShareBadge,
};
