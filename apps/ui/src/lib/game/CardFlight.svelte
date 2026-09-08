<script lang="ts">
	import { onMount } from 'svelte';
	import type { TrainCard as CardColor } from '@repo/shared';
	import TrainCard from './TrainCard.svelte';
	let {
		color,
		from,
		to,
		blind = false,
		delay = 0,
		onfinish,
	}: {
		color: CardColor;
		from: { x: number; y: number; width: number; height: number };
		to: { x: number; y: number; width: number; height: number };
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
				{ transform: 'translate(0,0) rotate(-3deg) scale(1)', opacity: 1 },
				{
					transform: `translate(${dx * 0.45}px,${dy * 0.35 - 65}px) rotate(9deg) scale(1.14)`,
					opacity: 1,
					offset: 0.48,
				},
				{ transform: `translate(${dx}px,${dy}px) rotate(0) scale(${scale})`, opacity: 1 },
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
	<TrainCard {color} />
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
