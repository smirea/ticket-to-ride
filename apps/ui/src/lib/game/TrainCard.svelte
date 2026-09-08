<script lang="ts">
	import type { TrainCard } from '@repo/shared';
	import TrainIcon from 'phosphor-svelte/lib/TrainIcon';
	import StarIcon from 'phosphor-svelte/lib/StarIcon';
	let { color, count, back = false }: { color?: TrainCard; count?: number; back?: boolean } = $props();
	const labels = {
		red: 'Red',
		orange: 'Orange',
		yellow: 'Yellow',
		green: 'Green',
		blue: 'Blue',
		purple: 'Purple',
		black: 'Black',
		white: 'Ivory',
		locomotive: 'Wild',
	};
	const hues = {
		red: '#b84841',
		orange: '#cf833c',
		yellow: '#dfb446',
		green: '#648967',
		blue: '#4384b5',
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
		<span class="card-kind"
			>{#if color === 'locomotive'}<StarIcon weight="fill" />{:else}<TrainIcon weight="fill" />{/if}</span
		>
		<span class="card-name">{labels[color]}</span>
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
		border: 4px solid #fff8e7;
		border-radius: 8px;
		background: var(--card-color);
		outline: 1px solid #bbaf9659;
		box-shadow:
			0 3px 4px #30231826,
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
	.card-kind {
		position: absolute;
		top: 7px;
		right: 7px;
		display: flex;
		filter: drop-shadow(0 1px 2px #0005);
	}
	.card-name {
		position: absolute;
		bottom: 5px;
		left: 5px;
		color: #fff;
		background: #132b3bcb;
		padding: 2px 5px;
		border-radius: 3px;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.07em;
		text-transform: uppercase;
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
