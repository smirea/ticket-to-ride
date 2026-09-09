<script lang="ts">
	import { onMount } from 'svelte';
	import type { TrainCard as CardColor } from '@repo/shared';
	import TrainCard from './TrainCard.svelte';
	import type { PaperPose } from './paper-pose';
	import type { CarriageSprite } from './board/carriage-sprites';

	let {
		cards,
		settled = false,
		onfinish,
	}: {
		cards: { color: CardColor; from: PaperPose; train: CarriageSprite }[];
		settled?: boolean;
		onfinish: () => void;
	} = $props();
	let papers = $state<HTMLDivElement[]>([]);
	let trains = $state<HTMLDivElement[]>([]);
	onMount(() => {
		const motions: Animation[] = [];
		const center = cards.reduce((sum, card) => sum + card.from.x + card.from.width / 2, 0) / cards.length;
		const top = Math.min(...cards.map(card => card.from.y)) - 100;
		for (const [i, card] of cards.entries()) {
			const paper = papers[i],
				train = trains[i];
			if (!paper || !train) continue;
			const x = center + (i - (cards.length - 1) / 2) * 48;
			const options: KeyframeAnimationOptions = {
				duration: 1160,
				delay: i * 70,
				easing: 'cubic-bezier(.3,.65,.2,1)',
				fill: 'both',
			};
			motions.push(
				paper.animate(
					[
						{
							transform: `translate(${card.from.x}px,${card.from.y}px) rotate(${card.from.angle ?? 0}deg)`,
							opacity: 1,
						},
						{ transform: `translate(${x - card.from.width * 0.325}px,${top}px) scale(.65)`, opacity: 1, offset: 0.34 },
						{ transform: `translate(${x - card.from.width * 0.325}px,${top}px) scale(.65)`, opacity: 0, offset: 0.56 },
						{ transform: `translate(${x - card.from.width * 0.325}px,${top}px) scale(.65)`, opacity: 0 },
					],
					options,
				),
			);
			const scale = 44 / Math.max(card.train.width, card.train.height);
			const start = `matrix(${scale},0,0,${scale},${x - (card.train.width * scale) / 2},${top + 18})`;
			motions.push(
				train.animate(
					[
						{ transform: start, opacity: 0 },
						{ transform: start, opacity: 0, offset: 0.34 },
						{ transform: start, opacity: 1, offset: 0.56 },
						{ transform: `matrix(${card.train.matrix.join(',')})`, opacity: 1 },
					],
					options,
				),
			);
		}
		void Promise.all(motions.map(motion => motion.finished))
			.then(onfinish)
			.catch(() => {});
		return () => motions.forEach(motion => motion.cancel());
	});
</script>

<div class="claim-layer" class:settled aria-hidden="true">
	{#each cards as card, i}
		<div
			class="paper"
			bind:this={papers[i]}
			style:width={`${card.from.width}px`}
			style:height={`${card.from.height}px`}
		>
			<TrainCard color={card.color} />
		</div>
		<div
			class="train"
			bind:this={trains[i]}
			style:width={`${card.train.width}px`}
			style:height={`${card.train.height}px`}
		>
			<img src={card.train.src} alt="" />
		</div>
	{/each}
</div>

<style>
	.claim-layer {
		position: fixed;
		inset: 0;
		z-index: 160;
		pointer-events: none;
		transition: opacity 220ms;
	}
	.claim-layer.settled {
		opacity: 0;
	}
	.paper,
	.train {
		position: absolute;
		left: 0;
		top: 0;
		transform-origin: top left;
		will-change: transform;
	}
	.paper {
		filter: drop-shadow(5px 16px 8px #35281766);
	}
	.train {
		filter: drop-shadow(1px 2px 1px #35281755);
	}
	.train img {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
