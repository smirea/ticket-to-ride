<script lang="ts">
	import { gameMap, type GameState } from '@repo/shared';
	import { ROUTE_MARKER_WIDTH, type BoardLayout } from '$lib/game/board/layout';
	let { state: gameState, layout }: { state: GameState; layout: BoardLayout; viewerId: string } = $props();
	const markers = $derived(
		gameMap(gameState)
			.routes.filter(route => route.spec.tunnel && !gameState.claimedRoutes[route.id])
			.flatMap(route =>
				Array.from({ length: route.length }, (_, index) => {
					const t = layout.routeMarkerT(route, index);
					const p = layout.routePoint(route, t);
					const a = layout.routePoint(route, Math.max(0, t - 0.002));
					const b = layout.routePoint(route, Math.min(1, t + 0.002));
					return {
						key: `${route.id}-${index}`,
						p,
						length: layout.routeMarkerLength(route),
						angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
					};
				}),
			),
	);
</script>

<g class="tunnels" aria-hidden="true">
	{#each markers as marker (marker.key)}
		<rect
			x={marker.p.x - marker.length / 2 - 1.6}
			y={marker.p.y - ROUTE_MARKER_WIDTH / 2 - 1.6}
			width={marker.length + 3.2}
			height={ROUTE_MARKER_WIDTH + 3.2}
			rx="1.6"
			transform={`rotate(${marker.angle} ${marker.p.x} ${marker.p.y})`}
		/>
	{/each}
</g>

<style>
	.tunnels {
		pointer-events: none;
	}
	rect {
		fill: none;
		stroke: #2a2118;
		stroke-width: 1.3;
		stroke-dasharray: 2.2 1.6;
	}
</style>
