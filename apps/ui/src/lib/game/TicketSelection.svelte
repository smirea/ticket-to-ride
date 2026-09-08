<script lang="ts">
	import { USA_CITIES, type DestinationTicket, type TicketId } from '@repo/shared';
	import { ArrowRight, Check } from 'phosphor-svelte';
	import { scale } from 'svelte/transition';
	import DestinationCard from './DestinationCard.svelte';

	let {
		tickets,
		selectedIds,
		minimum,
		disabled = false,
		reduceMotion = false,
		ontoggle,
		onpreview,
		onkeep,
	}: {
		tickets: DestinationTicket[];
		selectedIds: TicketId[];
		minimum: number;
		disabled?: boolean;
		reduceMotion?: boolean;
		ontoggle: (id: TicketId) => void;
		onpreview: (id: TicketId | undefined) => void;
		onkeep: () => void;
	} = $props();
	const cityNames = new Map(USA_CITIES.map(city => [city.id, city.name]));
</script>

<div class="ticket-selection" class:reduced-motion={reduceMotion} aria-label="Choose destination tickets">
	<div class="offers">
		{#each tickets as ticket, index (ticket.id)}
			<button
				class="offer"
				data-offer-ticket={ticket.id}
				style={`--ticket-angle: ${[-0.9, 0.8, -0.5][index % 3]}deg`}
				aria-label={`${cityNames.get(ticket.cityA)} to ${cityNames.get(ticket.cityB)}, ${ticket.points} points`}
				aria-pressed={selectedIds.includes(ticket.id)}
				{disabled}
				onpointerenter={() => onpreview(ticket.id)}
				onpointerleave={() => onpreview(undefined)}
				onfocus={() => onpreview(ticket.id)}
				onblur={() => onpreview(undefined)}
				onclick={() => ontoggle(ticket.id)}
			>
				<DestinationCard {ticket} selected={selectedIds.includes(ticket.id)} />
				{#if selectedIds.includes(ticket.id)}
					<span class="kept" aria-hidden="true" transition:scale={{ duration: reduceMotion ? 0 : 160, start: 0.75 }}
						><Check size={12} weight="bold" /></span
					>
				{/if}
			</button>
		{/each}
	</div>
	<div class="selection-actions">
		<button class="keep" disabled={disabled || selectedIds.length < minimum} onclick={onkeep}>
			Keep tickets <ArrowRight size={16} />
		</button>
	</div>
</div>

<style>
	.ticket-selection {
		position: relative;
		width: 100%;
		padding: 12px 12px 9px;
		border: 1px solid #baa47e;
		border-radius: 4px 7px 5px 3px;
		background: #eaddbf;
		box-shadow:
			inset 0 0 0 3px #f7eed94d,
			0 2px 0 #a58b65,
			0 8px 12px #37281726,
			0 18px 22px #49331d14;
		transform: rotate(0.7deg);
		user-select: none;
	}
	.offers {
		display: flex;
		flex-direction: column;
		gap: 9px;
	}
	.offer {
		position: relative;
		width: 100%;
		height: 72px;
		padding: 0;
		border: 0;
		border-radius: 0;
		background: transparent;
		transform: rotate(var(--ticket-angle));
		cursor: pointer;
		transition:
			transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1),
			filter 220ms;
	}
	.offer :global(.destination-card) {
		min-height: 0;
	}
	.offer:hover:not(:disabled),
	.offer:focus-visible {
		z-index: 2;
		transform: translate(3px, -3px) rotate(0deg);
		filter: brightness(1.035);
	}
	.offer:focus-visible {
		outline: none;
	}
	.offer:focus-visible :global(.destination-card) {
		filter: drop-shadow(1px 0 0 #4e735f) drop-shadow(-1px 0 0 #4e735f) drop-shadow(0 1px 0 #4e735f)
			drop-shadow(0 -1px 0 #4e735f) drop-shadow(0 6px 5px #37271626);
	}
	.offer:disabled {
		cursor: default;
	}
	.kept {
		position: absolute;
		left: 11px;
		bottom: 10px;
		display: grid;
		place-items: center;
		width: 19px;
		height: 19px;
		border: 1px solid #f8f1d9;
		border-radius: 50%;
		background: #516f59;
		color: #fff8e5;
		pointer-events: none;
	}
	.selection-actions {
		display: flex;
		justify-content: flex-end;
		padding-top: 10px;
	}
	.keep {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 35px;
		padding: 8px 11px;
		border: 1px solid #526654;
		border-radius: 3px;
		background: #566e5c;
		color: #fff5dd;
		box-shadow:
			0 2px 0 #394f40,
			0 3px 5px #3f342025;
		font: inherit;
		font-size: 12px;
		font-weight: 650;
		cursor: pointer;
		transition:
			transform 160ms,
			opacity 180ms,
			background 180ms;
	}
	.keep:hover:not(:disabled) {
		transform: translateY(-1px);
		background: #47644e;
	}
	.keep:active:not(:disabled) {
		transform: translateY(1px);
	}
	.keep:disabled {
		opacity: 0.45;
		cursor: default;
	}
	.reduced-motion .offer,
	.reduced-motion .keep {
		transition-duration: 0ms;
	}
	@media (prefers-reduced-motion: reduce) {
		.offer,
		.keep {
			transition-duration: 0ms;
		}
	}
</style>
