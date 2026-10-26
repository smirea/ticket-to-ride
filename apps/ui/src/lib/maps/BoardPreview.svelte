<script lang="ts">
	import { boardLayout, routeColors, ROUTE_MARKER_WIDTH } from '$lib/game/board/layout';

	let { mapId }: { mapId: string } = $props();
	const layout = $derived(boardLayout(mapId));
	const cars = $derived(
		layout.map.routes.flatMap(route => {
			const length = layout.routeMarkerLength(route);
			return Array.from({ length: route.length }, (_, index) => {
				const t = layout.routeMarkerT(route, index);
				const p = layout.routePoint(route, t),
					a = layout.routePoint(route, t - 0.002),
					b = layout.routePoint(route, t + 0.002);
				return {
					key: `${route.id}-${index}`,
					p,
					length,
					angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
					fill: routeColors[route.color],
					locomotive: index < route.locomotives,
				};
			});
		}),
	);
	const stops = $derived(
		layout.map.cities.flatMap(city => city.positions.map((_, position) => layout.cityPoint(city, position))),
	);
</script>

<svg
	class="board-preview"
	viewBox={`0 0 ${layout.width} ${layout.height}`}
	role="img"
	aria-label={`${layout.map.name} board`}
>
	<image href={layout.art.terrain} width={layout.width} height={layout.height} preserveAspectRatio="none" />
	<g class="outline">
		{#each layout.map.routes as route (route.id)}<path d={layout.routeOutlinePath(route)} />{/each}
	</g>
	{#each cars as car (car.key)}
		<rect
			x={car.p.x - car.length / 2}
			y={car.p.y - ROUTE_MARKER_WIDTH / 2}
			width={car.length}
			height={ROUTE_MARKER_WIDTH}
			rx="1"
			fill={car.fill}
			class:locomotive={car.locomotive}
			transform={`rotate(${car.angle} ${car.p.x} ${car.p.y})`}
		/>
	{/each}
	{#each stops as stop}
		<circle cx={stop.x} cy={stop.y} r="9.5" class="hub" /><circle cx={stop.x} cy={stop.y} r="5" class="center" />
	{/each}
</svg>

<style>
	.board-preview {
		display: block;
		width: 100%;
		height: 100%;
	}
	.outline path {
		fill: none;
		stroke: #101819;
		stroke-opacity: 0.4;
		stroke-width: 13;
		stroke-linecap: round;
	}
	rect {
		stroke: #fff4d9a6;
		stroke-width: 0.7;
	}
	rect.locomotive {
		stroke: #1e1e1c;
		stroke-width: 1.8;
	}
	.hub {
		fill: #fffae7;
		stroke: #967b56;
		stroke-width: 1.4;
	}
	.center {
		fill: #7e5b39;
	}
</style>
