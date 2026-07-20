import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => {
	const name = url.searchParams.get('name')?.trim().slice(0, 24) || 'You';
	const requestedBots = Number(url.searchParams.get('bots') ?? 1);
	const bots = Number.isInteger(requestedBots) && requestedBots >= 1 && requestedBots <= 4 ? requestedBots : 1;

	return {
		name,
		bots,
		startFresh: url.searchParams.get('new') === '1',
	};
};
