<script lang="ts">
	import { USA_CITIES, type DestinationTicket, type GameState } from '@repo/shared';
	import XIcon from 'phosphor-svelte/lib/XIcon';
	import CardsIcon from 'phosphor-svelte/lib/CardsIcon';
	import TicketIcon from 'phosphor-svelte/lib/TicketIcon';
	import BookOpenIcon from 'phosphor-svelte/lib/BookOpenIcon';
	import { fly } from 'svelte/transition';
	import { onDestroy } from 'svelte';
	import PointsSeal from './PointsSeal.svelte';
	import TrainPieceIcon from './TrainPieceIcon.svelte';
	import { journalRows, type JournalRow } from './journal';
	import { routeColors } from './board/layout';

	let {
		state,
		viewerId,
		onclose,
		onpreview,
		reduceMotion = false,
	}: {
		state: GameState;
		viewerId: string;
		onclose: () => void;
		reduceMotion?: boolean;
		onpreview?: (value: { routeId?: string; ticket?: DestinationTicket } | undefined) => void;
	} = $props();
	const colors: Record<string, string> = {
		red: '#ae3e32',
		orange: '#bb6a25',
		yellow: '#a17b16',
		green: '#426a4c',
		blue: '#296c92',
		purple: '#795586',
		black: '#343d40',
		white: '#eee4cc',
		locomotive: '#617077',
	};
	const cities = new Map(USA_CITIES.map(city => [city.id, city.name]));
	const ticketName = (ticket: DestinationTicket) => `${cities.get(ticket.cityA)}–${cities.get(ticket.cityB)}`;
	let rows = $derived(journalRows(state, viewerId));
	function preview(row: JournalRow) {
		onpreview?.(row.routeId ? { routeId: row.routeId } : row.tickets?.[0] ? { ticket: row.tickets[0] } : undefined);
	}
	function close() {
		onpreview?.(undefined);
		onclose();
	}
	onDestroy(() => onpreview?.(undefined));
</script>

<svelte:window
	onkeydown={event => {
		if (event.key === 'Escape') {
			event.preventDefault();
			close();
		}
	}}
/>

<aside class="journal" aria-label="Travel logbook" transition:fly={{ y: -10, duration: reduceMotion ? 0 : 180 }}>
	<header>
		<h2><BookOpenIcon size={22} /> Logbook</h2>
		<button class="close" onclick={close} aria-label="Close logbook"><XIcon size={20} /></button>
	</header>
	<div class="pages" tabindex="0" role="region" aria-label="Recent turns">
		{#each rows as row (row.id)}
			<div class="entry" class:quiet={row.kind === 'note'}>
				<button
					class="entry-main"
					class:previewable={!!row.routeId || !!row.tickets?.length}
					onmouseenter={() => preview(row)}
					onmouseleave={() => onpreview?.(undefined)}
					onfocus={() => preview(row)}
					onblur={() => onpreview?.(undefined)}
					onclick={() => preview(row)}
				>
					{#if row.player}<strong style:color={colors[row.player.color]}>{row.player.name}</strong>{/if}
					<span>{row.text}</span>
					{#if row.cards}<span class="pieces"
							>{#each row.cards as card}<span
									class="piece"
									role="img"
									aria-label={card === 'deck' ? 'blind train card' : `${card} train card`}
									>{#if card === 'deck'}<CardsIcon size={22} />{:else}<TrainPieceIcon
											color={card === 'locomotive' ? '#405e65' : routeColors[card]}
											locomotive={card === 'locomotive'}
											width={25}
											height={21}
										/>{/if}</span
								>{/each}</span
						>{/if}
					{#if row.payment}<span class="pieces payment">
							{#if row.payment.cars !== 0}<span
									class="piece"
									role="img"
									aria-label={row.payment.cars === undefined
										? `${row.payment.color} payment; locomotive count not recorded`
										: `${row.payment.cars} ${row.payment.color} ${row.payment.cars === 1 ? 'car' : 'cars'}`}
								>
									{#if row.payment.cars !== undefined}<b>{row.payment.cars}</b>{/if}<TrainPieceIcon
										color={routeColors[row.payment.color]}
										width={25}
										height={21}
									/>
								</span>{/if}
							{#if row.payment.locomotives}<span
									class="piece"
									role="img"
									aria-label={`${row.payment.locomotives} ${row.payment.locomotives === 1 ? 'locomotive' : 'locomotives'}`}
									><b>{row.payment.locomotives}</b><TrainPieceIcon
										color="#405e65"
										locomotive
										width={25}
										height={21}
									/></span
								>{/if}
						</span>{/if}
					{#if row.kind === 'tickets'}<span class="pieces" aria-label={`${row.count} destination tickets`}
							><TicketIcon size={23} /><span>{row.count}</span></span
						>{/if}
					{#if row.points !== undefined}<span class="award" aria-label={`${row.points} points`}
							><b>{row.points}</b><span class="seal"><PointsSeal /></span></span
						>{/if}
				</button>
				{#if row.tickets?.length}<div class="ticket-previews">
						{#each row.tickets as ticket}<button
								aria-label={`Preview ${ticketName(ticket)}`}
								onmouseenter={() => onpreview?.({ ticket })}
								onmouseleave={() => onpreview?.(undefined)}
								onfocus={() => onpreview?.({ ticket })}
								onblur={() => onpreview?.(undefined)}
								onclick={() => onpreview?.({ ticket })}><TicketIcon size={18} />{ticketName(ticket)}</button
							>{/each}
					</div>{/if}
			</div>
		{:else}<p>The journey is about to begin.</p>{/each}
	</div>
</aside>

<style>
	.journal {
		position: absolute;
		z-index: 35;
		right: 24px;
		top: 88px;
		width: min(390px, calc(100% - 48px));
		max-height: min(560px, calc(100dvh - 130px));
		display: flex;
		flex-direction: column;
		color: #443d30;
		background: #f6eedb;
		border: 1px solid #ab9570;
		border-left: 9px solid #655340;
		border-radius: 3px 9px 9px 3px;
		box-shadow:
			2px 3px 0 #dbcdb1,
			4px 6px 0 #bbaa8d,
			6px 13px 25px #33251935;
		overflow: hidden;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 18px 13px;
		border-bottom: 1px solid #b5a48888;
	}
	h2 {
		display: flex;
		align-items: center;
		gap: 9px;
		margin: 0;
		font:
			600 23px/1.2 Georgia,
			serif;
	}
	button {
		font: inherit;
		color: inherit;
		cursor: pointer;
	}
	.close {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		background: transparent;
		border: 1px solid #b5a48877;
		border-radius: 50%;
	}
	.pages {
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 2px 14px 14px;
		scrollbar-width: thin;
	}
	.entry {
		border-bottom: 1px solid #b5a48855;
	}
	.entry-main {
		display: flex;
		width: 100%;
		align-items: center;
		flex-wrap: wrap;
		gap: 5px;
		text-align: left;
		border: 0;
		background: transparent;
		padding: 11px 3px;
		font-size: 15px;
		line-height: 1.35;
		border-radius: 3px;
	}
	.entry-main:not(.previewable) {
		cursor: default;
	}
	strong {
		font-weight: 700;
	}
	.pieces {
		display: inline-flex;
		gap: 3px;
		align-items: center;
		vertical-align: middle;
	}
	.piece {
		gap: 2px;
		display: inline-flex;
		align-items: center;
	}
	.award {
		margin-left: auto;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-variant-numeric: tabular-nums;
	}
	.award b {
		font:
			700 20px/1 Georgia,
			serif;
	}
	.seal {
		width: 23px;
		height: 23px;
	}
	.quiet .entry-main {
		color: #766d5b;
		font-size: 13px;
	}
	.previewable:hover,
	.previewable:focus-visible,
	.ticket-previews button:hover {
		background: #d4bc8033;
	}
	button:focus-visible,
	.pages:focus-visible {
		outline: 2px solid #887447;
		outline-offset: -2px;
	}
	.ticket-previews {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		padding: 0 3px 9px;
	}
	.ticket-previews button {
		display: inline-flex;
		gap: 3px;
		align-items: center;
		border: 1px solid #b5a48877;
		border-radius: 3px;
		background: transparent;
		padding: 3px 7px;
	}
	p {
		margin: 16px 3px;
		color: #766d5b;
	}
	@media (prefers-reduced-motion: reduce) {
		.journal {
			animation-duration: 0.01ms !important;
		}
	}
	@media (max-width: 1000px) {
		.journal {
			right: 18px;
			top: 80px;
			width: 340px;
		}
	}
</style>
