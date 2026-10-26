import layout from './japan.layout.json';
import type { BoardArt } from './types';

export const japanArt: BoardArt = {
	title: 'Japan',
	terrain: '/game-assets/maps/japan/terrain.webp',
	aspect: 1688 / 932,
	flag: '/game-assets/maps/japan/flag.svg',
	bends: layout.bends,
	// Kokura's and Hakodate's labels would run off the edge of the board or under the player plaques.
	positions: {
		kokura: [
			{ x: 0.04, y: 0.572 },
			{ x: 0.256, y: 0.1256 },
		],
		hakodate: [{ x: 0.95, y: 0.105 }],
	},
	geography: [
		{ text: 'Sea of Japan', x: 0.74, y: 0.31, kind: 'sea' },
		{ text: 'Pacific Ocean', x: 0.88, y: 0.93, kind: 'sea' },
	],
};
