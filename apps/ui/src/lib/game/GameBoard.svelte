<script lang="ts">
	import type { DestinationTicket, GameState, Player, Route, RouteId } from '@repo/shared';
	import { onMount, tick } from 'svelte';
	import { cities, cityById, cityPoint, playerColors, routeColors, routePoint, routes } from './board/layout';
	import { createAtlasRenderer, projectPoint } from './board/renderer';
	type Props = {
		state: GameState;
		selectedRouteId?: RouteId;
		highlightedTicket?: DestinationTicket;
		disabled?: boolean;
		ambientMotion?: boolean;
		onselect: (route: Route) => void;
	};
	let {
		state: gameState,
		selectedRouteId,
		highlightedTicket,
		disabled = false,
		ambientMotion = true,
		onselect,
	}: Props = $props();
	let canvas = $state<HTMLCanvasElement>();
	let viewport = $state<HTMLDivElement>();
	let viewportWidth = $state(1000);
	let viewportHeight = $state(620);
	let atlas = $state.raw<ReturnType<typeof createAtlasRenderer> | undefined>();
	let ready = $state(false);
	let zoom = $state(1);
	const mapWidth = $derived(viewportWidth * zoom);
	const mapHeight = $derived(viewportHeight * zoom);
	const labelScale = $derived(`scale(${1000 / mapWidth} ${620 / mapHeight})`);

	let hoveredRouteId = $state<RouteId | undefined>();
	let focusedRouteId = $state<RouteId | undefined>();
	const playerById = $derived(new Map(gameState.players.map(player => [player.id, player])));
	const selectableRoutes = $derived(routes.filter(route => !owner(route) && !disabled));
	function owner(route: Route): Player | undefined {
		const playerId = gameState.claimedRoutes[route.id];
		return playerId ? playerById.get(playerId) : undefined;
	}
	function point(route: Route, t: number) {
		return projectPoint(routePoint(route, t));
	}
	function path(route: Route) {
		return Array.from({ length: 13 }, (_, i) => {
			const p = point(route, i / 12);
			return `${i ? 'L' : 'M'}${p.x},${p.y}`;
		}).join(' ');
	}
	function focusRoute(route?: Route) {
		if (!route) return;
		focusedRouteId = route.id;
		void tick().then(() => document.getElementById(`route-${route.id}`)?.focus());
	}
	function moveFocus(route: Route, key: string) {
		if (key === 'Home' || key === 'End') {
			focusRoute(key === 'Home' ? selectableRoutes[0] : selectableRoutes.at(-1));
			return;
		}
		const origin = point(route, 0.5);
		const direction = {
			ArrowLeft: { x: -1, y: 0 },
			ArrowRight: { x: 1, y: 0 },
			ArrowUp: { x: 0, y: -1 },
			ArrowDown: { x: 0, y: 1 },
		}[key];
		if (!direction) return;
		const next = selectableRoutes
			.filter(candidate => candidate.id !== route.id)
			.map(candidate => {
				const center = point(candidate, 0.5),
					dx = center.x - origin.x,
					dy = center.y - origin.y;
				const forward = dx * direction.x + dy * direction.y;
				return { route: candidate, forward, score: forward + Math.abs(dx * direction.y - dy * direction.x) * 1.8 };
			})
			.filter(candidate => candidate.forward > 0)
			.sort((a, b) => a.score - b.score)[0]?.route;
		focusRoute(next);
	}
	function keySelect(event: KeyboardEvent, route: Route) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onselect(route);
		} else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
			event.preventDefault();
			moveFocus(route, event.key);
		}
	}
	function pointerMove(event: PointerEvent) {
		const bounds = event.currentTarget instanceof Element ? event.currentTarget.getBoundingClientRect() : undefined;
		if (bounds)
			atlas?.pointer(
				((event.clientX - bounds.left) / bounds.width) * 1000,
				((event.clientY - bounds.top) / bounds.height) * 620,
			);
	}
	onMount(() => {
		if (!canvas || !viewport) return;
		const measure = new ResizeObserver(([entry]) => {
			if (entry) {
				viewportWidth = entry.contentRect.width;
				viewportHeight = entry.contentRect.height;
			}
		});
		measure.observe(viewport);
		try {
			atlas = createAtlasRenderer(canvas);
			atlas.update(gameState, selectedRouteId, hoveredRouteId);
			atlas.setAmbientMotion(ambientMotion);
			void atlas.ready
				.then(() => {
					ready = true;
				})
				.catch(() => {
					ready = false;
				});
		} catch {
			ready = false;
		}
		return () => {
			measure.disconnect();
			atlas?.destroy();
		};
	});
	$effect(() => {
		atlas?.update(gameState, selectedRouteId, hoveredRouteId);
	});
	$effect(() => {
		atlas?.setAmbientMotion(ambientMotion);
	});
	$effect(() => {
		if (!selectableRoutes.some(route => route.id === focusedRouteId))
			focusedRouteId = selectableRoutes.find(route => route.id === selectedRouteId)?.id ?? selectableRoutes[0]?.id;
	});
</script>

<div class="board-frame" class:ready data-renderer-ready={ready} class:motion-paused={!ambientMotion}>
	<div class="board-viewport" bind:this={viewport}>
		<div class="board-stage" style:width={`${mapWidth}px`} style:height={`${mapHeight}px`}>
			<canvas bind:this={canvas} aria-hidden="true"></canvas>
			<svg
				class="board"
				viewBox="0 0 1000 620"
				preserveAspectRatio="none"
				role="group"
				aria-label="Ticket to Travel North America board"
				aria-describedby="board-help"
				onpointermove={pointerMove}
				onpointerleave={() => {
					hoveredRouteId = undefined;
					atlas?.pointer(-2000, -2000);
				}}
			>
				{#if !ready}
					<image
						href="/game-assets/atlas/usa-relief-v2.webp"
						width="1000"
						height="620"
						preserveAspectRatio="none"
						aria-hidden="true"
					/>
				{/if}
				<g class="geography" aria-hidden="true"
					><text x="415" y="32">C A N A D A</text><text x="243" y="597">M E X I C O</text><text
						x="918"
						y="367"
						transform="rotate(-8 918 367)">ATLANTIC</text
					><text x="925" y="383" transform="rotate(-8 925 383)">OCEAN</text><text
						x="41"
						y="508"
						transform="rotate(8 41 508)">PACIFIC</text
					><text x="43" y="524" transform="rotate(8 43 524)">OCEAN</text></g
				>
				{#each routes as route (route.id)}
					{@const routeOwner = owner(route)}{@const selected = selectedRouteId === route.id}
					<g
						id={`route-${route.id}`}
						class="route"
						class:available={!routeOwner && !disabled}
						class:selected
						class:claimed={Boolean(routeOwner)}
						role="button"
						tabindex={routeOwner || disabled ? undefined : focusedRouteId === route.id ? 0 : -1}
						aria-label={`${cityById.get(route.cityA)!.name} to ${cityById.get(route.cityB)!.name}, ${route.length} ${route.color} trains${routeOwner ? `, claimed by ${routeOwner.name}` : selected ? ', selected' : ', open'}`}
						aria-disabled={Boolean(routeOwner) || disabled}
						aria-pressed={!routeOwner && !disabled ? selected : undefined}
						onclick={() => !routeOwner && !disabled && onselect(route)}
						onpointerenter={() => {
							if (!routeOwner && !disabled) hoveredRouteId = route.id;
						}}
						onpointerleave={() => (hoveredRouteId = undefined)}
						onfocus={() => {
							focusedRouteId = route.id;
							hoveredRouteId = route.id;
						}}
						onblur={() => (hoveredRouteId = undefined)}
						onkeydown={event => !routeOwner && !disabled && keySelect(event, route)}
					>
						<path class="route-hitbox" d={path(route)} /><path class="route-aura" d={path(route)} />
						{#if !ready}{#each Array(route.length) as _, i}{@const p = point(
									route,
									(i + 0.5) / route.length,
								)}{@const a = point(route, Math.max(0, (i + 0.5) / route.length - 0.01))}{@const b = point(
									route,
									Math.min(1, (i + 0.5) / route.length + 0.01),
								)}<rect
									x={p.x - 8}
									y={p.y - 3.5}
									width="16"
									height="7"
									rx="2"
									transform={`rotate(${(Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI} ${p.x} ${p.y})`}
									fill={routeOwner ? playerColors[routeOwner.color] : routeColors[route.color]}
									class="fallback-segment"
								/>{/each}{/if}
					</g>
				{/each}
				{#if highlightedTicket}
					{@const a = projectPoint(cityPoint(cityById.get(highlightedTicket.cityA)!))}{@const b = projectPoint(
						cityPoint(cityById.get(highlightedTicket.cityB)!),
					)}
					<path
						class="ticket-trace"
						d={`M${a.x},${a.y} Q${(a.x + b.x) / 2},${(a.y + b.y) / 2 - 35} ${b.x},${b.y}`}
						aria-hidden="true"
					/>
				{/if}
				{#each cities as city (city.id)}
					{@const p = projectPoint(cityPoint(city))}{@const endpoint =
						highlightedTicket?.cityA === city.id || highlightedTicket?.cityB === city.id}
					<g class="city" class:ticket-endpoint={endpoint} transform={`translate(${p.x} ${p.y}) ${labelScale}`}>
						{#if endpoint}<circle class="endpoint-ring" r="13" />{/if}<circle
							class="city-shadow"
							cy="1.8"
							r="9.5"
						/><circle class="city-hub" r="8.2" /><circle class="city-center" r="4.8" />
						<text
							y={city.id === 'vancouver' || city.id === 'winnipeg' ? 22 : -13}
							x={city.id === 'boston' ? -2 : 0}
							text-anchor={city.x > 90 ? 'end' : city.x < 10 ? 'start' : 'middle'}>{city.name}</text
						>
					</g>
				{/each}
				<g class="compass" transform="translate(950 548)" aria-hidden="true"
					><circle r="22" /><path d="M0-18 4-4 18 0 4 4 0 18 -4 4 -18 0 -4-4Z" /><text y="-28">N</text></g
				>
			</svg>
		</div>
	</div>
	<div class="map-tools" aria-label="Map view controls">
		<button type="button" aria-label="Zoom out" disabled={zoom <= 1} onclick={() => (zoom = Math.max(1, zoom - 0.25))}
			>−</button
		><button
			type="button"
			class="fit-control"
			onclick={() => {
				zoom = 1;
				viewport?.scrollTo({ left: 0, top: 0 });
			}}>Fit map</button
		><button type="button" aria-label="Zoom in" disabled={zoom >= 2} onclick={() => (zoom = Math.min(2, zoom + 0.25))}
			>+</button
		>
	</div>
	<p id="board-help" class="board-help">
		Use arrow keys to move between open routes, then Enter or Space to select one. {highlightedTicket
			? `Previewing ${cityById.get(highlightedTicket.cityA)!.name} to ${cityById.get(highlightedTicket.cityB)!.name}.`
			: ''}
	</p>
</div>

<style>
	.board-frame {
		position: relative;
		min-width: 0;
		width: calc(100% - 30px);
		height: calc(100% - 24px);
		margin: 8px auto 16px;
		min-height: 260px;
		isolation: isolate;
		overflow: visible;
		border: 1px solid #687d7277;
		border-radius: 10px;
		background: #68a4ac;
		transform: perspective(1900px) rotateX(9deg) rotateZ(-0.65deg);
		transform-origin: center;
		box-shadow:
			0 1px 0 #e9dfbd,
			0 3px 0 #d1c4a3,
			0 4px 0 #efe3c6,
			0 6px 0 #967b50,
			0 8px 0 #596e61,
			0 13px 12px #4f40262b,
			4px 25px 28px #4f40262b;
	}
	.board-viewport {
		width: 100%;
		height: 100%;
		min-height: 260px;
		display: flex;
		border-radius: inherit;
		overflow: auto;
		scrollbar-width: thin;
		scrollbar-color: #657e7866 transparent;
	}
	.board-stage {
		position: relative;
		aspect-ratio: 1000/620;
		flex-shrink: 0;
		margin: auto;
	}
	.map-tools {
		position: absolute;
		left: 10px;
		bottom: 10px;
		display: flex;
		border: 1px solid #7d7c5c55;
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 2px 5px #48595122;
	}
	.map-tools button {
		border: 0;
		background: #fff9ebeb;
		color: #314951;
		height: 36px;
		min-width: 36px;
		font-size: 18px;
		cursor: pointer;
	}
	.map-tools button:hover {
		background: #fff;
	}
	.map-tools button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.map-tools .fit-control {
		font: 600 11px system-ui;
		padding: 0 9px;
		border-inline: 1px solid #7d7c5c33;
	}
	.motion-paused .endpoint-ring,
	.motion-paused .ticket-trace,
	.motion-paused .selected .route-aura {
		animation: none;
	}
	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
		opacity: 0;
		transition: opacity 0.35s;
	}
	.ready canvas {
		opacity: 1;
	}
	.board {
		position: relative;
		display: block;
		width: 100%;
		height: 100%;
		touch-action: manipulation;
	}
	.geography {
		fill: #3d676da1;
		font:
			italic 10px Georgia,
			serif;
		letter-spacing: 2px;
		pointer-events: none;
	}
	.geography text:first-child,
	.geography text:nth-child(2) {
		fill: #82755a99;
		font:
			10px Georgia,
			serif;
		letter-spacing: 4px;
	}
	.route-hitbox {
		stroke: transparent;
		stroke-width: 14;
		fill: none;
	}
	.route-aura {
		stroke: #fff2b1;
		stroke-width: 11;
		stroke-linecap: round;
		fill: none;
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.16s;
		filter: drop-shadow(0 0 3px #f7cf5b);
	}
	.available {
		cursor: pointer;
	}
	.available:hover .route-aura,
	.available:focus-visible .route-aura {
		opacity: 0.55;
	}
	.selected .route-aura {
		animation: selection-glow 1.8s ease-in-out infinite alternate;
		opacity: 0.35;
		stroke: #ffdc7e;
	}
	.route:focus {
		outline: none;
	}
	.route:focus-visible .route-aura {
		stroke: #fff;
		opacity: 0.9;
	}
	.fallback-segment {
		stroke: #55554c;
		stroke-width: 0.8;
		pointer-events: none;
		filter: drop-shadow(0 1px 1px #3e432d80);
	}
	.city {
		pointer-events: none;
	}
	.city-shadow {
		fill: #51422a44;
	}
	.city-hub {
		fill: #fffae7;
		stroke: #967b56;
		stroke-width: 1.4;
	}
	.city-center {
		fill: #7e5b39;
	}
	.city text {
		fill: #21323a;
		font-family: Barlow, sans-serif;
		font-size: 14px;
		font-weight: 700;
		paint-order: stroke;
		stroke: #fff7e4;
		stroke-width: 2.6;
		stroke-linejoin: round;
		letter-spacing: -0.25px;
	}
	.endpoint-ring {
		fill: #fff4b45c;
		stroke: #efb23b;
		stroke-width: 2.5;
		filter: drop-shadow(0 0 4px #fff);
		animation: breathe 1.8s ease-in-out infinite alternate;
	}
	.ticket-endpoint .city-hub {
		stroke: #d99c27;
		stroke-width: 2.5;
	}
	.ticket-trace {
		fill: none;
		stroke: #fff2b2;
		stroke-width: 3;
		stroke-dasharray: 7 7;
		opacity: 0.8;
		pointer-events: none;
		filter: drop-shadow(0 1px 1px #694b2c);
		animation: travel 8s linear infinite;
	}
	.compass {
		fill: #336a7066;
		stroke: #32636c77;
		stroke-width: 0.7;
		pointer-events: none;
	}
	.compass circle {
		fill: none;
	}
	.compass text {
		text-anchor: middle;
		stroke: none;
		font:
			10px Georgia,
			serif;
	}
	.board-help {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	@keyframes selection-glow {
		from {
			opacity: 0.25;
		}
		to {
			opacity: 0.48;
		}
	}
	@keyframes breathe {
		to {
			stroke-width: 4;
			fill: #fff4b48c;
		}
	}
	@keyframes travel {
		to {
			stroke-dashoffset: -70;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.board-frame * {
			animation: none !important;
			transition: none !important;
		}
	}
</style>
