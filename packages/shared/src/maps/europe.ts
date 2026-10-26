import board from '../../../../rules/map-europe/map.json';
import { defineGameMap } from './define';
import type { DestinationTicket } from './types';

function ticket(cityA: string, cityB: string, points: number, long = false): DestinationTicket {
	return { id: `${cityA}-${cityB}`, cityA, cityB, points, ...(long ? { long } : {}) };
}

export const europe = defineGameMap(board, {
	id: 'europe',
	name: 'Europe',
	info: {
		tagline: 'Across the continent, from Edinburgh to Erzurum.',
		description:
			'Link the capitals of early 20th century Europe over mountains and seas. Tunnels can cost more than they look, ferries need locomotives, and a station lets you ride an opponent’s line.',
		gimmicks: [
			{
				title: 'Long tickets',
				text: 'Everyone starts with one long ticket and three regular ones, and keeps at least two.',
			},
			{ title: 'Ferries', text: 'Sea routes need one locomotive for each locomotive printed on them.' },
			{
				title: 'Tunnels',
				text: 'Claiming a tunnel reveals three cards; each one matching your color costs an extra card, or you give up.',
			},
			{
				title: 'Stations',
				text: 'Build up to three stations for 1, 2 and 3 cards. Each one borrows one opponent route for your tickets; unused stations score 4.',
			},
			{ title: 'European Express', text: 'The longest continuous path earns 10 points. The 8-space route scores 21.' },
		],
	},
	rules: {
		routeScores: { 1: 1, 2: 2, 3: 4, 4: 7, 5: 10, 6: 15, 7: 18, 8: 21 },
		openingTickets: { deal: 3, longDeal: 1, keep: 2 },
		mechanics: { stations: { costs: [1, 2, 3], unusedPoints: 4 } },
	},
	tickets: [
		ticket('lisboa', 'danzig', 20, true),
		ticket('brest', 'petrograd', 20, true),
		ticket('palermo', 'moskva', 20, true),
		ticket('kobenhavn', 'erzurum', 21, true),
		ticket('edinburgh', 'athina', 21, true),
		ticket('cadiz', 'stockholm', 21, true),
		ticket('frankfurt', 'smolensk', 13),
		ticket('berlin', 'moskva', 12),
		ticket('amsterdam', 'wilno', 12),
		ticket('athina', 'wilno', 11),
		ticket('stockholm', 'wien', 11),
		ticket('angora', 'kharkov', 10),
		ticket('riga', 'bucuresti', 10),
		ticket('essen', 'kyiv', 10),
		ticket('venezia', 'constantinople', 10),
		ticket('london', 'wien', 10),
		ticket('bruxelles', 'danzig', 9),
		ticket('berlin', 'roma', 9),
		ticket('roma', 'smyrna', 8),
		ticket('palermo', 'constantinople', 8),
		ticket('sarajevo', 'sevastopol', 8),
		ticket('madrid', 'dieppe', 8),
		ticket('barcelona', 'bruxelles', 8),
		ticket('paris', 'wien', 8),
		ticket('barcelona', 'munchen', 8),
		ticket('brest', 'venezia', 8),
		ticket('smolensk', 'rostov', 8),
		ticket('marseille', 'essen', 8),
		ticket('kyiv', 'sochi', 8),
		ticket('madrid', 'zurich', 8),
		ticket('berlin', 'bucuresti', 8),
		ticket('paris', 'zagrab', 7),
		ticket('brest', 'marseille', 7),
		ticket('london', 'berlin', 7),
		ticket('edinburgh', 'paris', 7),
		ticket('amsterdam', 'pamplona', 7),
		ticket('kyiv', 'petrograd', 6),
		ticket('zurich', 'brindisi', 6),
		ticket('zurich', 'budapest', 6),
		ticket('warszawa', 'smolensk', 6),
		ticket('zagrab', 'brindisi', 6),
		ticket('athina', 'angora', 5),
		ticket('budapest', 'sofia', 5),
		ticket('frankfurt', 'kobenhavn', 5),
		ticket('rostov', 'erzurum', 5),
		ticket('sofia', 'smyrna', 5),
	],
});
