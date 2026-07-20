<script lang="ts">
	import type { City, GameState, Player, Route, RouteId } from '@repo/shared';
	import { USA_CITIES, USA_ROUTES } from '@repo/shared';
	import { tick } from 'svelte';

	type Props = {
		state: GameState;
		selectedRouteId?: RouteId;
		disabled?: boolean;
		onselect: (route: Route) => void;
	};

	let { state: gameState, selectedRouteId, disabled = false, onselect }: Props = $props();

	const cities = USA_CITIES as readonly City[];
	const routes = USA_ROUTES as readonly Route[];
	const cityById = new Map(cities.map(city => [city.id, city]));
	const playerById = $derived(new Map(gameState.players.map(player => [player.id, player])));
	const selectableRoutes = $derived(routes.filter(route => !owner(route) && !disabled));
	let focusedRouteId = $state<RouteId | undefined>();

	const routeColors = {
		red: '#c94843',
		orange: '#dc7b31',
		yellow: '#e2bb38',
		green: '#438b5e',
		blue: '#3977a9',
		purple: '#91629c',
		black: '#3d4248',
		white: '#ede7d5',
		gray: '#a39b8a',
	};

	const playerColors = {
		red: '#d84f49',
		blue: '#4388c6',
		green: '#4c9a65',
		yellow: '#e2b935',
		black: '#3d4148',
	};

	function city(id: Route['cityA']): City {
		const found = cityById.get(id);
		if (!found) throw new Error(`Unknown city: ${id}`);
		return { ...found, x: found.x * 10, y: found.y * 6.2 };
	}

	function routeGeometry(route: Route) {
		const start = city(route.cityA);
		const end = city(route.cityB);
		const parallelRoutes = route.parallelGroup
			? routes.filter(candidate => candidate.parallelGroup === route.parallelGroup)
			: [];
		const parallelOffset =
			parallelRoutes.length > 1 ? parallelRoutes.findIndex(candidate => candidate.id === route.id) * 10 - 5 : 0;
		const dx = end.x - start.x;
		const dy = end.y - start.y;
		const distance = Math.hypot(dx, dy);
		const normalX = distance ? (-dy / distance) * parallelOffset : 0;
		const normalY = distance ? (dx / distance) * parallelOffset : 0;
		const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

		return {
			start,
			end,
			dx,
			dy,
			distance,
			normalX,
			normalY,
			angle,
		};
	}

	function owner(route: Route): Player | undefined {
		const playerId = gameState.claimedRoutes[route.id];
		return playerId ? playerById.get(playerId) : undefined;
	}

	function segmentPosition(route: Route, index: number) {
		const geometry = routeGeometry(route);
		const progress = (index + 0.5) / route.length;
		return {
			x: geometry.start.x + geometry.dx * progress + geometry.normalX,
			y: geometry.start.y + geometry.dy * progress + geometry.normalY,
			angle: geometry.angle,
		};
	}

	function routeCenter(route: Route) {
		const geometry = routeGeometry(route);
		return {
			x: (geometry.start.x + geometry.end.x) / 2 + geometry.normalX,
			y: (geometry.start.y + geometry.end.y) / 2 + geometry.normalY,
		};
	}

	function focusRoute(route: Route) {
		focusedRouteId = route.id;
		void tick().then(() => document.getElementById(`route-${route.id}`)?.focus());
	}

	function moveFocus(route: Route, key: string) {
		if (key === 'Home' || key === 'End') {
			focusRoute(key === 'Home' ? selectableRoutes[0] : (selectableRoutes.at(-1) ?? selectableRoutes[0]));
			return;
		}

		const origin = routeCenter(route);
		const direction = {
			ArrowLeft: { x: -1, y: 0 },
			ArrowRight: { x: 1, y: 0 },
			ArrowUp: { x: 0, y: -1 },
			ArrowDown: { x: 0, y: 1 },
		}[key];
		if (!direction) return;

		const nextRoute = selectableRoutes
			.filter(candidate => candidate.id !== route.id)
			.map(candidate => {
				const center = routeCenter(candidate);
				const dx = center.x - origin.x;
				const dy = center.y - origin.y;
				const forward = dx * direction.x + dy * direction.y;
				const sideways = Math.abs(dx * direction.y - dy * direction.x);
				return { route: candidate, forward, score: forward + sideways * 1.8 };
			})
			.filter(candidate => candidate.forward > 0)
			.sort((left, right) => left.score - right.score)[0]?.route;

		if (nextRoute) focusRoute(nextRoute);
	}

	function accessibleSelect(event: KeyboardEvent, route: Route) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onselect(route);
			return;
		}
		if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
			event.preventDefault();
			moveFocus(route, event.key);
		}
	}

	$effect(() => {
		if (selectableRoutes.some(route => route.id === focusedRouteId)) return;
		focusedRouteId = selectableRoutes.find(route => route.id === selectedRouteId)?.id ?? selectableRoutes[0]?.id;
	});
</script>

<div class="board-frame">
	<svg
		class="board"
		viewBox="0 0 1000 620"
		role="group"
		aria-labelledby="board-title"
		aria-describedby="board-description board-help"
	>
		<title id="board-title">Ticket to Ride USA board</title>
		<desc id="board-description">A map of North American cities and the train routes connecting them.</desc>

		<defs>
			<linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0" stop-color="#e8d7ad" />
				<stop offset="0.56" stop-color="#cfba89" />
				<stop offset="1" stop-color="#bca070" />
			</linearGradient>
			<filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
				<feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-opacity="0.24" />
			</filter>
			<pattern id="water-lines" width="36" height="20" patternUnits="userSpaceOnUse">
				<path d="M0 10 Q9 4 18 10 T36 10" fill="none" stroke="#f6e8c4" stroke-opacity="0.18" stroke-width="2" />
			</pattern>
		</defs>

		<rect width="1000" height="620" rx="20" fill="#547d82" />
		<rect width="1000" height="620" rx="20" fill="url(#water-lines)" />
		<path
			d="M74 104 L130 72 L226 58 L309 73 L374 57 L454 68 L526 45 L624 62 L692 91 L785 104 L865 143 L935 206 L919 283 L879 331 L837 352 L812 406 L760 427 L717 474 L656 479 L606 526 L525 539 L457 519 L393 524 L337 491 L282 496 L224 460 L180 421 L142 367 L109 340 L101 286 L71 237 Z"
			fill="url(#paper)"
			stroke="#7c663e"
			stroke-width="5"
			filter="url(#soft-shadow)"
		/>
		<path d="M618 473 Q661 506 690 489 Q677 525 638 537 Q615 522 618 473Z" fill="#d7c291" opacity="0.8" />
		<path d="M106 339 Q150 329 182 362" fill="none" stroke="#8ba3a0" stroke-width="8" opacity="0.45" />
		<text x="500" y="108" class="map-title" text-anchor="middle">TICKET TO RIDE</text>
		<text x="500" y="131" class="map-subtitle" text-anchor="middle">NORTH AMERICA</text>

		{#each routes as route (route.id)}
			{@const routeOwner = owner(route)}
			{@const isSelected = selectedRouteId === route.id}
			{@const geometry = routeGeometry(route)}
			<g
				id={`route-${route.id}`}
				class:available={!routeOwner && !disabled}
				class:selected={isSelected}
				class:claimed={Boolean(routeOwner)}
				role="button"
				tabindex={routeOwner || disabled ? undefined : focusedRouteId === route.id ? 0 : -1}
				aria-label={`${geometry.start.name} to ${geometry.end.name}, ${route.length} ${route.color} trains${routeOwner ? `, claimed by ${routeOwner.name}` : isSelected ? ', selected' : ', open'}`}
				aria-disabled={Boolean(routeOwner) || disabled}
				aria-pressed={!routeOwner && !disabled ? isSelected : undefined}
				onclick={() => !routeOwner && !disabled && onselect(route)}
				onfocus={() => (focusedRouteId = route.id)}
				onkeydown={event => !routeOwner && !disabled && accessibleSelect(event, route)}
			>
				<line
					x1={geometry.start.x + geometry.normalX}
					y1={geometry.start.y + geometry.normalY}
					x2={geometry.end.x + geometry.normalX}
					y2={geometry.end.y + geometry.normalY}
					class="route-hitbox"
				/>
				{#each Array(route.length) as _, index}
					{@const segment = segmentPosition(route, index)}
					<rect
						x={segment.x - 9}
						y={segment.y - 5}
						width="18"
						height="10"
						rx="3"
						transform={`rotate(${segment.angle} ${segment.x} ${segment.y})`}
						fill={routeOwner ? playerColors[routeOwner.color] : routeColors[route.color]}
						class="route-segment"
					/>
				{/each}
			</g>
		{/each}

		{#each cities as cityItem (cityItem.id)}
			<g class="city" transform={`translate(${cityItem.x * 10} ${cityItem.y * 6.2})`}>
				<circle r="7" />
				<circle r="3" />
				<text y="-11" text-anchor="middle">{cityItem.name}</text>
			</g>
		{/each}
	</svg>
	<p id="board-help" class="board-help">
		Use arrow keys to move between open routes, then Enter or Space to select one.
	</p>
</div>

<style>
	.board-frame {
		min-width: 0;
	}

	.board {
		display: block;
		width: 100%;
		height: auto;
		border: 1px solid rgba(66, 51, 28, 0.45);
		border-radius: 1.25rem;
		box-shadow: 0 1.2rem 3rem rgba(10, 17, 20, 0.32);
		background: #547d82;
	}

	.map-title {
		fill: #9c352b;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 29px;
		font-weight: 800;
		letter-spacing: 3px;
		paint-order: stroke;
		stroke: #e8d5a7;
		stroke-width: 6px;
	}

	.map-subtitle {
		fill: #71522e;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 5px;
	}

	.route-hitbox {
		stroke: transparent;
		stroke-width: 22;
	}

	.available {
		cursor: pointer;
	}

	.route-segment {
		stroke: rgba(42, 35, 24, 0.72);
		stroke-width: 1.6;
		filter: drop-shadow(0 1px 1px rgba(22, 18, 13, 0.28));
		transition:
			filter 140ms ease,
			stroke 140ms ease,
			stroke-width 140ms ease;
	}

	.available:hover .route-segment,
	.available:focus-visible .route-segment,
	.selected .route-segment {
		filter: drop-shadow(0 0 5px #fff3a5);
		stroke: #fff7c8;
		stroke-width: 3;
	}

	.claimed .route-segment {
		stroke: rgba(255, 255, 255, 0.72);
		stroke-width: 2;
		animation: claim-route 280ms ease-out;
	}

	.selected .route-segment {
		animation: select-route 900ms ease-in-out infinite alternate;
	}

	.board-help {
		margin: 0.45rem 0.25rem 0;
		color: #aebfbc;
		font-size: 0.68rem;
		line-height: 1.4;
		text-align: center;
	}

	.city circle:first-child {
		fill: #4e3520;
		stroke: #f1d99e;
		stroke-width: 2;
	}

	.city circle:nth-child(2) {
		fill: #f6e8c1;
	}

	.city text {
		fill: #3f2b1d;
		font-size: 11px;
		font-weight: 800;
		paint-order: stroke;
		stroke: #e7d2a1;
		stroke-linejoin: round;
		stroke-width: 4px;
	}

	@keyframes claim-route {
		from {
			opacity: 0.25;
			stroke-width: 5;
		}
	}

	@keyframes select-route {
		to {
			filter: drop-shadow(0 0 8px #fff3a5);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.board-frame *,
		.board-frame *::before,
		.board-frame *::after {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.01ms !important;
		}
	}
</style>
