<script lang="ts">
	import type { TrainCard } from '@repo/shared';
	import TrainIcon from 'phosphor-svelte/lib/TrainIcon';
	let { color, count, back = false }: { color?: TrainCard; count?: number; back?: boolean } = $props();
	const hues = {
		red: '#ce5149',
		orange: '#cf833c',
		yellow: '#edc151',
		green: '#648967',
		blue: '#4699ca',
		purple: '#947ba1',
		black: '#4c5156',
		white: '#ddd9c9',
		locomotive: '#b8bca2',
	};
</script>

<span
	class="card-face"
	class:back
	class:dark={color === 'black'}
	class:locomotive={color === 'locomotive'}
	style:--card-color={color ? hues[color] : '#203f54'}
>
	{#if back}
		<TrainIcon size={36} weight="light" /><span class="back-name">TICKET<br />TO TRAVEL</span>
	{:else if color}
		<img
			src={`/game-assets/atlas/${color === 'locomotive' ? 'locomotive' : 'carriage'}.webp`}
			alt=""
			draggable="false"
		/>
		{#if count !== undefined}<strong class="card-count">{count}</strong>{/if}
	{/if}
</span>

<style>
	.card-face {
		position: relative;
		display: block;
		width: 100%;
		height: 100%;
		overflow: hidden;
		border: 5px solid #fff6df;
		border-radius: 9px;
		background: var(--card-color);
		outline: 1px solid #bbaf9659;
		box-shadow:
			0 2px 2px #30231830,
			0 6px 10px #30231820,
			inset 0 0 0 1px #ffffff8a;
		color: #fffbee;
	}
	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		mix-blend-mode: multiply;
		opacity: 0.88;
		pointer-events: none;
	}
	.card-count {
		position: absolute;
		top: 1px;
		left: 7px;
		font:
			700 29px/1.2 Georgia,
			serif;
		text-shadow: 0 1px 2px #0007;
	}
	.back {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 9px;
		outline-offset: 2px;
	}
	.back::after {
		content: '';
		position: absolute;
		inset: 5px;
		border: 1px solid #eddeb790;
		border-radius: 4px;
		pointer-events: none;
	}
	.back-name {
		font:
			600 10px/1.3 Georgia,
			serif;
		letter-spacing: 0.12em;
		text-align: center;
	}
	.dark img {
		filter: invert(1);
		mix-blend-mode: screen;
		opacity: 0.72;
	}
	.locomotive img {
		mix-blend-mode: normal;
		opacity: 1;
	}
</style>
