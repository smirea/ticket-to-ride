import board from '../../../../rules/map-pennsylvania/map.json';
import { DEFAULT_RULES, defineGameMap } from './define';
import type { DestinationTicket } from './types';

function ticket(cityA: string, cityB: string, points: number): DestinationTicket {
	return { id: `${cityA}-${cityB}`, cityA, cityB, points };
}

export const pennsylvania = defineGameMap(board, {
	id: 'pennsylvania',
	name: 'Pennsylvania',
	info: {
		tagline: 'Lay track and buy into the great railroads of the Keystone State.',
		description:
			'A tight web of lines from Lake Erie to the Atlantic shore, where most routes carry the logos of rival railroads. Every claim buys a stock share, and the biggest shareholders in each railroad cash in at the end.',
		gimmicks: [
			{
				title: 'Stock shares',
				text: 'Claiming a route takes the top share of one railroad printed on it. Most shares in a railroad scores the most; ties go to whoever bought first.',
			},
			{
				title: 'Dummy shareholder',
				text: 'With two players, each share you take also hands one to a silent third investor who can block your majorities.',
			},
			{ title: 'Globetrotter', text: 'Most completed tickets earns 15 points; there is no longest-route bonus.' },
			{ title: 'Ferries', text: 'The two crossings to Ontario need a locomotive for each printed locomotive.' },
			{ title: 'Bigger ticket hands', text: 'Start with 5 tickets and keep 3; later draws offer 4 and keep 1.' },
		],
	},
	rules: {
		routeScores: { ...DEFAULT_RULES.routeScores, 7: 18 },
		openingTickets: { deal: 5, longDeal: 0, keep: 3 },
		ticketDraw: { deal: 4, keep: 1 },
		longestPathBonus: 0,
		globetrotterBonus: 15,
	},
	tickets: [
		ticket('wheeling', 'albany', 22),
		ticket('erie', 'albany', 20),
		ticket('pittsburgh', 'new-york', 20),
		ticket('buffalo', 'philadelphia', 19),
		ticket('buffalo', 'new-york', 18),
		ticket('youngstown', 'scranton-wilkes-barre', 17),
		ticket('baltimore', 'albany', 16),
		ticket('buffalo', 'baltimore', 16),
		ticket('pittsburgh', 'philadelphia', 15),
		ticket('wheeling', 'allentown', 15),
		ticket('oil-city', 'scranton-wilkes-barre', 14),
		ticket('youngstown', 'rochester', 14),
		ticket('buffalo', 'harrisburg', 13),
		ticket('morgantown', 'williamsport', 13),
		ticket('pittsburgh', 'baltimore', 13),
		ticket('rochester', 'reading', 13),
		ticket('dubois', 'stroudsburg', 12),
		ticket('harrisburg', 'new-york', 11),
		ticket('baltimore', 'new-york', 10),
		ticket('buffalo', 'johnstown', 10),
		ticket('johnstown', 'elmira', 10),
		ticket('ontario', 'pittsburgh', 10),
		ticket('ontario', 'syracuse', 10),
		ticket('pittsburgh', 'buffalo', 10),
		ticket('warren', 'york', 10),
		ticket('williamsport', 'albany', 10),
		ticket('altoona', 'binghamton', 9),
		ticket('lewiston', 'syracuse', 9),
		ticket('pittsburgh', 'harrisburg', 9),
		ticket('towanda', 'lancaster', 9),
		ticket('wheeling', 'erie', 9),
		ticket('chambersburg', 'scranton-wilkes-barre', 8),
		ticket('erie', 'altoona', 8),
		ticket('syracuse', 'allentown', 8),
		ticket('coudersport', 'binghamton', 7),
		ticket('morgantown', 'chambersburg', 7),
		ticket('youngstown', 'morgantown', 7),
		ticket('dubois', 'cumberland', 6),
		ticket('harrisburg', 'philadelphia', 6),
		ticket('new-york', 'atlantic-city', 6),
		ticket('oil-city', 'johnstown', 6),
		ticket('philadelphia', 'new-york', 6),
		ticket('ontario', 'warren', 5),
		ticket('baltimore', 'philadelphia', 4),
		ticket('cumberland', 'harrisburg', 4),
		ticket('gettysburg', 'reading', 3),
		ticket('harrisburg', 'baltimore', 3),
		ticket('rochester', 'elmira', 3),
		ticket('scranton-wilkes-barre', 'allentown', 3),
		ticket('philadelphia', 'atlantic-city', 2),
	],
});
