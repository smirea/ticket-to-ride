import { canClaimRoute, TRAIN_COLORS, type GameState, type Route, type TrainColor } from '@repo/shared';

export type RoutePayment = { color: TrainColor; cars: number; wilds: number };

export function routePayments(state: GameState, playerId: string, route: Route): RoutePayment[] {
	const colors = TRAIN_COLORS.filter(color => route.color === 'gray' || route.color === color);
	const options: RoutePayment[] = [];
	for (let wilds = 0; wilds <= route.length; wilds++) {
		for (const color of colors) {
			if (canClaimRoute(state, playerId, route.id, color, wilds).ok) {
				options.push({ color, cars: route.length - wilds, wilds });
				if (wilds === route.length) break;
			}
		}
	}
	return options;
}
