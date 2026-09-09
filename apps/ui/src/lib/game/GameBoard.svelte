<script lang="ts">
	import type { DestinationTicket, GameState, Player, Route, RouteId, TrainCard } from '@repo/shared';
	import { onMount, tick, untrack } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import RouteHintToken, { routeHintWidth, type RouteHint } from './RouteHintToken.svelte';
	import ColorSymbol from './ColorSymbol.svelte';
	import {
		carriageFrame,
		loadCarriageSprites,
		type CarriageManifest,
		type CarriageSprite,
	} from './board/carriage-sprites';
	import CarriageImage from './CarriageImage.svelte';
	import {
		cities,
		cityById,
		cityPoint,
		routeColors,
		routePoint,
		routeMarkerT,
		routeMarkerLength,
		ROUTE_MARKER_WIDTH,
		routes,
	} from './board/layout';
	function cityLabelLines(name: string) {
		const words = name.split(' ');
		if (name.length < 10 || words.length < 2) return [name];
		let split = 1;
		for (let i = 2; i < words.length; i++) {
			if (
				Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length) <
				Math.abs(words.slice(0, split).join(' ').length - words.slice(split).join(' ').length)
			)
				split = i;
		}
		return [words.slice(0, split).join(' '), words.slice(split).join(' ')];
	}
	type Props = {
		state: GameState;
		viewerId: string;
		selectedRouteId?: RouteId;
		highlightedTickets?: DestinationTicket[];
		ticketCityCounts?: Record<string, number>;
		previewedCityId?: string;
		oncityhover?: (cityId?: string) => void;
		celebratingTicket?: boolean;
		disabled?: boolean;
		motionEnabled?: boolean;
		onselect: (route: Route) => void;
		onhover?: (route: Route | undefined) => void;
		routeHints?: Record<string, RouteHint>;
		routeHover?: { routeId: string; hints: RouteHint[] };
		highlightedRouteId?: string;
		eligibleRouteIds?: string[];
		cardColor?: TrainCard;
	};
	let {
		state: gameState,
		viewerId,
		selectedRouteId,
		highlightedTickets = [],
		ticketCityCounts = {},
		previewedCityId,
		oncityhover,
		celebratingTicket = false,
		disabled = false,
		motionEnabled = true,
		onselect,
		onhover,
		routeHints = {},
		routeHover,
		highlightedRouteId,
		eligibleRouteIds,
		cardColor,
	}: Props = $props();
	let viewport = $state<HTMLDivElement>();
	let viewportWidth = $state(1000);
	let viewportHeight = $state(620);
	let manifest = $state<CarriageManifest>();
	let artworkError = $state(false);
	const initialClaims = untrack(() => new Set(Object.keys(gameState.claimedRoutes)));
	const carriages = $derived(
		manifest
			? routes
					.flatMap(route => {
						const player = owner(route);
						return player
							? Array.from({ length: route.length }, (_, index) => ({
									id: `${route.id}-${index}`,
									routeId: route.id,
									index,
									arrive: player.id !== viewerId && !initialClaims.has(route.id),
									frame: carriageFrame(manifest!, route, index, player.color),
								}))
							: [];
					})
					.sort((a, b) => a.frame.y - b.frame.y)
			: [],
	);

	let zoom = $state(1);
	const mapWidth = $derived(viewportWidth * zoom);
	const mapHeight = $derived(viewportHeight * zoom);
	const labelFactor = $derived(Math.min(1, Math.max(0.7, viewportWidth / 650)));
	const labelScale = $derived(`scale(${(1000 * labelFactor) / mapWidth} ${(620 * labelFactor) / mapHeight})`);

	function clickRoute(route: Route) {
		if (!owner(route) && !blocked(route) && !disabled) onselect(route);
	}

	export async function claimSprites(route: Route, color: Player['color']): Promise<CarriageSprite[]> {
		const artwork = manifest ?? (await loadCarriageSprites());
		const screen = viewport?.querySelector<SVGSVGElement>('svg.board')?.getScreenCTM();
		if (!screen) return [];
		return Array.from({ length: route.length }, (_, index) => {
			const frame = carriageFrame(artwork, route, index, color);
			const matrix = screen.translate(frame.x, frame.y).rotate(frame.angle).translate(-frame.anchorX, -frame.anchorY);
			return { ...frame, matrix: [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f] };
		});
	}

	let completionMarkers = $state<{ route: Route; index: number; key: string }[]>([]);
	let celebrationRun = 0;
	let celebrationAnimations: Animation[] = [];

	function stopCelebration() {
		celebrationRun++;
		for (const animation of celebrationAnimations) animation.cancel();
		celebrationAnimations = [];
		completionMarkers = [];
	}

	export async function celebrateTicket(steps: { routeId: string; reverse: boolean }[]): Promise<void> {
		stopCelebration();
		if (!motionEnabled || !viewport?.isConnected) return;
		const run = celebrationRun;
		completionMarkers = steps.flatMap(step => {
			const route = routes.find(candidate => candidate.id === step.routeId);
			if (!route || !owner(route)) return [];
			const indices = Array.from({ length: route.length }, (_, index) => index);
			if (step.reverse) indices.reverse();
			return indices.map(index => ({ route, index, key: `${route.id}-${index}` }));
		});
		await tick();
		if (run !== celebrationRun || !viewport?.isConnected) return;
		for (const [order, marker] of completionMarkers.entries()) {
			const piece = viewport.querySelector<SVGGElement>(`[data-carriage="${marker.key}"] .carriage-piece`);
			const highlight = viewport.querySelector<SVGRectElement>(`[data-completion-marker="${marker.key}"]`);
			if (piece)
				celebrationAnimations.push(
					piece.animate(
						[{ transform: 'scale(1)' }, { transform: 'scale(1.32)', offset: 0.45 }, { transform: 'scale(1)' }],
						{ duration: 300, delay: order * 65, easing: 'ease-in-out' },
					),
				);
			if (highlight)
				celebrationAnimations.push(
					highlight.animate([{ opacity: 0 }, { opacity: 1 }], {
						duration: 180,
						delay: order * 65,
						fill: 'forwards',
						easing: 'ease-out',
					}),
				);
		}
		await Promise.allSettled(celebrationAnimations.map(animation => animation.finished));
		if (run === celebrationRun) stopCelebration();
	}

	$effect(() => {
		if (!motionEnabled) stopCelebration();
	});

	let hoveredRouteId = $state<RouteId | undefined>();
	let focusedRouteId = $state<RouteId | undefined>();
	const playerById = $derived(new Map(gameState.players.map(player => [player.id, player])));
	const hintRoutes = $derived.by(() => {
		if (routeHover) return [];
		const sx = (1000 * labelFactor) / mapWidth;
		const sy = (620 * labelFactor) / mapHeight;
		const placed: { x: number; y: number; width: number }[] = [];
		return routes
			.filter(route => routeHints[route.id] && !owner(route))
			.filter(
				(route, index, list) =>
					!route.parallelGroup || list.findIndex(other => other.parallelGroup === route.parallelGroup) === index,
			)
			.map(route => {
				const hint = routeHints[route.id]!;
				const width = routeHintWidth(hint);
				const anchor = point(route, 0.5);
				const preferredY = anchor.y - 23 * sy;
				const candidates = [0, -1, 1, -2, 2, -3, 3]
					.flatMap(row =>
						[0, -1, 1].map(column => ({
							x: Math.max(
								(width / 2 + 4) * sx,
								Math.min(1000 - (width / 2 + 4) * sx, anchor.x + column * (width + 8) * sx),
							),
							y: Math.max(48 * sy, Math.min(620 - 18 * sy, preferredY + row * 40 * sy)),
						})),
					)
					.sort(
						(a, b) =>
							Math.hypot((a.x - anchor.x) / sx, (a.y - preferredY) / sy) -
							Math.hypot((b.x - anchor.x) / sx, (b.y - preferredY) / sy),
					);
				const { x, y } =
					candidates.find(candidate =>
						placed.every(
							other =>
								Math.abs(candidate.x - other.x) >= ((width + other.width) / 2 + 5) * sx ||
								Math.abs(candidate.y - other.y) >= 37 * sy,
						),
					) ?? candidates[0]!;
				placed.push({ x, y, width });
				return { route, hint, width, x, y, anchor, tipY: y + (anchor.y < y ? -23 : 23) * sy };
			});
	});
	const hoverStack = $derived.by(() => {
		const route = routeHover && routes.find(route => route.id === routeHover.routeId);
		if (!route || !routeHover?.hints.length) return undefined;
		const sx = (1000 * labelFactor) / mapWidth,
			sy = (620 * labelFactor) / mapHeight;
		const anchor = point(route, 0.5);
		const width = Math.max(...routeHover.hints.map(routeHintWidth));
		const height = (routeHover.hints.length - 1) * 36;
		const below = anchor.y < (height + 68) * sy;
		const x = Math.max((width / 2 + 4) * sx, Math.min(1000 - (width / 2 + 4) * sx, anchor.x));
		const preferredY = below ? anchor.y + 23 * sy : anchor.y - (height + 23) * sy;
		const y = Math.max(48 * sy, Math.min(620 - (height + 18) * sy, preferredY));
		return { x, y, below, hints: routeHover.hints };
	});

	const selectableRoutes = $derived(routes.filter(route => !owner(route) && !blocked(route) && !disabled));
	function owner(route: Route): Player | undefined {
		const playerId = gameState.claimedRoutes[route.id];
		return playerId ? playerById.get(playerId) : undefined;
	}
	function blocked(route: Route) {
		return Boolean(
			route.parallelGroup &&
			routes.some(
				other =>
					other.id !== route.id &&
					other.parallelGroup === route.parallelGroup &&
					gameState.claimedRoutes[other.id] &&
					(gameState.players.length <= 3 || gameState.claimedRoutes[other.id] === viewerId),
			),
		);
	}
	function point(route: Route, t: number) {
		return routePoint(route, t);
	}
	function path(route: Route) {
		return Array.from({ length: 49 }, (_, i) => {
			const p = point(route, i / 48);
			return `${i ? 'L' : 'M'}${p.x},${p.y}`;
		}).join(' ');
	}
	function outline(route: Route) {
		const start = cityPoint(cityById.get(route.cityA)!);
		const end = cityPoint(cityById.get(route.cityB)!);
		return `M${start.x},${start.y} L${path(route).slice(1)} L${end.x},${end.y}`;
	}
	function hoverRoute(route?: Route) {
		hoveredRouteId = route?.id;
		onhover?.(route);
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
	onMount(() => {
		if (!viewport) return;
		let cancelled = false;
		const measure = new ResizeObserver(([entry]) => {
			if (entry) {
				viewportWidth = entry.contentRect.width;
				viewportHeight = entry.contentRect.height;
			}
		});
		measure.observe(viewport);
		const atlasImage = new Image();
		atlasImage.src = '/game-assets/atlas/usa-relief-v4.webp';
		void Promise.all([loadCarriageSprites(), atlasImage.decode()])
			.then(([artwork]) => {
				if (!cancelled) manifest = artwork;
			})
			.catch(() => {
				if (!cancelled) artworkError = true;
			});
		return () => {
			cancelled = true;
			measure.disconnect();
			stopCelebration();
		};
	});

	$effect(() => {
		if (!selectableRoutes.some(route => route.id === focusedRouteId))
			focusedRouteId = selectableRoutes.find(route => route.id === selectedRouteId)?.id ?? selectableRoutes[0]?.id;
	});
</script>

<div
	class="board-frame"
	data-renderer="svg"
	data-renderer-ready={Boolean(manifest)}
	class:motion-paused={!motionEnabled}
>
	<div class="board-viewport" bind:this={viewport}>
		<div class="board-stage" style:width={`${mapWidth}px`} style:height={`${mapHeight}px`}>
			<svg
				class="board"
				class:ready={Boolean(manifest) || artworkError}
				viewBox="0 0 1000 620"
				preserveAspectRatio="none"
				role="group"
				aria-label="Ticket to Travel North America board"
				aria-describedby="board-help"
				onpointerleave={() => hoverRoute()}
			>
				<image
					href="/game-assets/atlas/usa-relief-v4.webp"
					width="1000"
					height="620"
					preserveAspectRatio="none"
					aria-hidden="true"
				/>

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
				<g>
					<g class="network-outline" class:filtering={eligibleRouteIds !== undefined} aria-hidden="true">
						{#each routes.filter(route => !owner(route)) as route (route.id)}<path d={outline(route)} />{/each}
						{#each cities as city (city.id)}{@const p = cityPoint(city)}
							<g transform={`translate(${p.x} ${p.y}) ${labelScale}`}><circle r="11" /></g>
						{/each}
					</g>
					{#each routes as route (route.id)}
						{@const routeOwner = owner(route)}{@const unavailable = blocked(route)}{@const selected =
							selectedRouteId === route.id}
						<g
							id={`route-${route.id}`}
							class="route"
							class:available={!routeOwner && !unavailable && !disabled}
							class:blocked={unavailable}
							class:selected
							class:claimed={Boolean(routeOwner)}
							class:dimmed={eligibleRouteIds !== undefined && !eligibleRouteIds.includes(route.id)}
							role="button"
							tabindex={routeOwner || unavailable || disabled ? undefined : focusedRouteId === route.id ? 0 : -1}
							aria-label={`${cityById.get(route.cityA)!.name} to ${cityById.get(route.cityB)!.name}, ${route.length} ${route.color} trains${routeOwner ? `, claimed by ${routeOwner.name}` : unavailable ? ', unavailable parallel route' : selected ? ', selected' : ', open'}`}
							aria-disabled={Boolean(routeOwner) || unavailable || disabled}
							aria-pressed={!routeOwner && !unavailable && !disabled ? selected : undefined}
							onclick={() => clickRoute(route)}
							onpointerenter={() => {
								if (!routeOwner && !unavailable) hoverRoute(route);
							}}
							onpointerleave={() => hoverRoute()}
							onfocus={() => {
								focusedRouteId = route.id;
								hoverRoute(route);
							}}
							onblur={() => hoverRoute()}
							onkeydown={event => !routeOwner && !unavailable && !disabled && keySelect(event, route)}
						>
							<path class="route-hitbox" d={path(route)} /><path class="route-aura" d={path(route)} />
							{#each Array(route.length) as _, i}
								{@const t = routeMarkerT(route, i)}
								{@const p = point(route, t)}
								{@const a = point(route, Math.max(0, t - 0.002))}
								{@const b = point(route, Math.min(1, t + 0.002))}
								<rect
									data-route-marker={route.id}
									data-marker-index={i}
									x={p.x - routeMarkerLength(route) / 2}
									y={p.y - ROUTE_MARKER_WIDTH / 2}
									width={routeMarkerLength(route)}
									height={ROUTE_MARKER_WIDTH}
									rx="0.8"
									transform={`rotate(${(Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI} ${p.x} ${p.y})`}
									fill={routeOwner
										? 'transparent'
										: route.color === 'gray' && cardColor && eligibleRouteIds?.includes(route.id)
											? routeColors[cardColor === 'locomotive' ? 'yellow' : cardColor]
											: routeColors[route.color]}
									class="marker-anchor"
									class:fallback-segment={!routeOwner}
								/>
								{#if !routeOwner && route.color !== 'gray'}
									<g
										class="route-color-symbol"
										transform={`translate(${p.x} ${p.y}) rotate(${(Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI})`}
										aria-hidden="true"
									>
										<ColorSymbol color={route.color} x={-3.6} y={-3.6} size={7.2} />
									</g>
								{/if}
							{/each}
						</g>
					{/each}
				</g>
				<g class="completion-trace" aria-hidden="true">
					{#each completionMarkers as marker (marker.key)}
						{@const t = routeMarkerT(marker.route, marker.index)}
						{@const p = point(marker.route, t)}
						{@const a = point(marker.route, Math.max(0, t - 0.002))}
						{@const b = point(marker.route, Math.min(1, t + 0.002))}
						<rect
							data-completion-marker={marker.key}
							x={p.x - routeMarkerLength(marker.route) / 2}
							y={p.y - ROUTE_MARKER_WIDTH / 2}
							width={routeMarkerLength(marker.route)}
							height={ROUTE_MARKER_WIDTH}
							rx="2"
							transform={`rotate(${(Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI} ${p.x} ${p.y})`}
						/>
					{/each}
				</g>
				<g class="claimed-carriages" aria-hidden="true">
					{#each carriages as carriage (carriage.id)}
						<g
							data-carriage={carriage.id}
							transform={`translate(${carriage.frame.x} ${carriage.frame.y}) rotate(${carriage.frame.angle})`}
						>
							<g class="carriage-piece">
								<g transform={`translate(${-carriage.frame.anchorX} ${-carriage.frame.anchorY})`}>
									<g
										in:fly={{
											y: -8,
											duration: motionEnabled && carriage.arrive ? 380 : 0,
											delay: motionEnabled && carriage.arrive ? carriage.index * 45 : 0,
										}}
									>
										<CarriageImage frame={carriage.frame} />
									</g>
								</g>
							</g>
						</g>
					{/each}
				</g>

				{#each cities as city (city.id)}
					{@const p = cityPoint(city)}{@const labelLines = cityLabelLines(city.name)}{@const labelBelow = [
						'calgary',
						'winnipeg',
						'montreal',
						'boston',
						'charleston',
						'houston',
						'little-rock',
					].includes(city.id)}{@const endpoint = highlightedTickets.some(
						ticket => ticket.cityA === city.id || ticket.cityB === city.id,
					)}
					<g
						class="city"
						class:ticket-endpoint={endpoint}
						class:has-tickets={Boolean(ticketCityCounts[city.id])}
						data-city={city.id}
						transform={`translate(${p.x} ${p.y}) ${labelScale}`}
						role={ticketCityCounts[city.id] ? 'button' : undefined}
						tabindex={ticketCityCounts[city.id] ? 0 : undefined}
						aria-label={ticketCityCounts[city.id]
							? `${city.name}: preview ${ticketCityCounts[city.id]} destination ticket${ticketCityCounts[city.id] === 1 ? '' : 's'}`
							: undefined}
						aria-pressed={ticketCityCounts[city.id] ? previewedCityId === city.id : undefined}
						onpointerenter={() => ticketCityCounts[city.id] && oncityhover?.(city.id)}
						onpointerleave={() => ticketCityCounts[city.id] && oncityhover?.()}
						onfocus={() => ticketCityCounts[city.id] && oncityhover?.(city.id)}
						onblur={() => ticketCityCounts[city.id] && oncityhover?.()}
						onclick={() => ticketCityCounts[city.id] && oncityhover?.(city.id)}
						onkeydown={event => {
							if (event.key === 'Escape') {
								event.preventDefault();
								oncityhover?.();
							}
							if (event.key === 'Enter' || event.key === ' ') {
								event.preventDefault();
								oncityhover?.(city.id);
							}
						}}
					>
						<circle class="city-shadow" cy="1.8" r="10.5" /><circle class="city-hub" r="9.2" /><circle
							class="city-center"
							r="5.4"
						/>
						<text x="0" y={labelBelow ? 25 : -17 - (labelLines.length - 1) * 16} text-anchor="middle">
							{#each labelLines as line, lineIndex}<tspan x="0" dy={lineIndex === 0 ? 0 : 16}>{line}</tspan>{/each}
						</text>
					</g>
				{/each}
				{#each hintRoutes as placement (placement.route.id)}
					{@const { hint, x, y, anchor, tipY } = placement}
					{#if Math.abs(tipY - anchor.y) > 1 || Math.abs(x - anchor.x) > 1}
						<path
							class="hint-leader"
							d={`M ${x} ${tipY} L ${anchor.x} ${anchor.y}`}
							transition:fade={{ duration: motionEnabled ? 170 : 0 }}
						/>
					{/if}
					<g class="route-hint" transform={`translate(${x} ${y}) ${labelScale}`} aria-hidden="true">
						<RouteHintToken {hint} pointer={tipY < y ? 'up' : 'down'} {motionEnabled} />
					</g>
				{/each}
				{#if hoverStack}
					<g
						class="route-hover-stack"
						transform={`translate(${hoverStack.x} ${hoverStack.y}) ${labelScale}`}
						aria-hidden="true"
					>
						{#each hoverStack.hints as hint, i (`${hint.color ?? 'unavailable'}-${hint.wilds ?? 0}`)}
							<g transform={`translate(0 ${i * 36})`}>
								<RouteHintToken
									{hint}
									{motionEnabled}
									pointer={hoverStack.below
										? i === 0
											? 'up'
											: 'none'
										: i === hoverStack.hints.length - 1
											? 'down'
											: 'none'}
								/>
							</g>
						{/each}
					</g>
				{/if}
				{#if highlightedRouteId}
					{@const highlightedRoute = routes.find(route => route.id === highlightedRouteId)}
					{#if highlightedRoute}
						<g class="journal-route-highlight" transition:fade={{ duration: motionEnabled ? 150 : 0 }}>
							<path class="journal-halo" d={path(highlightedRoute)} />
							<path class="journal-line" d={path(highlightedRoute)} />
							{#each [highlightedRoute.cityA, highlightedRoute.cityB] as id}
								{@const city = cityPoint(cityById.get(id)!)}
								<circle cx={city.x} cy={city.y} r="11" />
							{/each}
						</g>
					{/if}
				{/if}
				<g class="compass" transform="translate(950 548)" aria-hidden="true"
					><circle r="22" /><path d="M0-18 4-4 18 0 4 4 0 18 -4 4 -18 0 -4-4Z" /><text y="-28">N</text></g
				>
				<g class="ticket-preview-layer" aria-hidden="true">
					{#each ['ticket-trace-underlay', 'ticket-trace'] as layer}
						{#each celebratingTicket ? [] : highlightedTickets as ticket (ticket.id)}
							{@const a = cityPoint(cityById.get(ticket.cityA)!)}
							{@const b = cityPoint(cityById.get(ticket.cityB)!)}
							<path
								class={layer}
								transition:fade={{ duration: motionEnabled ? 180 : 0 }}
								d={`M${a.x},${a.y} Q${(a.x + b.x) / 2},${(a.y + b.y) / 2 - 35} ${b.x},${b.y}`}
							/>
						{/each}
					{/each}
					{#each cities.filter( city => highlightedTickets.some(ticket => ticket.cityA === city.id || ticket.cityB === city.id), ) as city (city.id)}
						{@const p = cityPoint(city)}
						<g class="ticket-endpoint" transform={`translate(${p.x} ${p.y}) ${labelScale}`}>
							<circle class="endpoint-ring" r="21" transition:fade={{ duration: motionEnabled ? 180 : 0 }} />
							<circle class="city-hub" r="9.2" /><circle class="city-center" r="5.4" />
						</g>
					{/each}
				</g>
			</svg>
		</div>
	</div>
	{#if artworkError}<button
			class="artwork-retry"
			onclick={async () => {
				try {
					manifest = await loadCarriageSprites();
					artworkError = false;
				} catch {}
			}}>Reload carriage artwork</button
		>{/if}
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
		Use arrow keys to move between open routes, then Enter or Space to select one. {highlightedTickets
			.map(ticket => `Previewing ${cityById.get(ticket.cityA)!.name} to ${cityById.get(ticket.cityB)!.name}.`)
			.join(' ')}
	</p>
</div>

<style>
	.route-color-symbol {
		color: #f1e8cf;
		opacity: 0.76;
		filter: drop-shadow(0 0.5px 0.45px #27251f);
		pointer-events: none;
	}
	.board-frame {
		user-select: none;
		-webkit-user-select: none;
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
		transform: rotateX(9deg) rotateZ(-0.65deg);
		transform-origin: center;
		animation: board-arrive 760ms cubic-bezier(0.2, 0.75, 0.25, 1) both;
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
	.artwork-retry {
		position: absolute;
		top: 12px;
		right: 12px;
		padding: 8px 12px;
		background: #fff3d9;
		color: #384847;
		border: 1px solid #b19a70;
		border-radius: 5px;
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
	@media (max-width: 1100px) and (orientation: portrait) {
		.map-tools {
			bottom: 0;
		}
		.map-tools button {
			height: 28px;
			min-width: 28px;
		}
	}
	.motion-paused .endpoint-ring,
	.motion-paused .ticket-trace,
	.motion-paused .selected .route-aura {
		animation: none;
	}
	.claimed-carriages {
		pointer-events: none;
	}

	.board {
		opacity: 0;
		visibility: hidden;
		transition: opacity 300ms;
		position: relative;
		display: block;
		width: 100%;
		height: 100%;
		touch-action: manipulation;
	}
	.board.ready {
		opacity: 1;
		visibility: visible;
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
	.network-outline {
		transition: opacity 180ms;
		opacity: 0.48;
		pointer-events: none;
	}
	.network-outline.filtering {
		opacity: 0.06;
	}
	.network-outline path {
		stroke: #101819;
		stroke-width: 13;
		stroke-linejoin: round;
		stroke-linecap: round;
		fill: none;
	}
	.network-outline circle {
		fill: #101819;
	}
	.blocked {
		opacity: 0.4;
	}
	.route-hitbox {
		stroke: transparent;
		stroke-width: 11.5;
		stroke-linecap: round;
		pointer-events: stroke;
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
	.available:focus-visible .route-aura {
		stroke: #fff;
		opacity: 0.9;
	}
	.marker-anchor {
		pointer-events: all;
	}
	.route:not(.available) {
		pointer-events: none;
	}
	.dimmed .fallback-segment {
		filter: grayscale(1);
		opacity: 0.5;
	}
	.fallback-segment {
		transition:
			fill 180ms,
			opacity 180ms,
			filter 180ms;
		stroke: #fff4d9a6;
		stroke-width: 0.7;
	}
	.carriage-piece {
		transform-box: view-box;
		transform-origin: 0 0;
	}
	.completion-trace {
		pointer-events: none;
	}
	.completion-trace rect {
		fill: #ffe8a0;
		stroke: #fff5ca;
		stroke-width: 5;
		opacity: 0;
		filter: drop-shadow(0 0 5px #efb43e);
	}
	.city {
		pointer-events: none;
	}
	.city.has-tickets {
		outline: none;
		pointer-events: auto;
		cursor: pointer;
	}
	.city.has-tickets:focus-visible .city-hub {
		stroke: #2b6d78;
		stroke-width: 3;
	}
	.ticket-preview-layer {
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
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 15.5px;
		font-weight: 700;
		paint-order: stroke;
		stroke: #fff7e4;
		stroke-width: 2.6;
		stroke-linejoin: round;
		letter-spacing: -0.15px;
	}
	.endpoint-ring {
		fill: #fff4b45c;
		stroke: #c2603e;
		stroke-width: 4;
		filter: drop-shadow(0 0 4px #fff);
		animation: breathe 1.8s ease-in-out infinite alternate;
	}
	.ticket-endpoint .city-hub {
		stroke: #b65439;
		stroke-width: 2.5;
	}
	.ticket-trace-underlay {
		fill: none;
		stroke: #fff7da;
		stroke-width: 9;
		opacity: 0.9;
		pointer-events: none;
		filter: drop-shadow(0 1px 2px #342f2888);
	}
	.ticket-endpoint text {
		fill: #923b28;
		stroke-width: 5;
		font-size: 16px;
	}
	.ticket-trace {
		fill: none;
		stroke: #bd5539;
		stroke-width: 4;
		stroke-dasharray: 9 6;
		opacity: 0.8;
		pointer-events: none;
		filter: drop-shadow(0 1px 1px #694b2c);
		animation: travel 5s linear infinite;
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
	.route-hint,
	.route-hover-stack {
		pointer-events: none;
	}
	.hint-leader {
		fill: none;
		stroke: #b09a6c;
		stroke-width: 1.5;
		pointer-events: none;
		vector-effect: non-scaling-stroke;
	}
	.journal-route-highlight {
		pointer-events: none;
		fill: none;
	}
	.journal-halo {
		stroke: #fff4c5;
		stroke-width: 17;
		opacity: 0.8;
		stroke-linecap: round;
	}
	.journal-line {
		stroke: #a94c2f;
		stroke-width: 3;
		stroke-dasharray: 5 5;
		animation: travel 5s linear infinite;
	}
	.journal-route-highlight circle {
		stroke: #a94c2f;
		stroke-width: 3;
		fill: #fff4c544;
	}
	@keyframes board-arrive {
		from {
			opacity: 0;
			translate: 0 -45px;
		}
		to {
			opacity: 1;
			translate: 0 0;
		}
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
