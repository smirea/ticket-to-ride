import { canClaimRoute, gameMap, TRAIN_COLORS } from '../game';
import type { GameAction, GameState, Player, PlayerId } from '../game';
import type { Route, RouteId } from '../maps/types';
import type { Mechanic, ScoreLine } from './types';

declare module './types' {
	interface MechanicStateMap {
		'bullet-trains': { supply: number; progress: Record<PlayerId, number>; routes: RouteId[] };
	}
	interface MechanicEventMap {
		'bullet-train': { routeId: RouteId; spaces: number; supply: number };
	}
}

export const BULLET_TRAIN_SUPPLY = 16;
// The bonus for each place on the bullet track, by player count.
export const BULLET_TRACK_BONUS: Readonly<Record<number, readonly number[]>> = {
	2: [10, -10],
	3: [15, 5, -10],
	4: [20, 10, 0, -10],
	5: [25, 15, 5, -5, -10],
};
export const BULLET_TRACK_ABSENT = -20;
// The core trigger and the supply must both be this low.
const LOW_SUPPLY = 2;

export function bulletTrains(state: GameState) {
	return state.mechanics['bullet-trains'] ?? { supply: 0, progress: {}, routes: [] };
}

export function isBulletRoute(route: Route): boolean {
	return route.spec.claim === 'shared-bullet-train';
}

// Once the supply runs out, the rest of the bullet routes are ordinary gray routes.
export function claimsAsBulletTrain(state: GameState, route: Route): boolean {
	const bullets = bulletTrains(state);
	if (state.claimedRoutes[route.id]) return bullets.routes.includes(route.id);
	return isBulletRoute(route) && bullets.supply > 0;
}

// Competition ranking among players who placed a bullet train; players at zero take the absent penalty.
export function bulletTrackPlaces(state: GameState): Record<PlayerId, { place: number; points: number } | undefined> {
	const { progress } = bulletTrains(state);
	const table = BULLET_TRACK_BONUS[state.players.length] ?? [];
	return Object.fromEntries(
		state.players.map(player => {
			const spaces = progress[player.id] ?? 0;
			if (spaces === 0) return [player.id, undefined];
			const place = 1 + state.players.filter(other => (progress[other.id] ?? 0) > spaces).length;
			return [player.id, { place, points: table[place - 1] ?? 0 }];
		}),
	);
}

function bestPaymentColor(player: Player, route: Route) {
	return TRAIN_COLORS.filter(color => player.hand[color] + player.hand.locomotive >= route.length).sort(
		(left, right) => player.hand[right] - player.hand[left] || left.localeCompare(right),
	)[0];
}

function openBulletRoutes(state: GameState): Route[] {
	return gameMap(state).routes.filter(route => !state.claimedRoutes[route.id] && claimsAsBulletTrain(state, route));
}

// Bots claim for the bullet bonus when they have not placed one yet, are not clearly ahead, or have no trains left to build with.
function chooseBulletClaim(state: GameState, player: Player): GameAction | undefined {
	if (state.phase.type !== 'turn' || state.phase.drawsTaken !== 0) return undefined;
	const { progress } = bulletTrains(state);
	const own = progress[player.id] ?? 0;
	const rival = Math.max(
		0,
		...state.players.filter(other => other.id !== player.id).map(other => progress[other.id] ?? 0),
	);
	const minimumLength = own === 0 || player.trains <= LOW_SUPPLY ? 1 : own <= rival + 2 ? 3 : Infinity;
	const choice = openBulletRoutes(state)
		.filter(route => route.length >= minimumLength)
		.flatMap(route => {
			const paymentColor = bestPaymentColor(player, route);
			return paymentColor && canClaimRoute(state, player.id, route.id, paymentColor).ok
				? [{ route, paymentColor }]
				: [];
		})
		.sort((left, right) => right.route.length - left.route.length || left.route.id.localeCompare(right.route.id))[0];
	return choice && { type: 'claim-route', routeId: choice.route.id, paymentColor: choice.paymentColor };
}

export const bulletTrainMechanic: Mechanic = {
	id: 'bullet-trains',
	setup(state) {
		state.mechanics['bullet-trains'] = {
			supply: BULLET_TRAIN_SUPPLY,
			progress: Object.fromEntries(state.players.map(player => [player.id, 0])),
			routes: [],
		};
	},
	claimTrains: (state, route) => (claimsAsBulletTrain(state, route) ? 0 : undefined),
	routePoints: (state, route) => (claimsAsBulletTrain(state, route) ? 0 : undefined),
	onClaim(next, player, route, _claim, payment) {
		const bullets = next.mechanics['bullet-trains'];
		// routePoints and claimTrains already saw the route as a bullet claim, before it was marked claimed.
		if (!bullets || !isBulletRoute(route) || bullets.supply === 0) return;
		const spaces = payment.cars + payment.locomotives;
		bullets.supply -= 1;
		bullets.routes.push(route.id);
		bullets.progress[player.id] = (bullets.progress[player.id] ?? 0) + spaces;
		next.events.push({
			type: 'bullet-train',
			playerId: player.id,
			turnNumber: next.turnNumber,
			routeId: route.id,
			spaces,
			supply: bullets.supply,
		});
	},
	ticketRoutes(state) {
		const map = gameMap(state);
		return bulletTrains(state).routes.flatMap(routeId => map.route(routeId) ?? []);
	},
	holdsFinalRound: state => bulletTrains(state).supply > LOW_SUPPLY,
	triggersFinalRound(state) {
		const rules = gameMap(state).rules;
		return (
			bulletTrains(state).supply <= LOW_SUPPLY && state.players.some(player => player.trains <= rules.finalRoundTrains)
		);
	},
	scoring(state) {
		const places = bulletTrackPlaces(state);
		return Object.fromEntries(
			state.players.map(player => {
				const result = places[player.id];
				const line: ScoreLine = result
					? { id: 'bullet-trains', label: `Bullet track #${result.place}`, points: result.points }
					: { id: 'bullet-trains', label: 'No bullet train', points: BULLET_TRACK_ABSENT };
				return [player.id, [line]];
			}),
		);
	},
	chooseBotAction: chooseBulletClaim,
	botGoalRoutes: openBulletRoutes,
	describeEvent(event) {
		if (event.type !== 'bullet-train') return undefined;
		return `placed a bullet train and moved ${event.spaces} along the bullet track`;
	},
};
