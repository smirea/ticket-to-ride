import layout from './india.layout.json';
import type { BoardArt } from './types';

export const indiaArt: BoardArt = {
	title: 'India',
	terrain: '/game-assets/maps/india/terrain.webp',
	aspect: 1022 / 1539,
	flag: '/game-assets/maps/india/flag.svg',
	bends: layout.bends,
	geography: [
		{ text: 'T I B E T', x: 550, y: 95, kind: 'land' },
		{ text: 'ARABIAN', x: 74, y: 783, kind: 'sea' },
		{ text: 'SEA', x: 74, y: 800, kind: 'sea' },
		{ text: 'BAY OF', x: 600, y: 690, kind: 'sea' },
		{ text: 'BENGAL', x: 600, y: 707, kind: 'sea' },
	],
};
