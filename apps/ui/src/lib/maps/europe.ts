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
};
