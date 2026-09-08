<script lang="ts">
	import type { TrainCard } from '@repo/shared';
	let { color, count, back = false }: { color?: TrainCard; count?: number; back?: boolean } = $props();
	const hues = {
		red: '#c13f36',
		orange: '#db852b',
		yellow: '#e1ba35',
		green: '#437550',
		blue: '#347ba7',
		purple: '#895699',
		black: '#424340',
		white: '#eee5cc',
		locomotive: '#354b55',
	};
	const symbols = {
		red: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
		orange: 'M12 3 22 21H2L12 3Z',
		yellow: 'm12 2 2.7 6.5 7 .6-5.3 4.6 1.6 6.8-6-3.6-6 3.6 1.6-6.8-5.3-4.6 7-.6L12 2Z',
		green: 'M20 3C8 2 2 7 4 14c2 7 9 8 13 3 3-4 3-9 3-14ZM5 19l9-9',
		blue: 'M2 7c3-5 7 5 10 0s7 5 10 0M2 12c3-5 7 5 10 0s7 5 10 0M2 17c3-5 7 5 10 0s7 5 10 0',
		purple: 'm12 2 9 10-9 10L3 12 12 2Z',
		black: 'M8 2h8v6h6v8h-6v6H8v-6H2V8h6V2Z',
		white: 'M4 4h16v16H4V4Z',
	};
</script>

<span
	class="card-face"
	class:back
	class:carriage={color && color !== 'locomotive' && !back}
	class:ink={color === 'black'}
	class:ivory={color === 'white'}
	class:light={color === 'white' || color === 'yellow'}
	style:--card-color={color ? hues[color] : '#203f54'}
>
	{#if back}
		<img src="/game-assets/atlas/card-back-v2.webp" alt="" draggable="false" />
	{:else if color}
		<img
			src={color === 'locomotive'
				? '/game-assets/atlas/locomotive-v2.webp'
				: `/game-assets/atlas/carriage-${color}-v2.webp`}
			alt=""
			draggable="false"
		/>
		{#if color !== 'locomotive'}
			<svg class="color-symbol" viewBox="0 0 24 24" aria-hidden="true">
				<path d={symbols[color]} />
			</svg>
		{/if}
		{#if count !== undefined}<strong class="card-count">{count}</strong>{/if}
	{/if}
</span>

<style>
	.card-face {
		position: relative;
		isolation: isolate;
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
	.carriage::after {
		content: '';
		position: absolute;
		inset: 0;
		background: var(--card-color);
		mix-blend-mode: multiply;
		opacity: 0.42;
		pointer-events: none;
	}
	.carriage img {
		filter: saturate(1.2);
	}
	.ink img {
		filter: saturate(0.2) brightness(0.83);
	}
	.ivory img {
		filter: saturate(0.25) brightness(1.07);
	}
	.color-symbol {
		position: absolute;
		z-index: 1;
		left: 8%;
		bottom: 6%;
		width: 22%;
		height: auto;
		fill: none;
		stroke: #fffbee;
		stroke-width: 2.4;
		stroke-linecap: round;
		stroke-linejoin: round;
		opacity: 0.68;
		filter: drop-shadow(0 0 0.65px #171b19) drop-shadow(0 1px 0.5px #171b1966);
		pointer-events: none;
	}
	.card-count {
		position: absolute;
		z-index: 1;
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
