import { z } from 'zod';
import {
	canDrawTrainCards,
	cloneState,
	completeClaim,
	currentPlayer,
	endTurn,
	gameMap,
	takeTrainDeckCard,
	type ActionResult,
	type ClaimRouteAction,
	type GameState,
	type Player,
	type TrainCard,
} from '../game';
import { routeName } from '../game-events';
import { defineAction, type ClaimPayment, type Mechanic } from './types';

declare module './types' {
	interface MechanicPhaseMap {
		tunnel: { claim: ClaimRouteAction; payment: ClaimPayment; revealed: TrainCard[]; extra: number };
	}
	interface MechanicActionMap {
		'pay-tunnel': { locomotives: number };
		'abandon-tunnel': {};
	}
	interface MechanicEventMap {
		'tunnel-reveal': { routeId: string; revealed: TrainCard[]; extra: number };
		'abandon-tunnel': { routeId: string };
	}
}

type TunnelPhase = Extract<GameState['phase'], { type: 'tunnel' }>;

// A claim paid only with locomotives is matched only by revealed locomotives.
export function tunnelExtra(payment: ClaimPayment, revealed: readonly TrainCard[]): number {
	return revealed.filter(card => card === 'locomotive' || (payment.cars > 0 && card === payment.color)).length;
}

// The cards a tunnel's extra cost takes from the hand, on top of the original payment, or an error.
export function tunnelPayment(phase: TunnelPhase, player: Player, locomotives: number): ClaimPayment | string {
	const { payment, extra } = phase;
	if (!Number.isInteger(locomotives) || locomotives < 0 || locomotives > extra) return 'Invalid locomotive count.';
	if (payment.cars === 0 && locomotives !== extra) return 'A tunnel claimed with locomotives needs locomotives.';
	const total = {
		...payment,
		cars: payment.cars + extra - locomotives,
		locomotives: payment.locomotives + locomotives,
	};
	if (player.hand[total.color] < total.cars || player.hand.locomotive < total.locomotives) {
		return 'Not enough matching cards for the tunnel.';
	}
	return total;
}

function tunnelPhase(state: GameState): TunnelPhase | undefined {
	return state.phase.type === 'tunnel' ? state.phase : undefined;
}

function resolve(state: GameState, apply: (next: GameState, phase: TunnelPhase) => void): ActionResult {
	const phase = tunnelPhase(state);
	if (!phase) return { ok: false, state, error: 'No tunnel is being claimed.' };
	const next = cloneState(state);
	next.phase = { type: 'turn', drawsTaken: 0 };
	next.trainDiscard.push(...phase.revealed);
	apply(next, phase);
	endTurn(next);
	return { ok: true, state: next };
}

export const tunnels: Mechanic = {
	id: 'tunnels',
	interceptClaim(state, claim, payment) {
		const route = gameMap(state).route(claim.routeId)!;
		if (!route.spec.tunnel) return undefined;
		const next = cloneState(state);
		const revealed: TrainCard[] = [];
		for (let index = 0; index < route.spec.tunnel.reveal; index += 1) {
			const card = takeTrainDeckCard(next);
			if (card) revealed.push(card);
		}
		const extra = tunnelExtra(payment, revealed);
		const player = currentPlayer(next);
		next.events.push({
			type: 'tunnel-reveal',
			playerId: player.id,
			turnNumber: next.turnNumber,
			routeId: route.id,
			revealed,
			extra,
		});
		if (extra > 0) {
			next.phase = { type: 'tunnel', claim, payment, revealed, extra };
			return { ok: true, state: next };
		}
		next.trainDiscard.push(...revealed);
		completeClaim(next, claim, payment);
		endTurn(next);
		return { ok: true, state: next };
	},
	actions: {
		'pay-tunnel': defineAction<'pay-tunnel'>({
			timing: 'phase',
			schema: z.object({ locomotives: z.int().min(0).max(8) }),
			apply(state, action) {
				const phase = tunnelPhase(state);
				if (!phase) return { ok: false, state, error: 'No tunnel is being claimed.' };
				const total = tunnelPayment(phase, currentPlayer(state), action.locomotives);
				if (typeof total === 'string') return { ok: false, state, error: total };
				return resolve(state, next => completeClaim(next, phase.claim, total));
			},
		}),
		'abandon-tunnel': defineAction<'abandon-tunnel'>({
			timing: 'phase',
			schema: z.object({}),
			apply(state) {
				return resolve(state, (next, phase) => {
					next.events.push({
						type: 'abandon-tunnel',
						playerId: currentPlayer(next).id,
						turnNumber: next.turnNumber,
						routeId: phase.claim.routeId,
					});
				});
			},
		}),
	},
	botDeclinesClaim(state, player, route, payment) {
		if (!route.spec.tunnel || !canDrawTrainCards(state)) return false;
		const spareColor = payment.cars > 0 ? player.hand[payment.color] - payment.cars : 0;
		return spareColor + player.hand.locomotive - payment.locomotives < 1;
	},
	chooseBotAction(state, player) {
		const phase = tunnelPhase(state);
		if (!phase) return undefined;
		const spareColor = phase.payment.cars > 0 ? player.hand[phase.payment.color] - phase.payment.cars : 0;
		const locomotives = Math.max(0, phase.extra - spareColor);
		return typeof tunnelPayment(phase, player, locomotives) === 'string'
			? { type: 'abandon-tunnel' }
			: { type: 'pay-tunnel', locomotives };
	},
	describeEvent(event, playerName, state) {
		if (event.type === 'tunnel-reveal') {
			const cost =
				event.extra === 0 ? 'no extra cards' : `${event.extra} extra ${event.extra === 1 ? 'card' : 'cards'}`;
			return `${playerName} dug into the ${routeName(state, event.routeId)} tunnel: ${cost}.`;
		}
		if (event.type === 'abandon-tunnel') return `${playerName} gave up the ${routeName(state, event.routeId)} tunnel.`;
		return undefined;
	},
};
