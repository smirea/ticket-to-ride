import { expect, test } from 'bun:test';
import { applyGameAction, createDebugClaimScenario, TRAIN_CARDS, USA_ROUTES } from '@repo/shared';
import { routePayments } from './route-payments';

const route = USA_ROUTES.find(route => route.id === 'phoenix-santa-fe-gray')!;
function scenario() {
	const state = createDebugClaimScenario();
	for (const color of TRAIN_CARDS) state.players[0]!.hand[color] = 0;
	Object.assign(state.players[0]!.hand, { red: 3, green: 2, blue: 1, locomotive: 3 });
	return state;
}

test('payment chooser keeps only the least-wild payment per color, sorted by wilds', () => {
	const state = scenario();
	const options = routePayments(state, 'player', route);
	expect(options.map(option => `${option.cars}:${option.color}:${option.wilds}`)).toEqual([
		'3:red:0',
		'2:green:1',
		'1:blue:2',
	]);
	for (const option of options) {
		const result = applyGameAction(state, {
			type: 'claim-route',
			routeId: route.id,
			paymentColor: option.color,
			locomotives: option.wilds,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) continue;
		expect(result.state.players[0]!.hand[option.color]).toBe(state.players[0]!.hand[option.color] - option.cars);
		expect(result.state.players[0]!.hand.locomotive).toBe(3 - option.wilds);
		expect(result.state.trainDiscard.length - state.trainDiscard.length).toBe(3);
		expect(result.state.players[0]!.trains).toBe(state.players[0]!.trains - 3);
	}
});

test('explicit invalid or unaffordable payments cannot mutate the game', () => {
	const state = scenario();
	for (const locomotives of [-1, 0.5, 4, Number.NaN, Infinity]) {
		const result = applyGameAction(state, { type: 'claim-route', routeId: route.id, paymentColor: 'red', locomotives });
		expect(result.ok).toBe(false);
		expect(result.state).toEqual(state);
	}
	const result = applyGameAction(state, {
		type: 'claim-route',
		routeId: route.id,
		paymentColor: 'blue',
		locomotives: 1,
	});
	expect(result.ok).toBe(false);
	expect(result.state).toEqual(state);
});

test('all-wild payment appears once when no ordinary cards can contribute', () => {
	const state = scenario();
	for (const color of TRAIN_CARDS) if (color !== 'locomotive') state.players[0]!.hand[color] = 0;
	const options = routePayments(state, 'player', route);
	expect(options).toHaveLength(1);
	expect(options[0]!.wilds).toBe(3);
});
