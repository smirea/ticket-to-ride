<script lang="ts">
	import type { Player } from '@repo/shared';
	import { playerPortraitAssets } from './assets';
	import PointsSeal from './PointsSeal.svelte';
	import TicketCountIcon from './TicketCountIcon.svelte';
	import TrainPieceIcon from './TrainPieceIcon.svelte';
	let {
		player,
		viewerId,
		active,
		color,
		index = 0,
		completedTickets,
	}: {
		player: Player;
		viewerId: string;
		active: boolean;
		color: string;
		index?: number;
		completedTickets?: number;
	} = $props();
	const handCount = $derived(Object.values(player.hand).reduce((sum, count) => sum + count, 0));
	const completed = $derived(
		completedTickets === undefined ? undefined : Math.max(0, Math.min(player.tickets.length, completedTickets)),
	);
	const unfinished = $derived(completed === undefined ? undefined : player.tickets.length - completed);
</script>

<div
	class="player-plaque"
	class:active
	style:--player-color={color}
	style:--rest-angle={`${[-0.7, 0.6, -0.4, 0.8, -0.6][index % 5]}deg`}
	aria-label={`${player.name}: ${player.score} points, ${player.trains} trains, ${handCount} cards, ${player.tickets.length} tickets${completed === undefined ? '' : `, ${completed} completed, ${unfinished} unfinished`}`}
	aria-current={active ? 'true' : undefined}
>
	<div class="portrait">
		<img src={playerPortraitAssets[player.color]} alt="" draggable="false" />
	</div>
	<div class="ledger">
		<div class="score"><span class="points-icon"><PointsSeal /></span><strong>{player.score}</strong></div>
		<div class="ticket-counts">
			{#if unfinished === undefined}
				{#if player.tickets.length > 0}<span aria-label={`${player.tickets.length} tickets`}
						><strong>{player.tickets.length}</strong><TicketCountIcon width={17} height={14} /></span
					>{/if}
			{:else}
				{#if unfinished > 0}<span aria-label={`${unfinished} unfinished tickets`}
						><strong>{unfinished}</strong><TicketCountIcon width={17} height={14} /></span
					>{/if}
				{#if completed && completed > 0}<span aria-label={`${completed} completed tickets`}
						><strong>{completed}</strong><TicketCountIcon complete width={17} height={14} /></span
					>{/if}
			{/if}
		</div>
		<div class="supplies">
			<span aria-label={`${player.trains} remaining carriages`}
				><strong>{player.trains}</strong><TrainPieceIcon color="currentColor" width={15} height={14} /></span
			>
			<span aria-label={`${handCount} train cards`}
				><strong>{handCount}</strong><svg width="11" height="15" viewBox="0 0 16 20" aria-hidden="true"
					><path d="m3 3 9-2 3 15-9 2Z" fill="none" stroke="currentColor" /><rect
						x="1"
						y="4"
						width="10"
						height="15"
						rx="1.5"
						fill="none"
						stroke="currentColor"
						stroke-width="1.4"
					/><path d="M3 7h6M3 15h6" stroke="currentColor" /></svg
				></span
			>
		</div>
	</div>
	<strong class="name" title={player.name}>{player.id === viewerId ? 'You' : player.name}</strong>
	<span class="turn-gear" class:turning={active} aria-hidden="true">
		<svg width="30" height="30" viewBox="0 0 40 40">
			<g fill="#b88a42" stroke="#62451f" stroke-width="1">
				{#each Array(12) as _, tooth}<rect
						x="17"
						y="1"
						width="6"
						height="8"
						rx="1"
						transform={`rotate(${tooth * 30} 20 20)`}
					/>{/each}
				<circle cx="20" cy="20" r="14.5" />
			</g>
			<circle cx="20" cy="20" r="11" fill="#40372c" stroke="#f5d798" stroke-width="2" />
			<path d="M20 9v22M9 20h22m-19-8 16 16m0-16L12 28" stroke="#ca9f57" stroke-width="3" />
			<circle cx="20" cy="20" r="5" fill="#e9c37a" stroke="#674a24" stroke-width="1.5" />
			<circle cx="20" cy="20" r="1.5" fill="#56412c" />
		</svg>
	</span>
</div>

<style>
	.player-plaque {
		position: relative;
		display: grid;
		grid-template-columns: 30% minmax(0, 1fr) 14px;
		gap: 3px;
		flex: 0 1 174px;
		width: clamp(138px, 11.2vw, 174px);
		min-width: 0;
		height: 112px;
		padding: 7px 8px 7px 7px;
		border: 1px solid #9c8257;
		border-radius: 10px 5px 9px 5px;
		background: linear-gradient(
			115deg,
			color-mix(in srgb, var(--player-color) 78%, #342d28),
			color-mix(in srgb, var(--player-color) 65%, #231e20)
		);
		color: #fff3d6;
		box-shadow:
			inset 0 0 0 2px #e9d2a6,
			inset 0 0 0 3px #96774988,
			0 2px #b89c6a,
			0 4px #705d3e,
			3px 8px 9px #34271d33;
		transform: rotate(var(--rest-angle));
		transform-origin: 50% 80%;
		transition:
			transform 330ms cubic-bezier(0.2, 0.8, 0.2, 1),
			box-shadow 330ms,
			background 330ms,
			color 330ms;
		user-select: none;
	}
	.player-plaque::after {
		content: '';
		position: absolute;
		inset: 4px;
		border: 1px solid color-mix(in srgb, var(--player-color) 55%, transparent);
		border-radius: 6px 2px 5px 2px;
		pointer-events: none;
	}
	.active {
		transform: translateY(-8px) rotate(-0.3deg);
		background: linear-gradient(
			115deg,
			color-mix(in srgb, var(--player-color) 78%, #342d28),
			color-mix(in srgb, var(--player-color) 65%, #231e20)
		);
		color: #fff3d6;
		box-shadow:
			inset 0 0 0 2px #e6c98d,
			inset 0 0 0 3px #987445,
			0 2px #b69b65,
			0 4px #695535,
			4px 17px 15px #30261950;
		z-index: 2;
	}
	.portrait {
		position: relative;
		min-width: 0;
		overflow: hidden;
		border-radius: 4px 1px 3px 1px;
		border: 1px solid #a4895b99;
		background: #d0bb91;
	}
	.portrait img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: 50% 32%;
		transform: scale(1.08);
	}
	.ledger {
		min-width: 0;
		display: grid;
		grid-template-rows: 1.25fr 1fr 1fr;
		font-variant-numeric: tabular-nums;
	}
	.name {
		writing-mode: vertical-rl;
		text-orientation: mixed;
		text-align: center;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font:
			700 14px/17px Georgia,
			serif;
		border-left: 1px solid #ead5a33d;
	}
	.score,
	.ticket-counts,
	.supplies,
	.ticket-counts span,
	.supplies span {
		display: flex;
		align-items: center;
	}
	.score {
		gap: 5px;
	}
	.score > strong {
		font:
			600 26px/1 Georgia,
			serif;
	}
	.points-icon {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
	}
	.ticket-counts,
	.supplies {
		gap: 6px;
		border-top: 1px solid #ead5a32e;
	}
	.ticket-counts span,
	.supplies span {
		gap: 2px;
		white-space: nowrap;
	}
	.ticket-counts strong,
	.supplies strong {
		font:
			600 15px/1 Georgia,
			serif;
	}
	.ticket-counts :global(svg),
	.supplies svg {
		flex-shrink: 0;
	}
	.turn-gear {
		position: absolute;
		left: -9px;
		bottom: -10px;
		width: 30px;
		height: 30px;
		filter: drop-shadow(1px 2px 1px #34271d88);
		color: #f5d99e;
		opacity: 0;
		pointer-events: none;
		transition: opacity 240ms;
		animation: clockwork 9s linear infinite;
		animation-play-state: paused;
	}
	.turn-gear.turning {
		opacity: 0.85;
		animation-play-state: running;
	}
	@keyframes clockwork {
		to {
			transform: rotate(360deg);
		}
	}
	@media (max-width: 1100px) {
		.player-plaque {
			flex: 1 1 0;
			width: auto;
			max-width: 178px;
			height: 99px;
			gap: 5px;
			padding: 6px;
		}
		.player-plaque {
			grid-template-columns: 32% minmax(0, 1fr) 14px;
			gap: 3px;
		}
		.name {
			font-size: 12px;
			line-height: 14px;
		}
		.score {
			gap: 3px;
		}
		.score > strong {
			font-size: 23px;
		}
		.points-icon {
			width: 17px;
			height: 17px;
		}
		.ticket-counts,
		.supplies {
			gap: 3px;
		}
		.ticket-counts strong,
		.supplies strong {
			font-size: 13px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.turn-gear {
			animation: none;
			transition: none;
		}
		.player-plaque {
			transition: none;
		}
	}
</style>
