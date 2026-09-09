<script module lang="ts">
	import type { TrainColor } from '@repo/shared';

	export type RouteHint = { points: number; cars?: number; color?: TrainColor; wilds?: number; unavailable?: boolean };
	export const routeHintWidth = (hint: RouteHint) =>
		hint.unavailable ? 126 : 50 + (hint.cars ? 40 : 0) + (hint.wilds ? 40 : 0);
</script>

<script lang="ts">
	import { scale } from 'svelte/transition';
	import PointsSeal from './PointsSeal.svelte';
	import TrainPieceIcon from './TrainPieceIcon.svelte';
	import { routeColors } from './board/layout';
	let {
		hints,
		pointer = 'down',
		motionEnabled = true,
	}: {
		hints: RouteHint[];
		pointer?: 'up' | 'down';
		motionEnabled?: boolean;
	} = $props();
	const width = $derived(Math.max(...hints.map(routeHintWidth)));
	const height = $derived(hints.length * 32);
</script>

<g class="hint-paper" transition:scale|global={{ start: 0.65, duration: motionEnabled ? 170 : 0 }}>
	<rect x={-width / 2 + 16} y={-height / 2} width={width - 16} {height} rx="7" />
	<path
		d={pointer === 'up'
			? `M -6 ${-height / 2} L 0 ${-height / 2 - 6} L 6 ${-height / 2}`
			: `M -6 ${height / 2} L 0 ${height / 2 + 6} L 6 ${height / 2}`}
	/>
	<foreignObject x={-width / 2} y="-16" width="32" height="32"
		><div class="score"><PointsSeal value={hints[0]?.points} /></div></foreignObject
	>
	{#each hints as hint, i}
		<g class="option-row" transform={`translate(${-width / 2 + 39} ${-height / 2 + 16 + i * 32})`}>
			{#if hint.unavailable}
				<text class="unavailable" y="0" dy=".35em">can't claim</text>
			{:else}
				{#if hint.cars && hint.color}
					<text y="0" dy=".35em">{hint.cars}</text>
					<g transform="translate(12 -10)"><TrainPieceIcon color={routeColors[hint.color]} width={22} height={20} /></g>
				{/if}
				{#if hint.wilds}
					{@const offset = hint.cars ? 40 : 0}
					<text x={offset} y="0" dy=".35em">{hint.wilds}</text>
					<g transform={`translate(${offset + 12} -10)`}
						><TrainPieceIcon color="#3c5159" locomotive width={22} height={20} /></g
					>
				{/if}
			{/if}
		</g>
	{/each}
</g>

<style>
	.hint-paper {
		transform-box: fill-box;
		transform-origin: center;
		filter: drop-shadow(1px 3px 2px #33281855);
		pointer-events: none;
	}
	rect,
	path {
		fill: #fff3d9;
		stroke: #b09a6c;
		stroke-width: 1.2;
		stroke-linejoin: round;
	}
	.score {
		width: 32px;
		height: 32px;
		--seal-number-size: 20px;
	}
	foreignObject {
		overflow: visible;
	}
	text {
		fill: #263d42;
		text-anchor: start;
		font:
			700 14px Georgia,
			serif;
	}
	.unavailable {
		fill: #874631;
		font:
			600 13px Barlow,
			sans-serif;
	}
</style>
