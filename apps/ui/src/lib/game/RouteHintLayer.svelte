<script module lang="ts">
	import type { RouteHint } from './RouteHintToken.svelte';
	export type HintPlacement = {
		id: string;
		x: number;
		y: number;
		hints: RouteHint[];
		below: boolean;
		anchor?: { x: number; y: number };
	};
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import RouteHintToken from './RouteHintToken.svelte';
	let {
		board,
		placements,
		factor,
		motionEnabled,
	}: { board?: HTMLDivElement; placements: HintPlacement[]; factor: number; motionEnabled: boolean } = $props();
	let matrix = $state<DOMMatrix>();
	function measure() {
		matrix = board?.querySelector<SVGSVGElement>('svg.board')?.getScreenCTM() ?? undefined;
	}
	function project(x: number, y: number) {
		return matrix ? new DOMPoint(x, y).matrixTransform(matrix) : { x: 0, y: 0 };
	}
	function portal(node: SVGSVGElement) {
		document.body.appendChild(node);
		return { destroy: () => node.remove() };
	}
	$effect(() => {
		if (board && placements.length && factor) measure();
	});
	onMount(() => {
		let frame = 0;
		const refresh = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(measure);
		};
		const observer = new ResizeObserver(refresh);
		if (board) observer.observe(board);
		window.addEventListener('scroll', refresh, true);
		window.addEventListener('resize', refresh);
		board?.addEventListener('animationend', refresh, true);
		return () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
			window.removeEventListener('scroll', refresh, true);
			window.removeEventListener('resize', refresh);
			board?.removeEventListener('animationend', refresh, true);
		};
	});
</script>

<svg use:portal class="route-tooltip-layer" aria-hidden="true">
	{#if matrix}
		{#each placements as placement (`${placement.id}-${placement.hints.length}`)}
			{@const position = project(placement.x, placement.y)}
			{#if placement.anchor}
				{@const anchor = project(placement.anchor.x, placement.anchor.y)}
				<path d={`M ${position.x} ${position.y} L ${anchor.x} ${anchor.y}`} />
			{/if}
			<g
				class="route-tooltip"
				data-route-tooltip={placement.id}
				transform={`translate(${position.x} ${position.y}) scale(${factor})`}
			>
				<RouteHintToken hints={placement.hints} pointer={placement.below ? 'up' : 'down'} {motionEnabled} />
			</g>
		{/each}
	{/if}
</svg>

<style>
	.route-tooltip-layer {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: visible;
		pointer-events: none;
		z-index: 1000;
	}
	path {
		fill: none;
		stroke: #b09a6c;
		stroke-width: 1.5;
	}
</style>
