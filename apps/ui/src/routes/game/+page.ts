import { DEFAULT_MAP_ID, findGameMap } from '@repo/shared';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => {
	const name = url.searchParams.get('name')?.trim().slice(0, 24) || 'You';
	const map = findGameMap(url.searchParams.get('map') ?? DEFAULT_MAP_ID) ?? findGameMap(DEFAULT_MAP_ID)!;
	const requestedBots = Number(url.searchParams.get('bots') ?? 1);
	const bots = map.players.includes(requestedBots + 1) ? requestedBots : Math.min(...map.players) - 1;

	return {
		name,
		mapId: map.id,
		bots,
		startFresh: url.searchParams.get('new') === '1',
	};
};
