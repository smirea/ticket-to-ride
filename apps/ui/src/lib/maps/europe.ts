import type { BoardArt } from './types';
import layout from './europe.layout.json';

export const europeArt: BoardArt = {
	title: 'Europe',
	terrain: '/game-assets/maps/europe/terrain.webp',
	aspect: 1537 / 1023,
	flag: '/game-assets/maps/europe/flag.svg',
	bends: layout.bends,
	// The player plaques overlap the top edge of the board.
	labelBelow: ['stockholm', 'riga', 'petrograd'],
	geography: [
		{ text: 'Atlantic\nOcean', x: 0.05, y: 0.45, kind: 'sea' },
		{ text: 'North\nSea', x: 0.27, y: 0.23, kind: 'sea' },
		{ text: 'Mediterranean Sea', x: 0.37, y: 0.92, kind: 'sea' },
		{ text: 'Black\nSea', x: 0.79, y: 0.69, kind: 'sea' },
	],
};
