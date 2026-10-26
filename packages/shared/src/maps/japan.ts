import board from '../../../../rules/map-japan/map.json';
import { defineGameMap } from './define';
import type { DestinationTicket } from './types';

function ticket(cityA: string, cityB: string, points: number): DestinationTicket {
	return { id: `${cityA}-${cityB}`, cityA, cityB, points };
}

export const japan = defineGameMap(board, {
	id: 'japan',
	name: 'Japan',
	info: {
		tagline: 'Build the Shinkansen together, and race to lead it.',
		description:
			'A compact island chain from Kyushu to Hokkaido, with the Tokyo subway and Kyushu drawn as close-ups. Everyone may ride the bullet train lines, but only those who built the most of them earn the bonus.',
		gimmicks: [
			{
				title: 'Bullet trains',
				text: 'Pay for a gray bullet route as usual, place one shared white train and move up the bullet track instead of scoring.',
			},
			{
				title: 'Shared lines',
				text: 'Every player may use a claimed bullet route to complete tickets.',
			},
			{
				title: 'Bullet track',
				text: 'At the end, ranks on the bullet track earn up to +25; players who placed none lose 20.',
			},
			{
				title: 'Short supply',
				text: 'Only 16 bullet trains. The last round starts when a player is down to 2 trains and at most 2 bullet trains are left.',
			},
			{ title: 'Insets', text: 'Tokyo and Kokura appear twice; both spots are the same city.' },
		],
	},
	rules: {
		trainsPerPlayer: 20,
		openingTickets: { deal: 4, longDeal: 0, keep: 2 },
		longestPathBonus: 0,
	},
	tickets: [
		ticket('hakata', 'miyako', 19),
		ticket('masuda', 'sendai', 16),
		ticket('nagasaki', 'niigata', 16),
		ticket('hakata', 'ise', 14),
		ticket('hiroshima', 'hakodate', 14),
		ticket('kagoshima-chuo', 'tokyo', 13),
		ticket('osaka', 'shibuya', 13),
		ticket('kyoto', 'ikebukuro', 12),
		ticket('miyazaki', 'kyoto', 12),
		ticket('hakata', 'tokyo', 10),
		ticket('nagasaki', 'nagoya', 10),
		ticket('nagoya', 'shinjuku', 10),
		ticket('shinjuku', 'asakusa', 10),
		ticket('kyoto', 'aomori', 9),
		ticket('osaka', 'akita', 9),
		ticket('tottori', 'tokyo', 9),
		ticket('hakata', 'kanazawa', 8),
		ticket('hakata', 'kochi', 8),
		ticket('kagoshima-chuo', 'osaka', 8),
		ticket('kokura', 'tsuruga', 8),
		ticket('nagoya', 'iwaki', 8),
		ticket('tokyo', 'hakodate', 8),
		ticket('ginza', 'kita-senju', 7),
		ticket('ikebukuro', 'suitengumae', 7),
		ticket('kumamoto', 'takamatsu', 7),
		ticket('nagoya', 'shinjo', 7),
		ticket('osaka', 'fukushima', 7),
		ticket('shibuya', 'ueno', 7),
		ticket('yotsuya', 'monzen-nakacho', 7),
		ticket('ise', 'tokyo', 6),
		ticket('kochi', 'kyoto', 6),
		ticket('kyoto', 'narita', 6),
		ticket('matsuyama', 'nagoya', 6),
		ticket('nagano', 'suitengumae', 6),
		ticket('okayama', 'matsumoto', 6),
		ticket('tokyo', 'asakusa', 6),
		ticket('kyoto', 'niigata', 5),
		ticket('masuda', 'kyoto', 5),
		ticket('matsumoto', 'fukushima', 5),
		ticket('nagasaki', 'miyazaki', 5),
		ticket('osaka', 'tokyo', 5),
		ticket('takasaki', 'morioka', 5),
		ticket('sendai', 'aomori', 4),
		ticket('shinjuku', 'ikebukuro', 4),
		ticket('tokyo', 'shinjuku', 4),
		ticket('tottori', 'nagoya', 4),
		ticket('hakata', 'oita', 3),
		ticket('hamamatsu', 'utsunomiya', 3),
		ticket('hiroshima', 'osaka', 3),
		ticket('kagoshima-chuo', 'kokura', 3),
		ticket('osaka', 'nagano', 3),
		ticket('tokyo', 'sendai', 3),
		ticket('akita', 'miyako', 2),
		ticket('odawara', 'narita', 1),
	],
});
