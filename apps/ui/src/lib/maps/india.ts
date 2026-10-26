import layout from './india.layout.json';
import type { BoardArt } from './types';

export const indiaArt: BoardArt = {
	title: 'India',
	terrain: '/game-assets/maps/india/terrain.webp',
	aspect: 1022 / 1539,
	flag: '/game-assets/maps/india/flag.svg',
	bends: layout.bends,
	geography: [
		{ text: 'TIBET', x: 0.82, y: 0.09, kind: 'land' },
		{ text: 'Arabian\nSea', x: 0.15, y: 0.75, kind: 'sea' },
		{ text: 'Bay of\nBengal', x: 0.88, y: 0.66, kind: 'sea' },
	],
};
