<script lang="ts">
	import { onMount } from 'svelte';
	import type { TrainCard as CardColor } from '@repo/shared';
	import TrainCard from './TrainCard.svelte';
	type Rect = { x: number; y: number; width: number; height: number };
	let {
		cards,
		playerColor,
		onfinish,
	}: { cards: { color: CardColor; from: Rect; to: Rect }[]; playerColor: string; onfinish: () => void } = $props();
	let elements = $state<HTMLDivElement[]>([]);
	onMount(() => {
		const motions: Animation[] = [];
		const center = cards.reduce((sum, card) => sum + card.from.x + card.from.width / 2, 0) / cards.length;
		const top = Math.min(...cards.map(card => card.from.y)) - 106;
		for (const [i, card] of cards.entries()) {
			const element = elements[i];
			if (!element) continue;
			const x = center + (i - (cards.length - 1) / 2) * 44 - card.from.width / 2;
			const scale = Math.max(0.16, card.to.width / card.from.width);
			motions.push(
				element.animate(
					[
						{ transform: 'translate(0,0) scale(1)' },
						{ transform: `translate(${x - card.from.x}px,${top - card.from.y}px) scale(.65)`, offset: 0.34 },
						{ transform: `translate(${x - card.from.x}px,${top - card.from.y}px) scale(.65)`, offset: 0.62 },
						{ transform: `translate(${card.to.x - card.from.x}px,${card.to.y - card.from.y}px) scale(${scale})` },
					],
					{ duration: 1160, delay: i * 70, easing: 'cubic-bezier(.3,.65,.2,1)', fill: 'both' },
				),
			);
			motions.push(
				element
					.querySelector('.paper')!
					.animate([{ opacity: 1 }, { opacity: 1, offset: 0.35 }, { opacity: 0, offset: 0.55 }, { opacity: 0 }], {
						duration: 1160,
						delay: i * 70,
						fill: 'both',
					}),
			);
			motions.push(
				element.querySelector('.train')!.animate(
					[
						{ opacity: 0, transform: 'scale(.7)' },
						{ opacity: 0, transform: 'scale(.7)', offset: 0.36 },
						{ opacity: 1, transform: 'scale(1)', offset: 0.56 },
						{ opacity: 1, transform: 'scale(1)' },
					],
					{ duration: 1160, delay: i * 70, fill: 'both' },
				),
			);
		}
		void Promise.all(motions.map(motion => motion.finished))
			.then(onfinish)
			.catch(() => {});
		return () => motions.forEach(motion => motion.cancel());
	});
</script>

{#each cards as card, i}
	<div
		class="claim-flight"
		bind:this={elements[i]}
		style:left={`${card.from.x}px`}
		style:top={`${card.from.y}px`}
		style:width={`${card.from.width}px`}
		style:height={`${card.from.height}px`}
		style:--train-color={playerColor}
		aria-hidden="true"
	>
		<div class="paper"><TrainCard color={card.color} /></div>
		<svg class="train" viewBox="0 0 100 42"
			><rect
				x="3"
				y="9"
				width="94"
				height="28"
				rx="5"
				fill="var(--train-color)"
				stroke="#263132"
				stroke-width="2"
			/><rect
				x="10"
				y="4"
				width="80"
				height="24"
				rx="4"
				fill="var(--train-color)"
				stroke="#fff9dc"
				stroke-opacity=".45"
				stroke-width="2"
			/><path d="M24 7v18M42 7v18M60 7v18M78 7v18" stroke="#202d30" stroke-opacity=".3" stroke-width="3" /><path
				d="M12 35h76"
				stroke="#152b2f"
				stroke-width="3"
			/></svg
		>
	</div>
{/each}

<style>
	.claim-flight {
		position: fixed;
		z-index: 160;
		pointer-events: none;
		transform-origin: top left;
		filter: drop-shadow(5px 16px 8px #35281766);
	}
	.paper {
		position: absolute;
		inset: 0;
	}
	.train {
		position: absolute;
		width: 100%;
		height: 42%;
		top: 0;
		left: 0;
	}
</style>
