<script lang="ts">
	import { onMount } from 'svelte';
	import type { TrainCard as CardColor, DestinationTicket } from '@repo/shared';
	import TrainCard from './TrainCard.svelte';
	import DestinationCard from './DestinationCard.svelte';
	import type { PaperPose } from './paper-pose';
	let {
		color,
		ticket,
		from,
		to,
		blind = false,
		delay = 0,
		onfinish,
	}: {
		color?: CardColor;
		ticket?: DestinationTicket;
		from: PaperPose;
		to: { x: number; y: number; width: number; height: number; angle?: number; count?: number };
		blind?: boolean;
		delay?: number;
		onfinish: () => void;
	} = $props();
	let element = $state<HTMLDivElement>();
	onMount(() => {
		if (!element) return;
		const dx = to.x - from.x,
			dy = to.y - from.y;
		const scale = to.width / Math.max(1, from.width);
		const motion = element.animate(
			[
				{ transform: `translate(0,0) rotate(${from.angle ?? 0}deg) scale(1)`, opacity: 1 },
				{
					transform: `translate(${dx * 0.45}px,${dy * 0.35 - 65}px) rotate(9deg) scale(1.14)`,
					opacity: 1,
					offset: 0.48,
				},
				{
					transform: `translate(${dx}px,${dy}px) rotate(${to.angle ?? 0}deg) scale(${scale},${to.height / Math.max(1, from.height)})`,
					opacity: 1,
				},
			],
			{ duration: 560, delay, easing: 'cubic-bezier(.22,.7,.25,1)', fill: 'both' },
		);
		motion.onfinish = onfinish;
		return () => motion.cancel();
	});
</script>

<div
	bind:this={element}
	class="card-flight"
	style:left={`${from.x}px`}
	style:top={`${from.y}px`}
	style:width={`${from.width}px`}
	style:height={`${from.height}px`}
	aria-hidden="true"
>
	{#if ticket}<DestinationCard {ticket} />{:else if color}<TrainCard {color} count={to.count} />{/if}
	{#if blind}<div class="reverse" style:animation-delay={`${delay}ms`}><TrainCard back /></div>{/if}
</div>

<style>
	.card-flight {
		position: fixed;
		z-index: 150;
		pointer-events: none;
		transform-origin: top left;
		filter: drop-shadow(8px 18px 14px #30281d55);
		will-change: transform;
	}
	.card-flight :global(.destination-card) {
		min-height: 0;
	}
	.reverse {
		position: absolute;
		inset: 0;
		animation: reveal-card 560ms both;
	}
	@keyframes reveal-card {
		0%,
		35% {
			opacity: 1;
		}
		65%,
		100% {
			opacity: 0;
		}
	}
</style>
