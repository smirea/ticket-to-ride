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
		{ text: 'C A N A D A', x: 415, y: 32, kind: 'land' },
		{ text: 'M E X I C O', x: 243, y: 597, kind: 'land' },
		{ text: 'ATLANTIC', x: 918, y: 367, rotate: -8, kind: 'sea' },
		{ text: 'OCEAN', x: 925, y: 383, rotate: -8, kind: 'sea' },
		{ text: 'PACIFIC', x: 41, y: 508, rotate: 8, kind: 'sea' },
		{ text: 'OCEAN', x: 43, y: 524, rotate: 8, kind: 'sea' },
	],
};
