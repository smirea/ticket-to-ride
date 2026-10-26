import type { MechanicUi } from '..';
import StationAction from './StationAction.svelte';
import StationBadge from './StationBadge.svelte';
import StationLayer from './StationLayer.svelte';

export const stationsUi: MechanicUi = {
	BoardLayer: StationLayer,
	TurnActions: StationAction,
	PlayerBadge: StationBadge,
};
