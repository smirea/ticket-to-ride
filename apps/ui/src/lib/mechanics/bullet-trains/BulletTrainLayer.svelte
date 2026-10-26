<script lang="ts">
	import type { GameState, Route } from '@repo/shared';
	import { bulletTrains, claimsAsBulletTrain } from '@repo/shared/mechanics/bullet-trains';
	import { ROUTE_MARKER_WIDTH, type BoardLayout } from '$lib/game/board/layout';
	import BulletTrainIcon from './BulletTrainIcon.svelte';

	let { state, layout }: { state: GameState; layout: BoardLayout; viewerId: string } = $props();
	const bulletRoutes = $derived(layout.map.routes.filter(route => claimsAsBulletTrain(state, route)));
	const supply = $derived(bulletTrains(state).supply);

	function marker(route: Route, index: number) {
		const t = layout.routeMarkerT(route, index);
		const p = layout.routePoint(route, t);
		const a = layout.routePoint(route, Math.max(0, t - 0.002));
		const b = layout.routePoint(route, Math.min(1, t + 0.002));
		return { ...p, angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI, length: layout.routeMarkerLength(route) };
	}
</script>

<g class="bullet-trains" aria-hidden="true">
	{#each bulletRoutes as route (route.id)}
		{@const claimed = Boolean(state.claimedRoutes[route.id])}
		{@const middle = Math.floor((route.length - 1) / 2)}
		{#each Array(route.length) as _, index}
			{@const m = marker(route, index)}
			<g transform={`translate(${m.x} ${m.y}) rotate(${m.angle})`}>
				{#if claimed}
					<rect
						class="laid"
						x={-m.length / 2}
						y={-ROUTE_MARKER_WIDTH / 2}
						width={m.length}
						height={ROUTE_MARKER_WIDTH}
						rx="0.8"
					/>
				{:else if index !== middle}
					<path class="chevrons" d="M-6 -2.6 L-3.4 0 L-6 2.6 M-1.3 -2.6 L1.3 0 L-1.3 2.6 M3.4 -2.6 L6 0 L3.4 2.6" />
				{/if}
				{#if index === middle}
					<BulletTrainIcon length={claimed ? m.length * 1.5 : m.length * 0.8} outline={!claimed} />
				{/if}
			</g>
		{/each}
	{/each}
	<g class="supply" transform={`translate(${layout.width * 0.745} ${layout.height * 0.2})`}>
		<rect x="-34" y="-13" width="68" height="26" rx="13" />
		<g transform="translate(-12 0)"><BulletTrainIcon length={26} /></g>
		<text x="18" y="0.5" dominant-baseline="middle" text-anchor="middle">{supply}</text>
	</g>
</g>

<style>
	.bullet-trains {
		pointer-events: none;
	}
	.chevrons {
		fill: none;
		stroke: #f6f3ea;
		stroke-width: 1.3;
		stroke-linecap: round;
		stroke-linejoin: round;
		opacity: 0.9;
	}
	.laid {
		fill: #e8ecec;
		stroke: #8f9a9c;
		stroke-width: 0.6;
	}
	.supply rect {
		fill: #f4ecd8;
		stroke: #7d6a48;
		stroke-width: 1;
		filter: drop-shadow(0 1.5px 1px #2a201255);
	}
	.supply text {
		font:
			600 15px/1 Georgia,
			serif;
		fill: #3a3a35;
	}
</style>
