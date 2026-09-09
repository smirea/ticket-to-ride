<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { scale } from 'svelte/transition';
	import XIcon from 'phosphor-svelte/lib/XIcon';
	import TrainCard from './TrainCard.svelte';
	import type { RoutePayment } from './route-payments';
	let {
		routeId,
		options,
		points,
		reduceMotion,
		onchoose,
		onclose,
	}: {
		routeId: string;
		options: RoutePayment[];
		points: number;
		reduceMotion: boolean;
		onchoose: (payment: RoutePayment) => void;
		onclose: () => void;
	} = $props();
	let container = $state<HTMLDivElement>();
	let x = $state(0),
		y = $state(0),
		placed = $state(false);
	function position() {
		const anchor = document.getElementById(`route-${routeId}`)?.getBoundingClientRect();
		if (!anchor || !container) return;
		x = Math.max(
			12,
			Math.min(innerWidth - container.offsetWidth - 12, anchor.x + anchor.width / 2 - container.offsetWidth / 2),
		);
		y = Math.max(12, anchor.y - container.offsetHeight - 12);
		placed = true;
	}
	$effect(() => {
		if (routeId && options.length) void tick().then(position);
	});
	onMount(() => {
		position();
		void tick().then(() =>
			container?.querySelector<HTMLButtonElement>('.payment-option')?.focus({ preventScroll: true }),
		);
		const outside = (event: PointerEvent) => {
			const target = event.target as Node;
			if (!container?.contains(target) && !(target instanceof Element && target.closest('.route.available'))) onclose();
		};
		const keyboard = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				onclose();
			}
		};
		window.addEventListener('pointerdown', outside);
		window.addEventListener('keydown', keyboard);
		window.addEventListener('resize', position);
		window.addEventListener('scroll', position, true);
		return () => {
			window.removeEventListener('pointerdown', outside);
			window.removeEventListener('keydown', keyboard);
			window.removeEventListener('resize', position);
			window.removeEventListener('scroll', position, true);
		};
	});
</script>

<div
	class="route-payment"
	role="dialog"
	aria-label="Choose route payment"
	bind:this={container}
	style:left={`${x}px`}
	style:top={`${y}px`}
	style:visibility={placed ? 'visible' : 'hidden'}
	transition:scale={{ start: 0.9, duration: reduceMotion ? 0 : 180 }}
>
	<header>
		<strong>{points} points</strong><button class="close" aria-label="Cancel route payment" onclick={onclose}
			><XIcon size={15} /></button
		>
	</header>
	<div class="payment-options">
		{#each options as payment (`${payment.color}-${payment.wilds}`)}
			<button
				class="payment-option"
				onclick={() => onchoose(payment)}
				aria-label={`Claim with ${payment.cars ? `${payment.cars} ${payment.color} car${payment.cars === 1 ? '' : 's'}` : ''}${payment.cars && payment.wilds ? ' and ' : ''}${payment.wilds ? `${payment.wilds} locomotive${payment.wilds === 1 ? '' : 's'}` : ''}`}
			>
				{#if payment.cars}<strong>{payment.cars}</strong><span class="mini-card"
						><TrainCard color={payment.color} /></span
					>{/if}
				{#if payment.wilds}<strong>{payment.wilds}</strong><span class="mini-card"
						><TrainCard color="locomotive" /></span
					>{/if}
			</button>
		{/each}
	</div>
</div>

<style>
	.route-payment {
		transform-origin: center bottom;
		position: fixed;
		z-index: 80;
		width: 314px;
		padding: 8px;
		border: 1px solid #a88e60;
		border-radius: 7px;
		background: #f5ecd6;
		box-shadow:
			0 2px #bba579,
			0 10px 22px #271e294a;
		color: #243b42;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 3px 6px;
		font:
			600 13px Georgia,
			serif;
	}
	button {
		color: inherit;
		cursor: pointer;
	}
	.close {
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		padding: 0;
		background: none;
		border: 0;
	}
	.payment-options {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 5px;
		max-height: 232px;
		overflow-y: auto;
		padding: 2px;
	}
	.payment-option {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		min-height: 56px;
		padding: 5px;
		border: 1px solid #b7a58077;
		border-radius: 4px;
		background: #fff9e9;
		transition:
			transform 140ms,
			background 140ms;
	}
	.payment-option:hover {
		background: #e3ebd5;
		transform: translateY(-1px);
	}
	.payment-option:focus-visible {
		outline: 2px solid #53776b;
		outline-offset: 0;
	}
	.payment-option > strong {
		font:
			600 20px Georgia,
			serif;
	}
	.mini-card {
		display: block;
		width: 27px;
		height: 38px;
	}
	.mini-card :global(.card-face) {
		border-width: 1px;
		border-radius: 2px;
	}
</style>
