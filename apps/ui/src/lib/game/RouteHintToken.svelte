<script module lang="ts">
	import type { TrainColor } from '@repo/shared';
	export type RouteHint = { points: number; cars?: number; color?: TrainColor; wilds?: number; unavailable?: boolean };
	export const routeHintWidth = (hint: RouteHint) =>
		hint.unavailable ? 130 : 52 + (hint.cars ? 35 : 0) + (hint.wilds ? 35 : 0);
</script>

<script lang="ts">
	import { scale } from 'svelte/transition';
	import TrainPieceIcon from './TrainPieceIcon.svelte';
	import { routeColors } from './board/layout';
	let {
		hint,
		pointer = 'down',
		motionEnabled = true,
	}: { hint: RouteHint; pointer?: 'up' | 'down' | 'none'; motionEnabled?: boolean } = $props();
	const width = $derived(routeHintWidth(hint));
</script>

<g class="hint-paper" transition:scale={{ start: 0.65, duration: motionEnabled ? 170 : 0 }}>
	<path
		d={`M ${-width / 2 + 9} -16 H ${width / 2 - 9} Q ${width / 2} -16 ${width / 2} -7 V 7 Q ${width / 2} 16 ${width / 2 - 9} 16 H 7 ${pointer === 'none' ? '' : 'L 0 23 L -7 16'} H ${-width / 2 + 9} Q ${-width / 2} 16 ${-width / 2} 7 V -7 Q ${-width / 2} -16 ${-width / 2 + 9} -16 Z`}
		fill={hint.unavailable ? '#9b6650' : hint.cars && hint.color ? routeColors[hint.color] : '#405e65'}
		transform={pointer === 'up' ? 'scale(1 -1)' : undefined}
	/>
	<rect x={-width / 2 + 3} y="-13" width={width - 6} height="26" rx="6" />
	<g transform={`translate(${-width / 2 + 7} 0)`}>
		<text x="0" y="5">{hint.points}</text>
		<image href="/game-assets/atlas/points-clay-seal.webp" x="18" y="-10" width="20" height="20" />
		{#if hint.unavailable}
			<text class="unavailable" x="43" y="4">can't claim</text>
		{:else}
			{#if hint.cars && hint.color}
				<text x="41" y="5">{hint.cars}</text>
				<g transform="translate(52 -9)"><TrainPieceIcon color={routeColors[hint.color]} width={22} height={18} /></g>
			{/if}
			{#if hint.wilds}
				{@const offset = hint.cars ? 76 : 41}
				<text x={offset} y="5">{hint.wilds}</text>
				<g transform={`translate(${offset + 11} -9)`}
					><TrainPieceIcon color="#3c5159" locomotive width={22} height={18} /></g
				>
			{/if}
		{/if}
	</g>
</g>

<style>
	.hint-paper {
		transform-box: fill-box;
		transform-origin: center bottom;
		filter: drop-shadow(1px 3px 2px #33281855);
		pointer-events: none;
	}
	.hint-paper > path {
		stroke: #b09a6c;
		stroke-width: 1.2;
		stroke-linejoin: round;
	}
	rect {
		fill: #fff3d9;
		stroke: #efdcaa;
		stroke-width: 1;
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
