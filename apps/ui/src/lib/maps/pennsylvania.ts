import layout from './pennsylvania.layout.json';
import type { BoardArt } from './types';

export const pennsylvaniaArt: BoardArt = {
	title: 'Pennsylvania',
	terrain: '/game-assets/maps/pennsylvania/terrain.webp',
	aspect: 1536 / 1024,
	flag: '/game-assets/maps/pennsylvania/flag.svg',
	positions: { baltimore: [{ x: 0.643, y: 0.913 }] },
	bends: layout.bends,
	geography: [
		{ text: 'LAKE ERIE', x: 34, y: 150, rotate: -58, kind: 'sea' },
		{ text: 'ATLANTIC', x: 880, y: 585, kind: 'sea' },
		{ text: 'OCEAN', x: 880, y: 601, kind: 'sea' },
	],
};
