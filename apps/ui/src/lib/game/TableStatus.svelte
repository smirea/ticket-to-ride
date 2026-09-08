<script lang="ts">
	import type { Player } from '@repo/shared';
	import { playerPortraitAssets } from './assets';

	let {
		player,
		viewerId,
		active,
		message,
		detail,
	}: {
		player: Player | undefined;
		viewerId: string;
		active: boolean;
		message: string;
		detail?: string;
	} = $props();
</script>

<div class="table-status" class:active role="status" aria-live="polite" aria-atomic="true">
	<svg class="ticket-shape" viewBox="0 0 360 100" preserveAspectRatio="none" aria-hidden="true">
		<path class="paper" d="M3 3H265A15 15 0 0 0 295 3H357V97H295A15 15 0 0 0 265 97H3Z" />
		<path class="rim" d="M8 8H262A19 19 0 0 0 298 8H352V92H298A19 19 0 0 0 262 92H8Z" />
		<path class="perforation" d="M280 22V78" />
	</svg>
	<div class="message">
		<strong>{message}</strong>
		{#if detail}<span>{detail}</span>{/if}
	</div>
	<div class="stub">
		{#if player}<img src={playerPortraitAssets[player.color]} alt="" draggable="false" />{/if}
		<span>{player?.id === viewerId ? 'Your turn' : player ? `${player.name}’s turn` : 'Journey complete'}</span>
	</div>
</div>

<style>
	.table-status {
		--paper: #e6e1d3;
		--ink: #6c716a;
		position: relative;
		display: grid;
		grid-template-columns: 77.8% 22.2%;
		width: 100%;
		min-height: 82px;
		color: var(--ink);
		filter: drop-shadow(0 1px 0 #967c53) drop-shadow(1px 5px 5px #3e2d282b);
		transform: rotate(-1.1deg);
		user-select: none;
		transition:
			color 350ms,
			filter 250ms;
	}
	.active {
		--paper: #fff0c7;
		--ink: #263a43;
	}
	.ticket-shape {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}
	.paper {
		fill: var(--paper);
		stroke: #a28b64;
		stroke-width: 1;
		vector-effect: non-scaling-stroke;
		transition: fill 350ms;
	}
	.rim {
		fill: none;
		stroke: #9e885b77;
		stroke-width: 0.7;
		vector-effect: non-scaling-stroke;
	}
	.perforation {
		stroke: #ab977078;
		stroke-width: 1.5;
		stroke-dasharray: 3 4;
		vector-effect: non-scaling-stroke;
	}
	.message,
	.stub {
		position: relative;
		z-index: 1;
	}
	.message {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 5px;
		padding: 16px 15px 16px 18px;
	}
	.message strong {
		font-family: 'Barlow Condensed', sans-serif;
		font-size: clamp(18px, 1.45vw, 23px);
		font-weight: 650;
		line-height: 1.06;
	}
	.message > span {
		font-size: 11px;
		line-height: 1.2;
		opacity: 0.7;
	}
	.stub {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 5px;
		padding: 13px 8px 13px 4px;
		text-align: center;
	}
	.stub img {
		width: 31px;
		height: 31px;
		border: 1px solid #8c7953;
		border-radius: 50%;
		object-fit: cover;
		filter: saturate(0.55);
		transition: filter 350ms;
	}
	.active .stub img {
		filter: saturate(0.95);
	}
	.stub span {
		overflow-wrap: anywhere;
		font-size: 10px;
		font-weight: 650;
		line-height: 1.1;
	}
</style>
