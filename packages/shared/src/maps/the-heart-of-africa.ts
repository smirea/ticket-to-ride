import board from '../../../../rules/map-the-heart-of-africa/map.json';
import { defineGameMap } from './define';
import type { DestinationTicket } from './types';

function ticket(cityA: string, cityB: string, points: number): DestinationTicket {
	return { id: `${cityA}-${cityB}`, cityA, cityB, points };
}

export const theHeartOfAfrica = defineGameMap(board, {
	id: 'the-heart-of-africa',
	name: 'Heart of Africa',
	info: {
		tagline: 'Rail through the wilderness of 1910 Africa.',
		description:
			'A tall board from the Sahel to the Cape, threaded with jungle, desert and mountain lines. Collect terrain cards to double the points of the routes you claim, as long as nobody holds more of that terrain than you.',
		gimmicks: [
			{
				title: 'Terrain cards',
				text: 'Draw terrain cards instead of train cards. Play 1 (or 2 on long routes) to double a route’s points while you hold at least as many of that terrain as anyone.',
			},
			{ title: 'Wild terrain', text: 'Locomotives can stand in for terrain cards when you double a route.' },
			{
				title: 'Countries',
				text: 'Madagascar, Nigeria, Chad and Sudan are dead ends: routes into the same country do not connect.',
			},
			{ title: 'Ferries', text: 'Crossings to Madagascar need a locomotive for each printed locomotive.' },
			{ title: 'Globetrotter', text: 'Most completed tickets earns 10 points; there is no longest path bonus.' },
		],
	},
	rules: {
		openingTickets: { deal: 4, longDeal: 0, keep: 2 },
		ticketDraw: { deal: 4, keep: 1 },
		longestPathBonus: 0,
		globetrotterBonus: 10,
	},
	ticketValues: 'printed',
	tickets: [
		ticket('madagascar', 'libreville', 27),
		ticket('bondo', 'cape-town', 22),
		ticket('ngaoundere', 'beira', 22),
		ticket('bangui', 'port-elizabeth', 21),
		ticket('sudan', 'beira', 21),
		ticket('durban', 'addis-ababa', 20),
		ticket('fachoda', 'pretoria', 20),
		ticket('nigeria', 'durban', 20),
		ticket('bogoro', 'port-nolloth', 19),
		ticket('luanda', 'dar-es-salaam', 19),
		ticket('mombasa', 'cape-town', 19),
		ticket('bangui', 'mocambique', 18),
		ticket('chad', 'windhoek', 18),
		ticket('serpa-pinto', 'port-florence', 18),
		ticket('addis-ababa', 'libreville', 17),
		ticket('douala', 'cape-town', 17),
		ticket('nigeria', 'addis-ababa', 17),
		ticket('port-florence', 'bloemfontein', 17),
		ticket('mocamedes', 'zomba', 16),
		ticket('leopoldville', 'mombasa', 15),
		ticket('mocamedes', 'durban', 15),
		ticket('addis-ababa', 'mocambique', 14),
		ticket('chad', 'mombasa', 14),
		ticket('dar-es-salaam', 'east-london', 14),
		ticket('leopoldville', 'bulawayo', 14),
		ticket('ujiji', 'east-london', 14),
		ticket('bogoro', 'madagascar', 13),
		ticket('fachoda', 'cabinda', 13),
		ticket('luanda', 'elizabethville', 13),
		ticket('serpa-pinto', 'cape-town', 13),
		ticket('cabinda', 'pretoria', 12),
		ticket('nigeria', 'walvis-bay', 12),
		ticket('bulawayo', 'port-nolloth', 11),
		ticket('leopoldville', 'walvis-bay', 11),
		ticket('mocambique', 'port-elizabeth', 11),
		ticket('sudan', 'ngaoundere', 11),
		ticket('elizabethville', 'durban', 9),
		ticket('durban', 'cape-town', 8),
		ticket('livingstonia', 'madagascar', 8),
		ticket('ujiji', 'dar-es-salaam', 8),
		ticket('windhoek', 'bloemfontein', 8),
		ticket('douala', 'bondo', 7),
		ticket('madagascar', 'pretoria', 7),
		ticket('mombasa', 'zomba', 7),
		ticket('nigeria', 'leopoldville', 7),
		ticket('pretoria', 'cape-town', 7),
		ticket('mocambique', 'salisbury', 6),
		ticket('salisbury', 'pretoria', 5),
	],
});
