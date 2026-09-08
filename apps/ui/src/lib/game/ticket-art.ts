import type { DestinationTicket } from '@repo/shared';

export function getTicketArtwork(ticket: Pick<DestinationTicket, 'id'>): string {
	return `/game-assets/atlas/tickets-engraved/${ticket.id}.webp`;
}
