import layout from './japan.layout.json';
import type { BoardArt } from './types';

export const japanArt: BoardArt = {
	title: 'Japan',
	terrain: '/game-assets/maps/japan/terrain.webp',
	aspect: 1688 / 932,
	flag: '/game-assets/maps/japan/flag.svg',
	bends: layout.bends,
	// Kokura's label would run off the left edge of the board.
	positions: {
		kokura: [
			{ x: 0.03, y: 0.572 },
			{ x: 0.256, y: 0.1256 },
		],
	},
};
