import layout from './pennsylvania.layout.json';
import type { BoardArt } from './types';

export const pennsylvaniaArt: BoardArt = {
	title: 'Pennsylvania',
	terrain: '/game-assets/maps/pennsylvania/terrain.webp',
	aspect: 1536 / 1024,
	flag: '/game-assets/maps/pennsylvania/flag.svg',
	positions: {
		ontario: [
			{ x: 0.0766, y: 0.0781 },
			{ x: 0.225, y: 0.0805 },
		],
		youngstown: [{ x: 0.072, y: 0.4867 }],
		'new-york': [{ x: 0.94, y: 0.4945 }],
		albany: [{ x: 0.942, y: 0.1234 }],
		baltimore: [{ x: 0.643, y: 0.913 }],
	},
	// The plaques overhang the top edge of the table, so the top row of cities is labelled below.
	labelBelow: ['buffalo', 'rochester', 'syracuse'],
	bends: layout.bends,
	geography: [
		{ text: 'Lake\nErie', x: 0.07, y: 0.2, kind: 'sea' },
		{ text: 'Atlantic\nOcean', x: 0.95, y: 0.92, kind: 'sea' },
	],
};
