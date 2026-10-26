import layout from './the-heart-of-africa.layout.json';
import type { BoardArt } from './types';

export const theHeartOfAfricaArt: BoardArt = {
	title: 'The Heart of Africa',
	terrain: '/game-assets/maps/the-heart-of-africa/terrain.webp',
	aspect: 1027 / 1531,
	flag: '/game-assets/maps/the-heart-of-africa/flag.svg',
	bends: layout.bends,
	labelBelow: ['sudan', 'port-elizabeth'],
	geography: [
		{ text: 'Atlantic\nOcean', x: 0.06, y: 0.62, rotate: -80, kind: 'sea' },
		{ text: 'Indian\nOcean', x: 0.96, y: 0.3, rotate: 80, kind: 'sea' },
	],
};
