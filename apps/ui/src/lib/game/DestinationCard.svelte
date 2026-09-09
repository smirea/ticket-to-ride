<script lang="ts">
	import { type DestinationTicket } from '@repo/shared';
	import { getTicketArtwork } from './ticket-art';
	import PointsSeal from './PointsSeal.svelte';

	let {
		ticket,
		complete = false,
		selected = false,
	}: { ticket: DestinationTicket; complete?: boolean; selected?: boolean } = $props();
	let punching = $state(false);
	let initialized = false;
	let wasComplete = false;

	$effect(() => {
		if (initialized && complete && !wasComplete) punching = true;
		wasComplete = complete;
		initialized = true;
	});
</script>

<span class="destination-card" class:complete class:punching class:selected>
	<span class="ticket-paper">
		<img src={getTicketArtwork(ticket)} alt="" loading="lazy" draggable="false" />
		<span class="ticket-stub"><PointsSeal value={ticket.points} /></span>
		{#if complete}<span class="complete-mark" aria-label="Completed destination"
				><span aria-hidden="true">✓</span> Completed</span
			>{/if}
	</span>
	{#if punching}
		<span class="paper-punch" aria-hidden="true" onanimationend={() => (punching = false)}></span>
	{/if}
</span>

<style>
	.destination-card {
		position: relative;
		display: block;
		isolation: isolate;
		width: 100%;
		height: 100%;
		min-height: 96px;
		aspect-ratio: 2.65;
		filter: drop-shadow(0 1px 0 #ae9671) drop-shadow(0 3px 2px #4a342d26) drop-shadow(0 8px 7px #37271626);
		text-align: left;
		user-select: none;
	}
	.selected {
		filter: drop-shadow(1px 0 0 #4e735f) drop-shadow(-1px 0 0 #4e735f) drop-shadow(0 1px 0 #4e735f)
			drop-shadow(0 -1px 0 #4e735f) drop-shadow(0 3px 2px #4a342d26) drop-shadow(0 8px 7px #37271626);
	}
	.ticket-paper {
		position: absolute;
		inset: 0;
		display: block;
		overflow: hidden;
		border-radius: 3px;
		background: linear-gradient(115deg, #fff9e9, #eee0c1);
		box-shadow:
			inset 0 0 0 1px #fff9e6,
			inset 0 0 0 4px #b99c6840,
			inset 0 0 0 5px #fff7e7;
		mask-image:
			radial-gradient(circle at 0 50%, transparent 5px, #000 5.6px),
			radial-gradient(circle at 100% 50%, transparent 5px, #000 5.6px);
		mask-composite: intersect;
	}
	img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: fill;
		pointer-events: none;
		transition: filter 500ms ease;
	}
	.ticket-stub {
		position: absolute;
		width: 46px;
		height: 46px;
		right: 7px;
		bottom: 4px;
		--seal-number-size: 23px;
	}

	.complete .ticket-paper > img {
		filter: grayscale(0.48) saturate(0.7);
	}
	.complete .ticket-paper {
		mask-image:
			radial-gradient(circle at 0 50%, transparent 5px, #000 5.6px),
			radial-gradient(circle at 100% 50%, transparent 5px, #000 5.6px),
			radial-gradient(circle at calc(100% - 65px) calc(100% - 14px), transparent 5px, #000 5.6px);
	}
	.complete-mark {
		position: absolute;
		left: 13px;
		bottom: 13px;
		padding: 3px 7px 2px;
		border: 2px solid currentColor;
		outline: 1px solid currentColor;
		outline-offset: 2px;
		border-radius: 2px;
		color: #235b48;
		background: #f8edcfdf;
		font:
			800 12px Georgia,
			serif;
		letter-spacing: 0.075em;
		text-transform: uppercase;
		transform: rotate(-9deg);
		box-shadow: 0 1px 2px #fff8df;
	}
	.complete-mark > span {
		font-size: 15px;
	}
	.punching .complete-mark {
		animation: stamp-land 580ms ease-out both;
	}
	@keyframes stamp-land {
		0%,
		22% {
			opacity: 0;
			transform: rotate(-9deg) scale(1.45);
		}
		36% {
			opacity: 1;
			transform: rotate(-9deg) scale(0.95);
		}
		55%,
		100% {
			opacity: 1;
			transform: rotate(-9deg) scale(1);
		}
	}
	.punching .ticket-paper {
		animation: ticket-press 580ms cubic-bezier(0.2, 0.8, 0.25, 1) both;
	}
	.paper-punch {
		position: absolute;
		right: 60px;
		bottom: 9px;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #efe1c4;
		box-shadow: 0 2px 3px #46362430;
		pointer-events: none;
		animation: paper-fall 850ms cubic-bezier(0.22, 0.7, 0.3, 1) both;
	}
	@keyframes ticket-press {
		0%,
		22% {
			transform: translateY(0);
		}
		34% {
			transform: translateY(3px) scale(0.992);
		}
		60% {
			transform: translateY(-1px);
		}
		100% {
			transform: translateY(0);
		}
	}
	@keyframes paper-fall {
		0%,
		30% {
			transform: translate(0, 0);
			opacity: 1;
		}
		60% {
			transform: translate(9px, -16px) rotateX(130deg) rotateZ(30deg);
			opacity: 1;
		}
		100% {
			transform: translate(23px, 41px) rotateX(240deg) rotateZ(100deg);
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.punching .ticket-paper,
		.punching .complete-mark,
		.paper-punch {
			animation-duration: 1ms;
		}
	}
</style>
