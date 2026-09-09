<script lang="ts">
	import type { DestinationTicket, GameState, Player, Route, RouteId, TrainCard, TrainColor } from '@repo/shared';
	import { onMount, onDestroy, tick, untrack } from 'svelte';
	import { fade, scale, fly } from 'svelte/transition';
	import TrainPieceIcon from './TrainPieceIcon.svelte';
	import GameText from './GameText.svelte';
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
	type Props = {
		state: GameState;
		viewerId: string;
		selectedRouteId?: RouteId;
		highlightedTicket?: DestinationTicket;
		disabled?: boolean;
		disabledReason?: string;
		motionEnabled?: boolean;
		onselect: (route: Route) => void;
		onhover?: (route: Route | undefined) => void;
		routeNotice?: { routeId: string; text: string; insufficient: boolean };
		routeHints?: Record<string, { points: number; cars: number; color: TrainColor; wilds: number }>;
		eligibleRouteIds?: string[];
		cardColor?: TrainCard;
		rejectedRouteId?: string;
		rejectionKey?: number;
	};
	let {
		state: gameState,
		viewerId,
		selectedRouteId,
		highlightedTicket,
		disabled = false,
		disabledReason,
		motionEnabled = true,
		onselect,
		onhover,
		routeHints = {},
		routeNotice,
		eligibleRouteIds,
		cardColor,
		rejectedRouteId,
		rejectionKey,
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

	let unavailableNotice = $state<{ routeId: string; text: string; insufficient: boolean }>();
	let noticeTimer: ReturnType<typeof setTimeout> | undefined;
	const visibleNotice = $derived(unavailableNotice ?? routeNotice);
	onDestroy(() => clearTimeout(noticeTimer));
	$effect(() => {
		if (!disabledReason) unavailableNotice = undefined;
	});
	function clickRoute(route: Route) {
		if (owner(route) || blocked(route)) return;
		if (!disabled) {
			onselect(route);
			return;
		}
		if (disabledReason) {
			unavailableNotice = { routeId: route.id, text: disabledReason, insufficient: false };
			clearTimeout(noticeTimer);
			noticeTimer = setTimeout(() => (unavailableNotice = undefined), 1800);
		}
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

	let hoveredRouteId = $state<RouteId | undefined>();
	let focusedRouteId = $state<RouteId | undefined>();
	const playerById = $derived(new Map(gameState.players.map(player => [player.id, player])));
	const hintRoutes = $derived.by(() => {
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
				const width = 52 + (hint.cars ? 35 : 0) + (hint.wilds ? 35 : 0);
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
		atlasImage.src = '/game-assets/atlas/usa-relief-v3.webp';
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
					href="/game-assets/atlas/usa-relief-v3.webp"
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
								if (!routeOwner && !unavailable && !disabled) hoverRoute(route);
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
				{#if highlightedTicket}
					{@const a = cityPoint(cityById.get(highlightedTicket.cityA)!)}{@const b = cityPoint(
						cityById.get(highlightedTicket.cityB)!,
					)}
					<path
						class="ticket-trace-underlay"
						transition:fade={{ duration: motionEnabled ? 180 : 0 }}
						d={`M${a.x},${a.y} Q${(a.x + b.x) / 2},${(a.y + b.y) / 2 - 35} ${b.x},${b.y}`}
						aria-hidden="true"
					/>
					<path
						class="ticket-trace"
						transition:fade={{ duration: motionEnabled ? 180 : 0 }}
						d={`M${a.x},${a.y} Q${(a.x + b.x) / 2},${(a.y + b.y) / 2 - 35} ${b.x},${b.y}`}
						aria-hidden="true"
					/>
				{/if}
				<g class="claimed-carriages" aria-hidden="true">
					{#each carriages as carriage (carriage.id)}
						<g
							data-carriage={carriage.id}
							transform={`translate(${carriage.frame.x} ${carriage.frame.y}) rotate(${carriage.frame.angle}) translate(${-carriage.frame.anchorX} ${-carriage.frame.anchorY})`}
						>
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
					{/each}
				</g>

				{#each cities as city (city.id)}
					{@const p = cityPoint(city)}{@const endpoint =
						highlightedTicket?.cityA === city.id || highlightedTicket?.cityB === city.id}
					<g class="city" class:ticket-endpoint={endpoint} transform={`translate(${p.x} ${p.y}) ${labelScale}`}>
						{#if endpoint}<circle
								class="endpoint-ring"
								r="21"
								transition:fade={{ duration: motionEnabled ? 180 : 0 }}
							/>{/if}<circle class="city-shadow" cy="1.8" r="9.5" /><circle class="city-hub" r="8.2" /><circle
							class="city-center"
							r="4.8"
						/>
						<text
							y={['winnipeg', 'montreal', 'boston', 'kansas-city', 'little-rock'].includes(city.id) ? 22 : -13}
							x={city.id === 'boston' ? -2 : 0}
							text-anchor={city.x > 90 ? 'end' : city.x < 10 ? 'start' : 'middle'}>{city.name}</text
						>
					</g>
				{/each}
				{#each hintRoutes as placement (placement.route.id)}
					{@const { hint, width, x, y, anchor, tipY } = placement}
					{#if Math.abs(tipY - anchor.y) > 1 || Math.abs(x - anchor.x) > 1}
						<path
							class="hint-leader"
							d={`M ${x} ${tipY} L ${anchor.x} ${anchor.y}`}
							transition:fade={{ duration: motionEnabled ? 170 : 0 }}
						/>
					{/if}
					<g class="route-hint" transform={`translate(${x} ${y}) ${labelScale}`} aria-hidden="true">
						<g class="hint-paper" transition:scale={{ start: 0.65, duration: motionEnabled ? 170 : 0 }}>
							<path
								d={`M ${-width / 2 + 9} -16 H ${width / 2 - 9} Q ${width / 2} -16 ${width / 2} -7 V 7 Q ${width / 2} 16 ${width / 2 - 9} 16 H 7 L 0 23 L -7 16 H ${-width / 2 + 9} Q ${-width / 2} 16 ${-width / 2} 7 V -7 Q ${-width / 2} -16 ${-width / 2 + 9} -16 Z`}
								fill={hint.cars ? routeColors[hint.color] : '#405e65'}
								transform={tipY < y ? 'scale(1 -1)' : undefined}
							/>
							<rect x={-width / 2 + 3} y="-13" width={width - 6} height="26" rx="6" />
							<g transform={`translate(${-width / 2 + 7} 0)`}>
								<text x="0" y="5">{hint.points}</text>
								<image href="/game-assets/atlas/points-clay-seal.webp" x="18" y="-10" width="20" height="20" />
								{#if hint.cars}
									<text x="41" y="5">{hint.cars}</text>
									<g transform="translate(52 -9)"
										><TrainPieceIcon color={routeColors[hint.color]} width={22} height={18} /></g
									>
								{/if}
								{#if hint.wilds}
									{@const offset = hint.cars ? 76 : 41}
									<text x={offset} y="5">{hint.wilds}</text>
									<g transform={`translate(${offset + 11} -9)`}
										><TrainPieceIcon color="#3c5159" locomotive width={22} height={18} /></g
									>
								{/if}
							</g>
						</g>
					</g>
				{/each}
				{#if visibleNotice}
					{@const route = routes.find(route => route.id === visibleNotice.routeId)}
					{#if route}{@const p = point(route, 0.5)}
						<g
							class="route-notice"
							class:insufficient={visibleNotice.insufficient}
							transform={`translate(${p.x} ${p.y - 22}) ${labelScale}`}
							aria-label={visibleNotice.text}
							transition:fade={{ duration: motionEnabled ? 120 : 0 }}
						>
							<foreignObject x="-200" y="-22" width="400" height="46"
								><div class="notice-content"><GameText text={visibleNotice.text} /></div></foreignObject
							>
						</g>
					{/if}
				{/if}
				{#key rejectionKey}
					{#if rejectedRouteId}
						{@const rejected = routes.find(route => route.id === rejectedRouteId)}
						{#if rejected}
							{@const p = point(rejected, 0.5)}
							<g class="route-rejection" aria-hidden="true">
								<path d={path(rejected)} />
								<g transform={`translate(${p.x} ${p.y - 22}) ${labelScale}`}>
									<rect x="-74" y="-13" width="148" height="24" rx="5" />
									<text y="3">not enough to claim</text>
								</g>
							</g>
						{/if}
					{/if}
				{/key}
				<g class="compass" transform="translate(950 548)" aria-hidden="true"
					><circle r="22" /><path d="M0-18 4-4 18 0 4 4 0 18 -4 4 -18 0 -4-4Z" /><text y="-28">N</text></g
				>
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
		Use arrow keys to move between open routes, then Enter or Space to select one. {highlightedTicket
			? `Previewing ${cityById.get(highlightedTicket.cityA)!.name} to ${cityById.get(highlightedTicket.cityB)!.name}.`
			: ''}
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
	.route-notice {
		pointer-events: none;
		font-size: 13px;
		font-weight: 650;
		fill: #284e42;
		color: #284e42;
		paint-order: stroke;
		stroke: #fff7e7;
		stroke-width: 4px;
		stroke-linejoin: round;
	}
	.route-notice.insufficient {
		fill: #a03e31;
		color: #a03e31;
	}
	.notice-content {
		text-align: center;
		padding: 5px 0;
		text-shadow:
			0 1px 2px #fff7e7,
			0 -1px 2px #fff7e7,
			1px 0 2px #fff7e7,
			-1px 0 2px #fff7e7;
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
	.route-rejection {
		pointer-events: none;
		text-anchor: middle;
		font:
			600 11px Barlow,
			sans-serif;
	}
	.hint-leader {
		fill: none;
		stroke: #b09a6c;
		stroke-width: 1.5;
		pointer-events: none;
		vector-effect: non-scaling-stroke;
	}
	.hint-paper {
		transform-box: fill-box;
		transform-origin: center bottom;
		filter: drop-shadow(1px 3px 2px #33281855);
	}
	.route-hint {
		animation: hint-in 180ms ease-out both;
	}
	.route-hint rect {
		fill: #fff3d9;
		stroke: #efdcaa;
		stroke-width: 1;
	}
	.hint-paper > path {
		stroke: #b09a6c;
		stroke-width: 1.2;
		stroke-linejoin: round;
	}
	.route-hint text {
		fill: #263d42;
		text-anchor: start;
		font:
			700 14px Georgia,
			serif;
	}
	.route-rejection {
		animation: rejection-out 1.8s ease both;
	}
	.route-rejection path {
		fill: none;
		stroke: #b63e30;
		stroke-width: 13;
		stroke-linecap: round;
		opacity: 0.4;
		animation: route-jiggle 480ms ease-out;
	}
	.route-rejection rect {
		fill: #fff0e4f5;
		stroke: #b63e3055;
	}
	.route-rejection text {
		fill: #a83328;
		font-weight: 700;
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
	@keyframes hint-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	@keyframes rejection-out {
		0% {
			opacity: 0;
		}
		10%,
		65% {
			opacity: 1;
		}
		100% {
			opacity: 0;
		}
	}
	@keyframes route-jiggle {
		15%,
		45%,
		75% {
			translate: -3px 0;
		}
		30%,
		60%,
		90% {
			translate: 3px 0;
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
