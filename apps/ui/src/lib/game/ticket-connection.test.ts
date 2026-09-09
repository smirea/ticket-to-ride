import { expect, test } from 'bun:test';
import { USA_ROUTES } from '@repo/shared';
import { shortestTicketConnection } from './ticket-connection';

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
