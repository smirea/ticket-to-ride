<script lang="ts">
	import { onMount } from 'svelte';
	import type { DestinationTicket } from '@repo/shared';
	import type { PaperPose } from './paper-pose';
	import DestinationCard from './DestinationCard.svelte';
	let {
		ticket,
		from,
		ontrace,
		oninsert,
		ondone,
	}: {
		ticket: DestinationTicket;
		from: PaperPose;
		ontrace: () => Promise<void>;
		oninsert: () => Promise<PaperPose>;
		ondone: () => void;
	} = $props();
	let paper = $state<HTMLDivElement>();
	let stamped = $state(false);
	const transform = (pose: PaperPose) =>
		`translate(${pose.x}px, ${pose.y}px) rotate(${pose.angle ?? 0}deg) scale(${pose.width / from.width}, ${pose.height / from.height})`;
	onMount(() => {
		const element = paper;
		if (!element) return;
		let cancelled = false;
		let animation: Animation | undefined;
		const move = async (a: PaperPose, b: PaperPose, duration: number) => {
			animation = element.animate([{ transform: transform(a) }, { transform: transform(b) }], {
				duration,
				easing: 'cubic-bezier(.22,.75,.2,1)',
				fill: 'forwards',
			});
			await animation.finished;
			element.style.transform = transform(b);
			animation.cancel();
		};
		async function celebrate() {
			const width = Math.min(380, innerWidth * 0.38, from.width * 1.35);
			const height = (from.height * width) / from.width;
			const presented = {
				x: 22,
				y: Math.max(190, innerHeight - height - 32),
				width,
				height,
				angle: -1,
			};
			await move(from, presented, 420);
			await ontrace();
			if (cancelled) return;
			stamped = true;
			await new Promise(resolve => setTimeout(resolve, 740));
			if (cancelled) return;
			const destination = await oninsert();
			if (cancelled) return;
			await move(presented, destination, 480);
			await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
			if (!cancelled) ondone();
		}
		void celebrate().catch(() => {
			if (!cancelled) ondone();
		});
		return () => {
			cancelled = true;
			animation?.cancel();
		};
	});
</script>

<div
	class="celebration-ticket"
	bind:this={paper}
	style:width={`${from.width}px`}
	style:height={`${from.height}px`}
	style:transform={transform(from)}
	aria-hidden="true"
>
	<DestinationCard {ticket} complete={stamped} />
</div>

<style>
	.celebration-ticket {
		position: fixed;
		left: 0;
		top: 0;
		z-index: 75;
		pointer-events: none;
		transform-origin: 0 0;
		will-change: transform;
	}
	.celebration-ticket :global(.destination-card) {
		min-height: 0;
	}
</style>
