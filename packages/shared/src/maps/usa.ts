import board from '../../../../rules/map-usa/map.json';
import { defineGameMap } from './define';
import type { DestinationTicket } from './types';

function ticket(cityA: string, cityB: string, points: number): DestinationTicket {
	return { id: `${cityA}-${cityB}`, cityA, cityB, points };
}

export const usa = defineGameMap(board, {
	id: 'usa',
	name: 'United States',
	info: {
		tagline: 'The classic cross-country race.',
		description:
			'Connect the great cities of North America, from the Pacific coast to the Atlantic. The original board: no special rules, just routes, tickets and the longest trail.',
		gimmicks: [
			{ title: 'Double routes', text: 'Both tracks of a double route open up with four or five players.' },
			{ title: 'Longest trail', text: 'The longest continuous path earns a 10 point bonus.' },
		],
	},
	tickets: [
		ticket('seattle', 'new-york', 22),
		ticket('los-angeles', 'new-york', 21),
		ticket('los-angeles', 'miami', 20),
		ticket('vancouver', 'montreal', 20),
		ticket('san-francisco', 'atlanta', 17),
		ticket('portland', 'nashville', 17),
		ticket('los-angeles', 'chicago', 16),
		ticket('montreal', 'new-orleans', 13),
		ticket('calgary', 'phoenix', 13),
		ticket('vancouver', 'santa-fe', 13),
		ticket('boston', 'miami', 12),
		ticket('winnipeg', 'houston', 12),
		ticket('portland', 'phoenix', 11),
		ticket('dallas', 'new-york', 11),
		ticket('denver', 'pittsburgh', 11),
		ticket('winnipeg', 'little-rock', 11),
		ticket('toronto', 'miami', 10),
		ticket('duluth', 'el-paso', 10),
		ticket('sault-ste-marie', 'oklahoma-city', 9),
		ticket('seattle', 'los-angeles', 9),
		ticket('chicago', 'santa-fe', 9),
		ticket('montreal', 'atlanta', 9),
		ticket('duluth', 'houston', 8),
		ticket('helena', 'los-angeles', 8),
		ticket('sault-ste-marie', 'nashville', 8),
		ticket('calgary', 'salt-lake-city', 7),
		ticket('chicago', 'new-orleans', 7),
		ticket('new-york', 'atlanta', 6),
		ticket('kansas-city', 'houston', 5),
		ticket('denver', 'el-paso', 4),
	],
});
