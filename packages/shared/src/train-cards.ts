import type { TrainColor } from './maps/types';

// Kept free of imports from game.ts so mechanics can build schemas from them at module load.
export const TRAIN_COLORS = [
	'red',
	'orange',
	'yellow',
	'green',
	'blue',
	'purple',
	'black',
	'white',
] as const satisfies readonly TrainColor[];
export const TRAIN_CARDS = [...TRAIN_COLORS, 'locomotive'] as const;
