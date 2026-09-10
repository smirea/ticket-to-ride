import { expect, test } from 'bun:test';
import { USA_ROUTES, shortestTicketConnection } from './game';

test('completion traces the shortest owned connection in traversal order, excluding opponent shortcuts', () => {
	const routes = USA_ROUTES.filter(route =>
		['denver-santa-fe-gray', 'santa-fe-el-paso-gray', 'phoenix-denver-white', 'phoenix-el-paso-gray'].includes(
			route.id,
		),
	);
	const claimedRoutes = Object.fromEntries(routes.map(route => [route.id, 'you']));
	expect(shortestTicketConnection({ claimedRoutes }, 'you', { cityA: 'el-paso', cityB: 'denver' }, routes)).toEqual([
		{ routeId: 'santa-fe-el-paso-gray', reverse: true },
		{ routeId: 'denver-santa-fe-gray', reverse: true },
	]);
	claimedRoutes['denver-santa-fe-gray'] = 'opponent';
	expect(shortestTicketConnection({ claimedRoutes }, 'you', { cityA: 'el-paso', cityB: 'denver' }, routes)).toEqual([
		{ routeId: 'phoenix-el-paso-gray', reverse: true },
		{ routeId: 'phoenix-denver-white', reverse: false },
	]);
});

test('disconnected owned routes produce no completion wave', () => {
	expect(
		shortestTicketConnection(
			{ claimedRoutes: { 'denver-santa-fe-gray': 'you', 'santa-fe-el-paso-gray': 'opponent' } },
			'you',
			{ cityA: 'denver', cityB: 'el-paso' },
		),
	).toEqual([]);
});

test('path planning handles zero-cost owned cycles and breaks ties deterministically', async () => {
	const { createRouteGraph, findRoutePath } = await import('./route-graph');
	const routes = [
		{ id: 'ab', cityA: 'a', cityB: 'b', color: 'gray' as const, length: 1 },
		{ id: 'bc', cityA: 'b', cityB: 'c', color: 'gray' as const, length: 1 },
		{ id: 'ac', cityA: 'a', cityB: 'c', color: 'gray' as const, length: 1 },
		{ id: 'cd', cityA: 'c', cityB: 'd', color: 'gray' as const, length: 2 },
		{ id: 'bd', cityA: 'b', cityB: 'd', color: 'gray' as const, length: 2 },
	];
	const cost = (route: { cityB: string }) => (route.cityB === 'd' ? 2 : 0);
	const path = findRoutePath(createRouteGraph(routes), 'a', 'd', cost)!;
	const reversed = findRoutePath(createRouteGraph([...routes].reverse()), 'a', 'd', cost)!;
	expect(path.cost).toBe(2);
	expect(path).toEqual(reversed);
	expect(new Set(path.steps.map(step => step.route.id)).size).toBe(path.steps.length);
});
