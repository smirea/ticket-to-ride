<script lang="ts">
	import type { TrainCard } from '@repo/shared';
	let { color, count, back = false }: { color?: TrainCard; count?: number; back?: boolean } = $props();
	const hues = {
		red: '#b84e40',
		orange: '#bd813c',
		yellow: '#dbb648',
		green: '#597b60',
		blue: '#3e7197',
		purple: '#826889',
		black: '#404745',
		white: '#ddd5bf',
		locomotive: '#354b55',
	};
</script>

<span
	class="card-face"
	class:back
	class:light={color === 'white' || color === 'yellow'}
	style:--card-color={color ? hues[color] : '#203f54'}
>
	{#if back}
		<img src="/game-assets/atlas/card-back-v2.webp" alt="" draggable="false" />
	{:else if color}
		<img
			src={color === 'locomotive'
				? '/game-assets/atlas/locomotive.webp'
				: `/game-assets/atlas/carriage-${color}-v2.webp`}
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
		border: 3px solid #fff6df;
		border-radius: 7px;
		background: var(--card-color);
		outline: 1px solid #ab99736b;
		box-shadow:
			0 2px 1px #ad9a74,
			0 4px 7px #30231833;
		color: #fffbee;
		user-select: none;
	}
	img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		pointer-events: none;
	}
	.card-count {
		position: absolute;
		top: -1px;
		left: -1px;
		min-width: 28px;
		padding: 2px 7px 4px;
		border-bottom-right-radius: 10px;
		background: var(--card-color);
		font:
			700 24px/1.2 Georgia,
			serif;
		text-align: center;
		text-shadow: 0 1px 2px #0005;
		box-shadow: 1px 2px 2px #30231826;
	}
	.light .card-count {
		color: #493f2b;
		text-shadow: 0 1px #fff5;
	}
	.back {
		border-color: #38566b;
		outline-color: #d4ceb9;
	}
</style>
