import { canClaimRoute, TRAIN_COLORS, type GameState, type Route, type TrainColor } from '@repo/shared';

export type RoutePayment = { color: TrainColor; cars: number; wilds: number };

export function routePayments(state: GameState, playerId: string, route: Route): RoutePayment[] {
	const player = state.players.find(player => player.id === playerId);
	if (!player) return [];
	const options = TRAIN_COLORS.filter(color => route.color === 'gray' || route.color === color).flatMap(color => {
		const wilds = Math.max(0, route.length - player.hand[color]);
		return canClaimRoute(state, playerId, route.id, color, wilds).ok
			? [{ color, cars: route.length - wilds, wilds }]
			: [];
	});
	const colored = options.filter(option => option.cars > 0);
	return (colored.length ? colored : options.slice(0, 1)).sort((a, b) => a.wilds - b.wilds);
}
