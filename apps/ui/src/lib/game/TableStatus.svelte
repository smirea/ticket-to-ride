<script lang="ts">
	import type { Player } from '@repo/shared';
	import GameText from './GameText.svelte';

	let {
		player,
		active,
		yourTurn,
		message,
		detail,
	}: {
		player: Player | undefined;
		viewerId: string;
		active: boolean;
		yourTurn: boolean;
		message: string;
		detail?: string;
	} = $props();
	const outline = 'M3 3H265A15 15 0 0 0 295 3H357V97H295A15 15 0 0 0 265 97H3Z';
	let ticket = $state<HTMLDivElement>();
	let flash = $state<SVGSVGElement>();

	// Only transform and opacity animate, so the announcement stays on the compositor while the board animates.
	$effect(() => {
		if (!yourTurn || !ticket || !flash || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const rest = 'translate(0, 0) rotate(-1.1deg) scale(1)';
		const bump = 'translate(0, -2px) rotate(-1.6deg) scale(1.035)';
		const slap = ticket.animate(
			[
				{ transform: 'translate(-26px, -18px) rotate(-7deg) scale(1.12)', opacity: 0.4, offset: 0 },
				{ transform: 'translate(1px, 2px) rotate(0.2deg) scale(0.985)', opacity: 1, offset: 0.16 },
				{ transform: rest, offset: 0.24 },
				{ transform: bump, offset: 0.36 },
				{ transform: rest, offset: 0.48 },
				{ transform: bump, offset: 0.6 },
				{ transform: rest, offset: 0.72 },
				{ transform: bump, offset: 0.84 },
				{ transform: rest, offset: 1 },
			],
			{ duration: 2600, easing: 'ease-in-out' },
		);
		const glow = flash.animate(
			[
				{ opacity: 0, offset: 0 },
				{ opacity: 0, offset: 0.2 },
				{ opacity: 1, offset: 0.36 },
				{ opacity: 0.15, offset: 0.48 },
				{ opacity: 1, offset: 0.6 },
				{ opacity: 0.15, offset: 0.72 },
				{ opacity: 0.85, offset: 0.84 },
				{ opacity: 0, offset: 1 },
			],
			{ duration: 2600, easing: 'ease-in-out' },
		);
		return () => {
			slap.cancel();
			glow.cancel();
		};
	});
</script>

<div class="table-status" class:active role="status" aria-live="polite" aria-atomic="true" bind:this={ticket}>
	<svg class="ticket-shape" viewBox="0 0 360 100" preserveAspectRatio="none" aria-hidden="true">
		<path class="paper" d={outline} />
		<path class="rim" d="M8 8H262A19 19 0 0 0 298 8H352V92H298A19 19 0 0 0 262 92H8Z" />
		<path class="perforation" d="M280 22V78" />
	</svg>
	<svg class="ticket-shape flash" viewBox="0 0 360 100" preserveAspectRatio="none" aria-hidden="true" bind:this={flash}>
		<path d={outline} />
	</svg>
	<div class="message">
		<strong><GameText text={message} /></strong>
		{#if detail}<span>{detail}</span>{/if}
	</div>
	<div class="stub">
		<span aria-label={player?.name}>{player?.name ?? ''}</span>
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
		min-height: 94px;
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
	.flash {
		opacity: 0;
		filter: drop-shadow(0 0 7px #f2b93f);
	}
	.flash path {
		fill: #ffe7a1a8;
		stroke: #d29a2c;
		stroke-width: 2.5;
		vector-effect: non-scaling-stroke;
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
		align-items: center;
		text-align: center;
		padding: 14px 12px;
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
		flex-direction: row;
		align-items: center;
		justify-content: center;
		gap: 3px;
		padding: 10px 5px 10px 3px;
		text-align: center;
	}
	.stub span {
		writing-mode: vertical-rl;
		transform: rotate(180deg);
		max-height: 74px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-family: 'Barlow Condensed', sans-serif;
		font-size: clamp(20px, 1.6vw, 25px);
		font-weight: 650;
		line-height: 1.1;
	}
</style>
