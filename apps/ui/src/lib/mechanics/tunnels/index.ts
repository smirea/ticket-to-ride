import { currentPlayer } from '@repo/shared';
import type { MechanicUi } from '..';
import TunnelLayer from './TunnelLayer.svelte';
import TunnelPanel from './TunnelPanel.svelte';

export const tunnelsUi: MechanicUi = {
	BoardLayer: TunnelLayer,
	PhasePanel: TunnelPanel,
	defersClaim: (_, route) => Boolean(route.spec.tunnel),
	describePhase(state, viewerId) {
		if (state.phase.type !== 'tunnel') return undefined;
		return currentPlayer(state).id === viewerId
			? 'Pay for the tunnel or give up'
			: `${currentPlayer(state).name} digs a tunnel`;
	},
};
