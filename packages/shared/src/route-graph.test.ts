import { expect, test } from 'bun:test';
import { createGame, shortestTicketConnection, type Route } from './game';
import { getGameMap } from './maps';

const base = createGame({ seed: 'graph' });

test('completion traces the shortest owned connection in traversal order, excluding opponent shortcuts', () => {
	const routes = getGameMap('usa').routes.filter(route =>
		['denver-santa-fe-gray', 'santa-fe-el-paso-gray', 'phoenix-denver-white', 'phoenix-el-paso-gray'].includes(
			route.id,
		),
	);
	const claimedRoutes = Object.fromEntries(routes.map(route => [route.id, 'you']));
	expect(shortestTicketConnection({ ...base, claimedRoutes }, 'you', { cityA: 'el-paso', cityB: 'denver' })).toEqual([
		{ routeId: 'santa-fe-el-paso-gray', reverse: true },
		{ routeId: 'denver-santa-fe-gray', reverse: true },
	]);
	claimedRoutes['denver-santa-fe-gray'] = 'opponent';
	expect(shortestTicketConnection({ ...base, claimedRoutes }, 'you', { cityA: 'el-paso', cityB: 'denver' })).toEqual([
		{ routeId: 'phoenix-el-paso-gray', reverse: true },
		{ routeId: 'phoenix-denver-white', reverse: false },
	]);
});

test('disconnected owned routes produce no completion wave', () => {
	expect(
		shortestTicketConnection(
			{ ...base, claimedRoutes: { 'denver-santa-fe-gray': 'you', 'santa-fe-el-paso-gray': 'opponent' } },
			'you',
			{ cityA: 'denver', cityB: 'el-paso' },
		),
	).toEqual([]);
});

test('path planning handles zero-cost owned cycles and breaks ties deterministically', async () => {
	const { createRouteGraph, findRoutePath } = await import('./route-graph');
	const edge = (id: string, cityA: string, cityB: string, length: number): Route =>
		({ id, cityA, cityB, length, color: 'gray', positionA: 0, positionB: 0, locomotives: 0 }) as Route;
	const routes = [
		edge('ab', 'a', 'b', 1),
		edge('bc', 'b', 'c', 1),
		edge('ac', 'a', 'c', 1),
		edge('cd', 'c', 'd', 2),
		edge('bd', 'b', 'd', 2),
	];
	const cost = (route: { cityB: string }) => (route.cityB === 'd' ? 2 : 0);
	const path = findRoutePath(createRouteGraph(routes), 'a', 'd', cost)!;
	const reversed = findRoutePath(createRouteGraph([...routes].reverse()), 'a', 'd', cost)!;
	expect(path.cost).toBe(2);
	expect(path).toEqual(reversed);
	expect(new Set(path.steps.map(step => step.route.id)).size).toBe(path.steps.length);
});
