import { expect, test } from 'bun:test';
import { applyGameAction, createGame } from '../game';
import { getGameMap } from '.';

test('each Europe player is dealt one long and three regular tickets and keeps at least two', () => {
	const map = getGameMap('europe');
	const state = createGame({ mapId: 'europe', seed: 'europe-opening', botCount: 4 });
	for (const offer of Object.values(state.openingTicketOffers)) {
		expect(offer.map(id => Boolean(map.ticket(id)!.long))).toEqual([true, false, false, false]);
	}
	expect(state.destinationDeck).toHaveLength(40 - 15);

	const offer = state.openingTicketOffers.player!;
	expect(
		applyGameAction(state, { type: 'keep-opening-tickets', playerId: 'player', ticketIds: [offer[0]!] }),
	).toMatchObject({
		ok: false,
		error: 'Keep at least 2 tickets.',
	});
	const kept = applyGameAction(state, { type: 'keep-opening-tickets', playerId: 'player', ticketIds: offer.slice(2) });
	if (!kept.ok) throw new Error(kept.error);
	expect(kept.state.destinationDeck.slice(0, 1)).toEqual([offer[1]!]);
	expect(kept.state.destinationDeck).not.toContain(offer[0]);
});
