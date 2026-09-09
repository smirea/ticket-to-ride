<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { TrainCard as CardColor } from '@repo/shared';
	import TrainCard from './TrainCard.svelte';
	import CarriageImage from './CarriageImage.svelte';
	import type { PaperPose } from './paper-pose';
	import type { CarriageSprite } from './board/carriage-sprites';

	let {
		cards,
		loadSprites,
		settled = false,
		onfinish,
	}: {
		cards: { color: CardColor; from: PaperPose }[];
		loadSprites: () => Promise<CarriageSprite[]>;
		settled?: boolean;
		onfinish: () => void;
	} = $props();
	let papers = $state<HTMLDivElement[]>([]);
	let trains = $state<HTMLDivElement[]>([]);
	let sprites = $state<CarriageSprite[]>([]);
	onMount(() => {
		let cancelled = false;
		const motions: Animation[] = [];
		const center = cards.reduce((sum, card) => sum + card.from.x + card.from.width / 2, 0) / cards.length;
		const top = Math.min(...cards.map(card => card.from.y)) - 100;
		const positions = cards.map((_, i) => center + (i - (cards.length - 1) / 2) * 48);
		const gathers = cards.map((card, i) => {
			const motion = papers[i]!.animate(
				[
					{ transform: `translate(${card.from.x}px,${card.from.y}px) rotate(${card.from.angle ?? 0}deg)` },
					{ transform: `translate(${positions[i]! - card.from.width * 0.325}px,${top}px) scale(.65)` },
				],
				{ duration: 360, delay: i * 45, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both' },
			);
			motions.push(motion);
			return motion.finished;
		});
		async function place() {
			const [loaded] = await Promise.all([loadSprites(), Promise.all(gathers)]);
			if (cancelled) return;
			sprites = loaded;
			await tick();
			if (cancelled) return;
			const arrivals: Promise<Animation>[] = [];
			for (let i = 0; i < cards.length; i++) {
				const fade = papers[i]!.animate([{ opacity: 1 }, { opacity: 0 }], {
					duration: 200,
					delay: i * 45,
					fill: 'forwards',
					easing: 'ease-in-out',
				});
				motions.push(fade);
				arrivals.push(fade.finished);
				const sprite = sprites[i],
					train = trains[i];
				if (!sprite || !train) continue;
				const scale = 44 / Math.max(sprite.width, sprite.height);
				const start = `matrix(${scale},0,0,${scale},${positions[i]! - (sprite.width * scale) / 2},${top + 18})`;
				const motion = train.animate(
					[
						{ transform: start, opacity: 0 },
						{ transform: start, opacity: 1, offset: 0.24 },
						{ transform: `matrix(${sprite.matrix.join(',')})`, opacity: 1 },
					],
					{ duration: 800, delay: i * 45, fill: 'both', easing: 'cubic-bezier(.3,.65,.2,1)' },
				);
				motions.push(motion);
				arrivals.push(motion.finished);
			}
			await Promise.all(arrivals);
			if (!cancelled) onfinish();
		}
		void place().catch(() => {
			if (!cancelled) onfinish();
		});
		return () => {
			cancelled = true;
			motions.forEach(motion => motion.cancel());
		};
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
	{/each}
	{#each sprites as sprite, i}
		<div class="train" bind:this={trains[i]} style:width={`${sprite.width}px`} style:height={`${sprite.height}px`}>
			<CarriageImage frame={sprite} />
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
		opacity: 0;
	}
</style>
