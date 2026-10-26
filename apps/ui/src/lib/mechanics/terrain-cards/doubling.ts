import { canClaimRoute, type GameState, type Route } from '@repo/shared';
import { doublingTerms } from '@repo/shared/mechanics/terrain-cards';
import { routePayments } from '$lib/game/route-payments';

// Whether some payment the viewer could choose still leaves room to double the route.
export function canDouble(state: GameState, viewerId: string, route: Route): boolean {
	const options = { terrain: { locomotives: doublingTerms(state, viewerId, route).minLocomotives } };
	return routePayments(state, viewerId, route).some(
		payment => canClaimRoute(state, viewerId, route.id, payment.color, payment.wilds, options).ok,
	);
}
