import type { BoardArt } from './types';
import { usaCityPoints, usaTraces } from './usa-traces';

export const usaArt: BoardArt = {
	title: 'North America',
	terrain: '/game-assets/atlas/usa-relief-v4.webp',
	aspect: 1000 / 620,
	flag: '/game-assets/maps/usa/flag.svg',
	cityPoints: usaCityPoints,
	traces: usaTraces,
	ticketArtwork: id => `/game-assets/atlas/tickets-engraved/${id}.webp`,
	labelBelow: ['calgary', 'winnipeg', 'montreal', 'boston', 'charleston', 'houston', 'little-rock'],
	geography: [
		{ text: 'CANADA', x: 0.45, y: 0.05, kind: 'land' },
		{ text: 'MEXICO', x: 0.28, y: 0.965, kind: 'land' },
		{ text: 'Atlantic\nOcean', x: 0.955, y: 0.6, rotate: -8, kind: 'sea' },
		{ text: 'Pacific\nOcean', x: 0.07, y: 0.82, rotate: 8, kind: 'sea' },
	],
};
