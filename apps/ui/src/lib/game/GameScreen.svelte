<script lang="ts">
	import {
		canClaimRoute,
		isTicketComplete,
		ROUTE_SCORES,
		TRAIN_CARDS,
		USA_CITIES,
		USA_ROUTES,
		USA_TICKETS,
		type GameAction,
		type GameState,
		type Route,
		type RouteId,
		type TicketId,
		type TrainCard as CardColor,
		type TrainColor,
	} from '@repo/shared';
	import GearSixIcon from 'phosphor-svelte/lib/GearSixIcon';
	import ClockCounterClockwiseIcon from 'phosphor-svelte/lib/ClockCounterClockwiseIcon';
	import XIcon from 'phosphor-svelte/lib/XIcon';
	import TicketIcon from 'phosphor-svelte/lib/TicketIcon';
	import ArrowRightIcon from 'phosphor-svelte/lib/ArrowRightIcon';
	import { onMount, tick, untrack } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';
	import Brand from './Brand.svelte';
	import GameBoard from './GameBoard.svelte';
	import TrainCard from './TrainCard.svelte';
	import CardFlight from './CardFlight.svelte';
	import DestinationCard from './DestinationCard.svelte';
	import TableStatus from './TableStatus.svelte';
	import TicketSelection from './TicketSelection.svelte';
	import ClaimFlight from './ClaimFlight.svelte';
	import { playerPortraitAssets } from './assets';

	type Props = {
		state: GameState;
		viewerId: string;
		send: (action: GameAction) => void;
		onrestart?: () => void;
		ongamespeedchange?: (speed: number) => void;
		debug?: boolean;
	};
	let { state: gameState, viewerId, send, onrestart, ongamespeedchange, debug = false }: Props = $props();
	const cityById = new Map(USA_CITIES.map(city => [city.id, city]));
	const ticketById = new Map(USA_TICKETS.map(ticket => [ticket.id, ticket]));
	const cardLabels: Record<CardColor, string> = {
		red: 'Red',
		orange: 'Orange',
		yellow: 'Yellow',
		green: 'Green',
		blue: 'Blue',
		purple: 'Purple',
		black: 'Black',
		white: 'Ivory',
		locomotive: 'Wild locomotive',
	};
	const playerColors = { red: '#bc4a41', blue: '#367dac', green: '#49765a', yellow: '#b9952b', black: '#404851' };
	let selectedTickets = $state<TicketId[]>([]);
	let selectedRouteId = $state<RouteId>();
	let previewTicketId = $state<TicketId>();
	let activeOfferKey = $state('');
	let settingsOpen = $state(false);
	let historyOpen = $state(false);
	let ambientMotion = $state(true);
	let reduceMotion = $state(false);
	let gameSpeed = $state(1);
	let preferencesLoaded = $state(false);
	const preferencesKey = 'ticket-to-travel:preferences:v1';
	let dialog = $state<HTMLDialogElement>();
	let dialogTrigger: HTMLElement | null = null;
	let resultsDismissed = $state(false);
	let ticketFilter = $state<'all' | 'unfinished'>('all');
	let ticketCollection = $state<HTMLDivElement>();
	let ticketAreaHeight = $state(480);
	let handScroll = $state<HTMLDivElement>();
	let handSpace = $state(450);
	let handCardWidth = $state(92);
	type CardRect = { x: number; y: number; width: number; height: number };
	type Flight = { id: number; color: CardColor; from: CardRect; to: CardRect; blind?: boolean; delay?: number };
	let flights = $state<Flight[]>([]);
	let nextFlightId = 0;
	let busy = $state(false);
	let hoveredRoute = $state<Route>();
	let hoveredCard = $state<CardColor>();
	let pinnedCard = $state<CardColor>();
	let rejectedRouteId = $state<string>();
	let rejectionKey = $state(0);
	let heldHand = $state<Partial<Record<CardColor, number>>>();
	let keptTicketIds = $state<TicketId[]>([]);
	let closingTickets = $state(false);
	let ticketsLanded = $state(false);
	let frozenTicketSheet = $state<{ top: number; left: number; width: number }>();
	let marketCards = $state<{ id: number; color: CardColor }[]>([]);
	let marketSerial = 0;
	let marketReady = false;
	let marketAnimating = $state(false);
	let departingMarketId = $state<number>();
	let claimFlight = $state<{ cards: { color: CardColor; from: CardRect; to: CardRect }[]; playerColor: string }>();
	let finishClaimFlight: (() => void) | undefined;
	const flightResolvers = new Map<number, () => void>();
	const pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, reduceMotion ? 0 : ms));

	const viewer = $derived(gameState.players.find(player => player.id === viewerId));
	const currentPlayer = $derived(gameState.players[gameState.currentPlayerIndex]);
	const isViewerTurn = $derived(gameState.phase.type === 'turn' && currentPlayer?.id === viewerId);
	const turnReady = $derived(
		!busy && isViewerTurn && gameState.phase.type === 'turn' && gameState.phase.drawsTaken === 0,
	);
	const activeCard = $derived(hoveredCard ?? pinnedCard);
	const displayHand = $derived(heldHand ?? viewer?.hand);
	const activePlayer = $derived(
		gameState.phase.type === 'ticket-selection'
			? gameState.players.find(p => gameState.phase.type === 'ticket-selection' && p.id === gameState.phase.playerId)
			: currentPlayer,
	);
	const ticketSelection = $derived(
		gameState.phase.type === 'ticket-selection' && gameState.phase.playerId === viewerId ? gameState.phase : undefined,
	);
	const offeredTickets = $derived(ticketSelection?.ticketIds.flatMap(id => ticketById.get(id) ?? []) ?? []);
	const heldTickets = $derived(
		[...new Set([...(viewer?.tickets ?? []), ...keptTicketIds])].flatMap(id => ticketById.get(id) ?? []),
	);
	const completedIds = $derived(
		new Set(heldTickets.filter(ticket => isTicketComplete(gameState, viewerId, ticket.id)).map(ticket => ticket.id)),
	);
	const visibleTickets = $derived(
		ticketFilter === 'all' ? heldTickets : heldTickets.filter(ticket => !completedIds.has(ticket.id)),
	);
	const highlightedTicket = $derived(previewTicketId ? ticketById.get(previewTicketId) : undefined);
	const handColors = $derived(TRAIN_CARDS.filter(color => (displayHand?.[color] ?? 0) > 0));
	const handMargin = $derived(
		Math.max(
			20 - handCardWidth,
			Math.min(-27, (handSpace - handCardWidth - 64) / Math.max(1, handColors.length - 1) - handCardWidth),
		),
	);
	const finalResults = $derived(gameState.finalResults ?? []);
	const showResults = $derived(gameState.phase.type === 'game-over' && !resultsDismissed);
	const panel = $derived(settingsOpen ? 'settings' : showResults ? 'results' : null);
	const recentLog = $derived(gameState.log.slice(-20).toReversed());
	const motionDuration = $derived(reduceMotion ? 0 : 260);
	const ticketStep = $derived(
		Math.max(ticketSelection ? 8 : 30, Math.min(92, (ticketAreaHeight - 100) / Math.max(1, visibleTickets.length - 1))),
	);

	onMount(() => {
		try {
			const saved = JSON.parse(localStorage.getItem(preferencesKey) ?? 'null');
			if (typeof saved?.ambientMotion === 'boolean') ambientMotion = saved.ambientMotion;
			if ([0, 1, 2].includes(saved?.gameSpeed)) gameSpeed = saved.gameSpeed;
		} catch {}
		preferencesLoaded = true;
		ongamespeedchange?.(gameSpeed);
		const preference = matchMedia('(prefers-reduced-motion: reduce)');
		reduceMotion = preference.matches;
		const update = () => {
			reduceMotion = preference.matches;
		};
		preference.addEventListener('change', update);
		const measureTickets = new ResizeObserver(([entry]) => {
			if (entry) ticketAreaHeight = entry.contentRect.height;
		});
		if (ticketCollection) measureTickets.observe(ticketCollection);
		const measureHand = new ResizeObserver(([entry]) => {
			if (entry) handSpace = entry.contentRect.width;
			handCardWidth = handScroll?.querySelector<HTMLElement>('.hand-card')?.offsetWidth ?? 92;
		});
		if (handScroll) measureHand.observe(handScroll);
		return () => {
			preference.removeEventListener('change', update);
			measureTickets.disconnect();
			measureHand.disconnect();
		};
	});

	$effect(() => {
		if (!preferencesLoaded) return;
		try {
			localStorage.setItem(preferencesKey, JSON.stringify({ ambientMotion, gameSpeed }));
		} catch {}
	});

	$effect(() => {
		const key = ticketSelection?.ticketIds.join('|') ?? '';
		if (key !== activeOfferKey) {
			activeOfferKey = key;
			selectedTickets = [];
			previewTicketId = undefined;
		}
	});
	$effect(() => {
		if (selectedRouteId && (!turnReady || gameState.claimedRoutes[selectedRouteId])) selectedRouteId = undefined;
	});
	$effect(() => {
		if (gameState.phase.type !== 'game-over') resultsDismissed = false;
	});
	$effect(() => {
		if (!dialog) return;
		if (panel && !dialog.open) {
			dialogTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
			dialog.showModal();
		} else if (!panel && dialog.open) {
			dialog.close();
			dialogTrigger?.focus();
		}
	});

	function cardRect(element: Element | null): CardRect | undefined {
		if (!element) return;
		const { x, y, width, height } = element.getBoundingClientRect();
		return { x, y, width, height };
	}
	function launchCard(color: CardColor, from: CardRect, to: CardRect, blind = false, delay = 0) {
		if (reduceMotion) return Promise.resolve();
		const id = ++nextFlightId;
		flights = [...flights, { id, color, from, to, blind, delay }];
		return new Promise<void>(resolve => flightResolvers.set(id, resolve));
	}
	function finishFlight(id: number) {
		flights = flights.filter(item => item.id !== id);
		flightResolvers.get(id)?.();
		flightResolvers.delete(id);
	}
	async function settleMarket(target: CardColor[], removedIndex?: number, replacement?: CardColor) {
		marketAnimating = true;
		try {
			if (removedIndex === undefined && marketCards.length === 5) {
				const shifted = marketCards.findIndex((_, index) =>
					marketCards.filter((_, i) => i !== index).every((card, i) => card.color === target[i]),
				);
				if (shifted >= 0) removedIndex = shifted;
			}
			if (removedIndex !== undefined) {
				marketCards = marketCards.filter((_, i) => i !== removedIndex);
				await pause(260);
			}
			const survivors = marketCards.map(card => card.color);
			const samePrefix = survivors.every((color, i) => color === target[i]);
			if (!samePrefix) {
				if (replacement === 'locomotive' && survivors.filter(color => color === 'locomotive').length >= 2) {
					marketCards = [...marketCards, { id: ++marketSerial, color: replacement }];
					await pause(320);
				}
				marketCards = [];
				await tick();
				await pause(300);
			}
			for (let i = marketCards.length; i < target.length; i++) {
				marketCards = [...marketCards, { id: ++marketSerial, color: target[i]! }];
				await pause(140);
			}
			await pause(220);
		} finally {
			marketAnimating = false;
		}
	}
	$effect(() => {
		const target = [...gameState.faceUpTrainCards];
		const locked = busy || marketAnimating;
		untrack(() => {
			if (!marketReady) {
				marketReady = true;
				marketCards = target.map(color => ({ id: ++marketSerial, color }));
			} else if (!locked && !marketAnimating && target.join() !== marketCards.map(card => card.color).join()) {
				void settleMarket(target);
			}
		});
	});
	async function drawCard(event: MouseEvent, index?: number) {
		if (busy || marketAnimating || !viewer || !isViewerTurn) return;
		busy = true;
		const before = { ...viewer.hand };
		const origin = cardRect(event.currentTarget as Element);
		const replacement = gameState.trainDeck.at(-1);
		heldHand = before;
		if (index !== undefined) departingMarketId = marketCards[index]?.id;
		try {
			send(index === undefined ? { type: 'draw-train-deck' } : { type: 'draw-face-up', index });
			await tick();
			let color = TRAIN_CARDS.find(card => (viewer?.hand[card] ?? 0) > before[card]);
			for (let attempt = 0; !color && attempt < 40; attempt++) {
				await new Promise(resolve => setTimeout(resolve, 100));
				color = TRAIN_CARDS.find(card => (viewer?.hand[card] ?? 0) > before[card]);
			}
			if (!color) return;
			const nextMarket = [...gameState.faceUpTrainCards];
			const handBounds = cardRect(handScroll ?? null);
			const destination =
				cardRect(document.querySelector('[data-hand-color="' + color + '"]')) ??
				(handBounds
					? {
							x: handBounds.x + handBounds.width / 2 - handCardWidth / 2,
							y: handBounds.y + 24,
							width: handCardWidth,
							height: handCardWidth / 0.7,
						}
					: undefined);
			if (origin && destination) await launchCard(color, origin, destination, index === undefined);
			heldHand = undefined;
			if (index !== undefined) await settleMarket(nextMarket, index, replacement);
		} finally {
			departingMarketId = undefined;
			heldHand = undefined;
			busy = false;
		}
	}

	function paymentFor(route: Route, card?: CardColor): TrainColor | undefined {
		const colors = TRAIN_CARDS.filter((color): color is TrainColor => color !== 'locomotive');
		const choices = colors.filter(color => route.color === 'gray' || route.color === color);
		if (card && card !== 'locomotive') return choices.includes(card) ? card : undefined;
		return choices.sort((a, b) => (viewer?.hand[b] ?? 0) - (viewer?.hand[a] ?? 0))[0];
	}
	function claimInfo(route: Route, card?: CardColor) {
		const color = paymentFor(route, card);
		const wilds = color ? Math.max(0, route.length - (viewer?.hand[color] ?? 0)) : 0;
		const ok = Boolean(
			color && canClaimRoute(gameState, viewerId, route.id, color).ok && (card !== 'locomotive' || wilds > 0),
		);
		return { color, wilds, ok, points: ROUTE_SCORES[route.length] ?? route.length };
	}
	const eligibleRouteIds = $derived(
		activeCard ? USA_ROUTES.filter(route => claimInfo(route, activeCard).ok).map(route => route.id) : undefined,
	);
	const routeHints = $derived(
		activeCard
			? Object.fromEntries(
					USA_ROUTES.filter(route => claimInfo(route, activeCard).ok).map(route => {
						const info = claimInfo(route, activeCard);
						return [
							route.id,
							`${info.wilds ? `+${info.wilds} locomotive${info.wilds > 1 ? 's' : ''} · ` : ''}${info.points} points`,
						];
					}),
				)
			: {},
	);
	const hoverInfo = $derived(hoveredRoute ? claimInfo(hoveredRoute, pinnedCard) : undefined);
	const handNotice = $derived(
		hoverInfo
			? `${!hoverInfo.ok ? 'not enough to claim · ' : hoverInfo.wilds ? `claim with ${hoverInfo.wilds} locomotive${hoverInfo.wilds > 1 ? 's' : ''} · ` : ''}${hoverInfo.points} points`
			: '',
	);
	function cardRelevant(card: CardColor) {
		if (!hoveredRoute || !hoverInfo) return !activeCard || activeCard === card;
		return card === hoverInfo.color || (card === 'locomotive' && hoverInfo.wilds > 0);
	}

	function cityName(id: string) {
		return cityById.get(id)?.name ?? id;
	}
	function canDrawFaceUp(card: CardColor) {
		return (
			!busy &&
			!marketAnimating &&
			isViewerTurn &&
			gameState.phase.type === 'turn' &&
			Boolean(gameState.trainDeck.length || gameState.trainDiscard.length) &&
			!(gameState.phase.drawsTaken === 1 && card === 'locomotive')
		);
	}
	function describeTurn() {
		if (gameState.phase.type === 'game-over') return 'Journey complete';
		if (ticketSelection) return 'Choose your tickets';
		if (gameState.phase.type === 'ticket-selection') {
			const choosing = gameState.players.find(
				player => gameState.phase.type === 'ticket-selection' && player.id === gameState.phase.playerId,
			);
			return `${choosing?.name ?? 'A player'} is choosing tickets`;
		}
		if (!isViewerTurn) return `${currentPlayer?.name ?? 'A player'} is playing`;
		return gameState.phase.drawsTaken === 1 ? 'Draw one more card' : 'Your move';
	}
	async function selectRoute(route: Route) {
		if (!turnReady) return;
		const info = claimInfo(route, pinnedCard);
		previewTicketId = undefined;
		if (!info.ok || !info.color) {
			rejectedRouteId = route.id;
			rejectionKey++;
			return;
		}
		busy = true;
		selectedRouteId = route.id;
		const coloredCount = route.length - info.wilds;
		const colors: CardColor[] = [
			...Array<CardColor>(coloredCount).fill(info.color),
			...Array<CardColor>(info.wilds).fill('locomotive'),
		];
		const anchors = [...document.querySelectorAll(`[data-route-marker="${route.id}"]`)];
		const routeBounds = cardRect(document.getElementById(`route-${route.id}`));
		const cards = colors.flatMap((color, i) => {
			const from = cardRect(document.querySelector(`[data-hand-color="${color}"]`));
			const to = cardRect(anchors[i] ?? null) ?? routeBounds;
			return from && to ? [{ color, from, to }] : [];
		});
		try {
			if (!reduceMotion && cards.length) {
				claimFlight = { cards, playerColor: playerColors[viewer!.color] };
				await new Promise<void>(resolve => {
					finishClaimFlight = resolve;
				});
			}
			send({ type: 'claim-route', routeId: route.id, paymentColor: info.color });
			await tick();
			for (let attempt = 0; !gameState.claimedRoutes[route.id] && attempt < 40; attempt++)
				await new Promise(resolve => setTimeout(resolve, 100));
			pinnedCard = undefined;
			hoveredCard = undefined;
			hoveredRoute = undefined;
		} finally {
			claimFlight = undefined;
			busy = false;
			selectedRouteId = undefined;
		}
	}

	function toggleTicket(id: TicketId) {
		previewTicketId = id;
		selectedTickets = selectedTickets.includes(id)
			? selectedTickets.filter(ticket => ticket !== id)
			: [...selectedTickets, id];
	}
	function closePanel() {
		if (ticketSelection && !settingsOpen) return;
		settingsOpen = false;
		selectedRouteId = undefined;
		if (showResults) resultsDismissed = true;
	}
	function cancelDialog(event: Event) {
		event.preventDefault();
		closePanel();
	}
	function restart() {
		closePanel();
		resultsDismissed = false;
		onrestart?.();
	}
	function showSettings() {
		settingsOpen = true;
		historyOpen = false;
	}
	async function keepTickets() {
		if (!ticketSelection || selectedTickets.length < ticketSelection.minimum || busy) return;
		busy = true;
		const ids = [...selectedTickets];
		const sheet = document.querySelector<HTMLElement>('.ticket-selection-sheet');
		if (sheet) frozenTicketSheet = { top: sheet.offsetTop, left: sheet.offsetLeft, width: sheet.offsetWidth };
		keptTicketIds = ids;
		ticketsLanded = false;
		await tick();
		if (ticketCollection) ticketAreaHeight = ticketCollection.clientHeight;
		await tick();
		const destination = cardRect(ticketCollection ?? null);
		try {
			if (!reduceMotion && destination) {
				await Promise.all(
					ids.map(async (id, i) => {
						const element = document.querySelector<HTMLElement>(`[data-offer-ticket="${id}"]`);
						if (!element) return;
						const from = element.getBoundingClientRect();
						const target = cardRect(document.querySelector(`[data-held-ticket="${id}"]`)) ?? destination;
						const y = target.y;
						const motion = element.animate(
							[
								{ transform: 'translate(0,0) rotate(0)', opacity: 1 },
								{
									transform: `translate(${target.x - from.x}px,${y - from.y}px) rotate(-2deg) scale(${target.width / from.width},${target.height / from.height})`,
									opacity: 1,
								},
							],
							{ duration: 500, delay: i * 120, easing: 'cubic-bezier(.22,.7,.25,1)', fill: 'forwards' },
						);
						await motion.finished;
					}),
				);
			}
			ticketsLanded = true;
			for (const id of ids) {
				const element = document.querySelector<HTMLElement>(`[data-offer-ticket="${id}"]`);
				if (element) element.style.visibility = 'hidden';
			}
			await tick();
			await pause(100);
			send({ type: 'keep-tickets', ticketIds: ids });
			await tick();
			for (let attempt = 0; !ids.every(id => viewer?.tickets.includes(id)) && attempt < 40; attempt++)
				await new Promise(resolve => setTimeout(resolve, 100));
			closingTickets = true;
			await pause(320);
		} finally {
			closingTickets = false;
			frozenTicketSheet = undefined;
			keptTicketIds = [];
			ticketsLanded = false;
			previewTicketId = undefined;
			busy = false;
		}
	}
</script>

<main class="game-shell" class:choosing-tickets={Boolean(ticketSelection)} class:reduced-motion={reduceMotion}>
	<header class="table-header">
		<div class="identity"><Brand compact /><span class="map-edition">Classic USA</span></div>
		<div class="players" aria-label="Players" style:--players={gameState.players.length}>
			{#each gameState.players as player, index (player.id)}
				<div
					class="player"
					class:active={index === gameState.currentPlayerIndex && gameState.phase.type !== 'game-over'}
					style:--player-color={playerColors[player.color]}
					aria-label={`${player.name}: ${player.score} points, ${player.trains} trains, ${Object.values(player.hand).reduce((sum, count) => sum + count, 0)} cards, ${player.tickets.length} tickets`}
				>
					<img src={playerPortraitAssets[player.color]} alt="" />
					<div class="player-info">
						<strong>{player.id === viewerId ? 'You' : player.name}</strong><span
							><b>{player.score}</b> pts <i>·</i> {player.trains} trains</span
						>
					</div>
				</div>
			{/each}
		</div>
		<nav class="game-controls" aria-label="Game controls">
			<button
				class:active={historyOpen}
				onclick={() => (historyOpen = !historyOpen)}
				aria-label="Show turn history"
				aria-expanded={historyOpen}><ClockCounterClockwiseIcon size={21} /></button
			>
			<button onclick={showSettings} aria-label="Open settings"><GearSixIcon size={21} /></button>
		</nav>
	</header>

	<aside class="journey-sidebar" aria-label="Destination tickets">
		<TableStatus
			player={activePlayer}
			{viewerId}
			active={isViewerTurn || Boolean(ticketSelection)}
			message={describeTurn()}
			detail={ticketSelection
				? `Keep at least ${ticketSelection.minimum}`
				: gameState.finalRound
					? `${gameState.finalRound.turnsRemaining} turns remaining`
					: undefined}
		/>
		{#if completedIds.size > 0}<button
				class="ticket-filter"
				aria-label={ticketFilter === 'all' ? 'Show unfinished tickets' : 'Show all tickets'}
				aria-pressed={ticketFilter === 'unfinished'}
				onclick={() => (ticketFilter = ticketFilter === 'all' ? 'unfinished' : 'all')}
				>{ticketFilter === 'all' ? 'Unfinished' : 'All tickets'}</button
			>{/if}
		<div
			class="ticket-collection"
			class:empty={visibleTickets.length === 0}
			class:stacked={visibleTickets.length > 1 && ticketStep < 100}
			style:height={visibleTickets.length ? `${114 + Math.max(0, visibleTickets.length - 1) * 92}px` : '0px'}
			bind:this={ticketCollection}
			style:--ticket-step={`${ticketStep}px`}
			style:--held-height={visibleTickets.length ? `${114 + Math.max(0, visibleTickets.length - 1) * 92}px` : '0px'}
			aria-label="Your destination tickets"
			tabindex="0"
		>
			{#each visibleTickets as ticket, index (ticket.id)}
				<button
					class="ticket-button"
					animate:flip={{ duration: motionDuration }}
					data-held-ticket={ticket.id}
					style:visibility={keptTicketIds.includes(ticket.id) && !ticketsLanded ? 'hidden' : undefined}
					style:--ticket-angle={`${[-2.4, 1.5, -1.2, 2][index % 4]}deg`}
					style:--ticket-layer={index + 1}
					class:previewed={previewTicketId === ticket.id}
					in:fly={{
						x: 100,
						y: -8,
						duration: reduceMotion || keptTicketIds.includes(ticket.id) ? 0 : 420,
						delay: reduceMotion || keptTicketIds.includes(ticket.id) ? 0 : index * 25,
					}}
					aria-label={`${cityName(ticket.cityA)} to ${cityName(ticket.cityB)}, ${ticket.points} points${completedIds.has(ticket.id) ? ', completed' : ''}`}
					aria-pressed={previewTicketId === ticket.id}
					onmouseenter={() => (previewTicketId = ticket.id)}
					onmouseleave={() => (previewTicketId = undefined)}
					onblur={() => (previewTicketId = undefined)}
					onfocus={() => (previewTicketId = ticket.id)}
					onclick={() => (previewTicketId = ticket.id)}
				>
					<DestinationCard {ticket} selected={previewTicketId === ticket.id} complete={completedIds.has(ticket.id)} />
				</button>
			{:else}<p class="empty-tickets">
					{heldTickets.length ? 'All connected' : 'No tickets yet'}
				</p>{/each}
		</div>
		{#if ticketSelection}
			<div
				class="ticket-selection-sheet"
				style:position={frozenTicketSheet ? 'absolute' : undefined}
				style:top={frozenTicketSheet ? `${frozenTicketSheet.top}px` : undefined}
				style:left={frozenTicketSheet ? `${frozenTicketSheet.left}px` : undefined}
				style:width={frozenTicketSheet ? `${frozenTicketSheet.width}px` : undefined}
				style:margin={frozenTicketSheet ? '0' : undefined}
				out:fly={{ x: -110, duration: motionDuration }}
				in:fly={{ x: -160, duration: reduceMotion ? 0 : 480 }}
			>
				<TicketSelection
					tickets={offeredTickets}
					selectedIds={selectedTickets}
					minimum={ticketSelection.minimum}
					disabled={busy || closingTickets}
					{reduceMotion}
					ontoggle={toggleTicket}
					onpreview={id => (previewTicketId = id)}
					onkeep={keepTickets}
				/>
			</div>
		{:else}
			<button
				class="draw-tickets"
				disabled={!turnReady || !gameState.destinationDeck.length}
				onclick={() => send({ type: 'draw-destination-tickets' })}
				aria-label={`Draw destination tickets. ${gameState.destinationDeck.length} remain.`}
				><TicketIcon size={25} /><span>Draw tickets</span></button
			>
		{/if}
	</aside>

	<section class="board-stage" aria-label="Game board">
		<GameBoard
			state={gameState}
			{selectedRouteId}
			{highlightedTicket}
			ambientMotion={ambientMotion && !reduceMotion}
			disabled={!turnReady}
			onselect={selectRoute}
			onhover={route => (hoveredRoute = route)}
			{eligibleRouteIds}
			{routeHints}
			{rejectedRouteId}
			{rejectionKey}
		/>
	</section>

	<footer class="play-tray">
		<section class="hand-panel" aria-label="Your train cards">
			{#if handNotice}<svg
					class="hand-notice"
					viewBox="0 0 500 64"
					aria-label={handNotice}
					in:fly={{ y: 8, duration: motionDuration }}
				>
					<defs><path id="hand-notice-arc" d="M15,54 Q250,-12 485,54" /></defs>
					<text class:insufficient={!hoverInfo?.ok}
						><textPath href="#hand-notice-arc" startOffset="50%" text-anchor="middle">{handNotice}</textPath></text
					>
				</svg>{/if}
			<div class="hand-scroll" bind:this={handScroll}>
				<div class="hand-cards" style:--hand-count={handColors.length}>
					{#each handColors as card, index (card)}
						<button
							class="hand-card"
							class:raised={(Boolean(hoveredRoute) && cardRelevant(card)) || pinnedCard === card}
							class:dimmed={Boolean(hoveredRoute || activeCard) && !cardRelevant(card)}
							aria-pressed={pinnedCard === card}
							disabled={busy}
							onpointerenter={() => (hoveredCard = card)}
							onpointerleave={() => (hoveredCard = undefined)}
							onfocus={() => (hoveredCard = card)}
							onblur={() => (hoveredCard = undefined)}
							onclick={() => (pinnedCard = pinnedCard === card ? undefined : card)}
							data-hand-color={card}
							style:margin-left={index ? `${handMargin}px` : 0}
							style:--fan-angle={`${(index - (handColors.length - 1) / 2) * Math.min(6, 26 / Math.max(1, handColors.length - 1))}deg`}
							style:--fan-rise={`${Math.abs(index - (handColors.length - 1) / 2) * 3}px`}
							style:z-index={index + 1}
							tabindex="0"
							aria-label={`${displayHand?.[card]} ${cardLabels[card]} ${card === 'locomotive' ? 'cards' : 'carriage cards'}`}
							title={`${displayHand?.[card]} ${cardLabels[card]} cards`}
							in:fly={{ y: 18, duration: motionDuration }}
						>
							<TrainCard color={card} count={displayHand?.[card]} />
						</button>
					{:else}<span class="empty-hand">No cards</span>{/each}
				</div>
			</div>
		</section>
		<section class="market" aria-label="Train card market">
			<div class="market-row">
				<div class="face-up">
					{#each marketCards as marketCard, index (marketCard.id)}
						{@const card = marketCard.color}
						<button
							class="market-card"
							class:departing={departingMarketId === marketCard.id}
							animate:flip={{ duration: reduceMotion ? 0 : 260 }}
							disabled={!canDrawFaceUp(card)}
							onclick={event => drawCard(event, index)}
							aria-label={`Draw ${cardLabels[card]} train card`}
							in:fly={{ x: 70, y: -16, duration: motionDuration }}
							out:fly={{ y: -70, duration: motionDuration }}><TrainCard color={card} /></button
						>
					{/each}
				</div>
				<button
					class="blind-deck"
					disabled={busy ||
						marketAnimating ||
						!isViewerTurn ||
						(!gameState.trainDeck.length && !gameState.trainDiscard.length)}
					onclick={event => drawCard(event)}
					aria-label={`Draw a blind train card. ${gameState.trainDeck.length} remain.`}
					><TrainCard back /><span class="deck-count">{gameState.trainDeck.length}</span></button
				>
			</div>
		</section>
	</footer>

	{#if historyOpen}<aside
			class="history-popover"
			aria-label="Recent turns"
			transition:fly={{ y: -6, duration: motionDuration }}
		>
			<header>
				<h2>Travel journal</h2>
				<button onclick={() => (historyOpen = false)} aria-label="Close history"><XIcon size={20} /></button>
			</header>
			<div>
				{#each recentLog as entry}<p>{entry}</p>{:else}<p>No turns yet.</p>{/each}
			</div>
		</aside>{/if}

	<dialog bind:this={dialog} oncancel={cancelDialog} class="decision-dialog" aria-labelledby="decision-title">
		{#if panel}
			<header class="dialog-heading">
				<div>
					<h2 id="decision-title">
						{panel === 'results' ? 'The final standings' : 'Settings'}
					</h2>
				</div>
				<button onclick={closePanel} aria-label="Close panel"><XIcon size={22} /></button>
			</header>
			{#if panel === 'settings'}
				<div class="settings-list">
					<label
						><span><strong>Living atlas</strong><small>Gentle water, boats, and wind in the trees</small></span><input
							type="checkbox"
							bind:checked={ambientMotion}
							disabled={reduceMotion}
						/></label
					>{#if reduceMotion}<p class="dialog-description">
							Your system’s reduced-motion preference is enabled.
						</p>{/if}{#if ongamespeedchange}<label
							><span><strong>Game pace</strong><small>Time between rival moves</small></span><select
								bind:value={gameSpeed}
								onchange={() => ongamespeedchange?.(gameSpeed)}
								><option value={0}>Relaxed</option><option value={1}>Normal</option><option value={2}>Quick</option
								></select
							></label
						>{/if}
					<p class="rules-note">
						On your turn, take two cards, claim one route, or draw destination tickets. A face-up locomotive uses both
						draws.
					</p>
				</div>
				<footer class="dialog-footer">
					<a href="/">Main menu</a>{#if onrestart}<button class="quiet" onclick={restart}>New game</button>{/if}<button
						class="primary"
						onclick={closePanel}>Resume</button
					>
				</footer>
			{:else if panel === 'results'}
				<div class="standings">
					{#each finalResults as result}{@const player = gameState.players.find(
							player => player.id === result.playerId,
						)}
						<article class:winner={result.rank === 1}>
							<span class="rank">{result.rank}</span>{#if player}<img
									src={playerPortraitAssets[player.color]}
									alt=""
								/>{/if}
							<div>
								<strong>{player?.name}</strong><small
									>{result.completedTickets} tickets connected · longest path {result.longestPath}</small
								>
							</div>
							<strong class="final-score">{result.finalScore}</strong>
							<p>
								Routes {result.routePoints}
								<span>Tickets {result.ticketPoints >= 0 ? '+' : ''}{result.ticketPoints}</span><span
									>Longest +{result.longestRouteBonus}</span
								>
							</p>
						</article>{/each}
				</div>
				<footer class="dialog-footer">
					<a href="/">Main menu</a>{#if onrestart}<button class="primary" onclick={restart}>Play again</button>{/if}
				</footer>
			{/if}
		{/if}
	</dialog>
	{#each flights as flight (flight.id)}<CardFlight {...flight} onfinish={() => finishFlight(flight.id)} />{/each}
	{#if claimFlight}<ClaimFlight {...claimFlight} onfinish={() => finishClaimFlight?.()} />{/if}
	{#if debug}<details class="state-inspector">
			<summary>State inspector</summary>
			<pre>{JSON.stringify(gameState, null, 2)}</pre>
		</details>{/if}
</main>

<style>
	:global(html) {
		color-scheme: light;
	}
	.game-shell {
		--ink: #20333d;
		--muted: #787d71;
		--paper: #f3efe4;
		--rule: #d5cbb8;
		position: relative;
		isolation: isolate;
		display: grid;
		grid-template-columns: 224px minmax(0, 1fr);
		grid-template-rows: 108px minmax(360px, 1fr) 180px;
		gap: 0 6px;
		width: 100%;
		height: 100svh;
		transition: grid-template-columns 400ms cubic-bezier(0.2, 0.8, 0.2, 1);
		min-height: 700px;
		padding: 0 24px 18px 8px;
		background: radial-gradient(ellipse at 45% 35%, #fffdf5, #eee8d9);
		color: var(--ink);
		font-family: Barlow, Arial, sans-serif;
	}
	button,
	a {
		-webkit-tap-highlight-color: transparent;
	}
	button {
		color: inherit;
		cursor: pointer;
	}
	button:disabled {
		cursor: default;
	}
	button:focus-visible,
	a:focus-visible,
	[tabindex]:focus-visible {
		outline: 3px solid #388bad;
		outline-offset: 4px;
	}
	h2,
	p {
		margin: 0;
	}
	h2 {
		font:
			700 18px Barlow,
			Arial,
			sans-serif;
		letter-spacing: -0.015em;
	}
	.table-header {
		grid-column: 1 / -1;
		align-self: start;
		height: 76px;
		display: flex;
		align-items: center;
		gap: 18px;
		padding: 0 0 0 10px;
		min-width: 0;
	}
	.identity {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}
	.map-edition {
		padding-left: 16px;
		margin-left: 8px;
		border-left: 1px solid var(--rule);
		color: var(--muted);
		font-size: 14px;
		white-space: nowrap;
	}
	.players {
		display: flex;
		justify-content: flex-end;
		flex: 1;
		gap: clamp(10px, 1.4vw, 24px);
		min-width: 0;
	}
	.player {
		display: flex;
		align-items: center;
		gap: 7px;
		min-width: 0;
		padding: 6px 0;
		border-bottom: 2px solid transparent;
	}
	.player.active {
		border-bottom-color: var(--player-color);
	}
	.player img {
		width: 38px;
		height: 38px;
		object-fit: cover;
		border-radius: 50%;
		padding: 2px;
		border: 2px solid var(--player-color);
		flex-shrink: 0;
	}
	.player-info {
		display: grid;
		gap: 2px;
		min-width: 0;
	}
	.player-info > strong {
		max-width: 105px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 13px;
	}
	.player-info > span {
		white-space: nowrap;
		font-size: 11px;
	}
	.player-info i {
		font-style: normal;
		color: #a79e8a;
	}
	.game-controls {
		display: flex;
		gap: 5px;
	}
	.game-controls button,
	.history-popover header button,
	.dialog-heading > button {
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		border: 1px solid var(--rule);
		border-radius: 50%;
		background: #faf7ef;
		box-shadow: 0 2px 2px #8b79591c;
		transition:
			transform 160ms ease,
			background 160ms ease;
	}
	.game-controls button:hover,
	.dialog-heading > button:hover {
		transform: translateY(-2px);
		background: #fffdf6;
	}
	.journey-sidebar {
		grid-column: 1;
		grid-row: 2 / 4;
		position: relative;
		z-index: 8;
		width: calc(100% + 64px);
		display: flex;
		flex-direction: column;
		min-height: 0;
		padding: 0 0 18px;
		pointer-events: none;
	}
	.journey-sidebar > * {
		pointer-events: auto;
	}
	.ticket-filter {
		align-self: start;
		margin: 10px 0 0 25px;
		padding: 0;
		border: 0;
		background: none;
		font-size: 11px;
		color: #7b745f;
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.ticket-collection {
		position: relative;
		min-height: 0;
		flex: 0 1 auto;
		display: flex;
		flex-direction: column;
		padding: 15px 18px 18px;
		overflow: auto;
		scrollbar-width: thin;
		scrollbar-color: #a5997b55 transparent;
	}
	.ticket-button {
		position: relative;
		flex-shrink: 0;
		width: 100%;
		height: 82px;
		padding: 0;
		border: 0;
		border-radius: 3px;
		background: none;
		transform: rotate(var(--ticket-angle));
		transform-origin: 20% 50%;
		z-index: var(--ticket-layer);
		transition:
			transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1),
			filter 220ms;
	}
	.ticket-button + .ticket-button {
		margin-top: calc(var(--ticket-step) - 82px);
	}
	.ticket-button:hover,
	.ticket-button:focus-visible,
	.stacked .ticket-button:not(:hover):not(:focus-visible):not(.previewed) :global(.route-name) {
		justify-content: flex-start;
	}
	.stacked .ticket-button:not(:hover):not(:focus-visible):not(.previewed) :global(.ticket-stub) {
		align-items: start;
	}
	.stacked .ticket-button:not(:hover):not(:focus-visible):not(.previewed) :global(.ticket-points) {
		font-size: 21px;
	}
	.ticket-button.previewed {
		z-index: 50;
		transform: translate(7px, -5px) rotate(-0.4deg);
		filter: drop-shadow(0 7px 5px #3d302733);
	}

	.empty-tickets,
	.empty-hand {
		color: var(--muted);
		font-size: 12px;
		line-height: 1.5;
	}
	.empty-hand {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
	.draw-tickets {
		align-self: start;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 9px;
		margin: 12px 0 0 25px;
		padding: 11px 21px;
		border: 1px solid #c6b994;
		border-radius: 3px;
		background: #f8f0da;
		box-shadow:
			0 2px 0 #ccb991,
			0 4px 0 #f8f0da,
			0 5px 0 #ccb991,
			2px 9px 10px #54422626;
		transform: rotate(-2deg);
		transition: transform 170ms ease;
	}
	.draw-tickets:hover:not(:disabled) {
		transform: rotate(0) translateY(-3px);
	}
	.draw-tickets > span {
		font-size: 12px;
		font-weight: 600;
	}
	.draw-tickets:disabled {
		opacity: 0.5;
	}
	.board-stage {
		grid-column: 2;
		grid-row: 2;
		position: relative;
		min-width: 0;
		min-height: 0;
		overflow: visible;
	}
	.play-tray {
		grid-column: 2;
		grid-row: 3;
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
		gap: 12px;
		min-width: 0;
		margin: -30px 0 0 -14px;
		z-index: 12;
		align-items: start;
	}
	.hand-panel {
		min-width: 0;
		position: relative;
		margin-top: -18px;
	}
	.hand-scroll {
		overflow-x: auto;
		overflow-y: hidden;
		padding: 40px 12px 30px;
		scrollbar-width: thin;
		scrollbar-color: #99876c55 transparent;
	}
	.hand-cards {
		display: flex;
		align-items: flex-start;
		width: max-content;
		min-width: 100%;
		padding: 4px 20px 0 24px;
	}
	.hand-card {
		position: relative;
		width: 92px;
		height: 132px;
		flex-shrink: 0;
		margin-left: -27px;
		transform: translateY(var(--fan-rise)) rotate(var(--fan-angle));
		transform-origin: bottom center;
		filter: drop-shadow(4px 13px 7px #352b2250);
		transition:
			transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1),
			filter 220ms;
	}
	.hand-card:first-child {
		margin-left: 0;
	}
	.hand-card:hover,
	.hand-card:focus-visible {
		transform: translateY(-15px) rotate(0) scale(1.04);
		filter: drop-shadow(6px 20px 11px #352b2260);
		z-index: 20 !important;
	}
	.market {
		position: relative;
		min-width: 0;
		padding: 10px 11px 12px;
		border: 1px solid #ac9465;
		border-radius: 13px;
		background: linear-gradient(110deg, #304943, #1d322f);
		box-shadow:
			inset 0 0 0 1px #c3aa6a50,
			0 3px 0 #725b37,
			0 6px 0 #372f21,
			4px 14px 14px #3c302445;
		transform: rotate(0.65deg);
	}
	.market-row {
		display: flex;
		align-items: center;
		gap: 13px;
	}
	.face-up {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		flex: 1;
		min-width: 0;
		gap: 8px;
		padding: 5px;
		border-radius: 6px;
		background: #091c1644;
		box-shadow:
			inset 0 2px 4px #0006,
			0 1px #ffffff0f;
	}
	.market-card,
	.blind-deck {
		position: relative;
		display: block;
		padding: 0;
		border: 0;
		border-radius: 7px;
		background: none;
		aspect-ratio: 0.7;
		transition:
			transform 190ms ease,
			filter 190ms ease;
	}
	.market-card {
		flex: 1;
		min-width: 0;
		max-width: none;
	}
	.market-card:hover:not(:disabled) {
		transform: translateY(-9px) rotate(-2deg);
		filter: drop-shadow(0 9px 4px #0006);
	}
	.market-card:disabled {
		filter: saturate(0.78);
	}
	.blind-deck {
		width: 75px;
		flex-shrink: 0;
		transform: rotate(-3deg);
		box-shadow:
			2px -2px #ddd8c9,
			3px -3px #38536a,
			4px -5px #ddd8c9,
			5px -6px #38536a,
			6px -8px #ddd8c9,
			7px -9px #38536a,
			7px 6px 7px #07161188;
	}
	.blind-deck:hover:not(:disabled) {
		transform: translateY(-5px) rotate(-1deg);
	}
	.deck-count {
		position: absolute;
		right: -9px;
		bottom: -10px;
		display: grid;
		place-items: center;
		min-width: 24px;
		height: 24px;
		padding: 2px 5px;
		border-radius: 50%;
		background: #d2be87;
		border: 1px solid #9f854d;
		color: #3e4338;
		font-size: 11px;
		font-weight: 700;
		box-shadow: 0 2px 3px #0005;
	}
	.ticket-selection-sheet {
		position: relative;
		z-index: 14;
		flex-shrink: 0;
		margin: 8px 4px 0 12px;
		transform: rotate(-1deg);
	}

	.history-popover {
		position: absolute;
		top: 69px;
		right: 22px;
		z-index: 40;
		width: min(350px, calc(100% - 32px));
		max-height: 70%;
		padding: 18px;
		border: 1px solid var(--rule);
		background: #fffaf0;
		border-radius: 9px;
		box-shadow: 0 10px 30px #26343529;
	}
	.history-popover header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 10px;
	}
	.history-popover > div {
		max-height: 360px;
		overflow: auto;
	}
	.history-popover p {
		padding: 9px 0;
		border-bottom: 1px solid #e7decd;
		font-size: 12px;
		line-height: 1.5;
	}
	.decision-dialog {
		position: fixed;
		margin: auto 24px auto auto;
		width: 380px;
		max-width: calc(100vw - 32px);
		max-height: calc(100svh - 32px);
		overflow-y: auto;
		padding: 25px;
		border: 1px solid #cfc3a9;
		border-radius: 12px;
		background: #faf6eb;
		color: var(--ink);
		box-shadow: 0 16px 70px #12262c47;
	}
	.decision-dialog::backdrop {
		background: #182f3724;
	}
	.dialog-heading {
		display: flex;
		gap: 12px;
		justify-content: space-between;
		align-items: flex-start;
	}
	.dialog-heading h2 {
		font-size: 25px;
		line-height: 1.15;
		letter-spacing: -0.025em;
	}
	.dialog-heading > button {
		flex-shrink: 0;
	}
	.dialog-description {
		margin: 14px 0 20px;
		font-size: 12px;
		line-height: 1.6;
		color: var(--muted);
	}
	.dialog-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 14px;
		margin-top: 22px;
		padding-top: 18px;
		border-top: 1px solid var(--rule);
		font-size: 11px;
	}
	.primary,
	.quiet {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		border: 0;
		border-radius: 5px;
		padding: 12px 16px;
		font-size: 12px;
		font-weight: 700;
	}
	.primary {
		background: #244d60;
		color: #fff9e8;
		box-shadow: 0 3px 5px #142b3526;
	}
	.primary:hover {
		background: #31647b;
	}
	.primary:disabled {
		opacity: 0.4;
	}
	.quiet {
		padding: 10px 0;
		background: none;
		color: #665d4c;
	}
	.dialog-footer a {
		color: #655b49;
		text-underline-offset: 4px;
	}
	.settings-list {
		display: grid;
		gap: 20px;
		padding-top: 25px;
	}
	.settings-list label {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
	}
	.settings-list strong {
		font-size: 14px;
	}
	.settings-list small {
		display: block;
		margin-top: 4px;
		font-size: 11px;
		line-height: 1.4;
		color: var(--muted);
	}
	.settings-list input {
		width: 20px;
		height: 20px;
		accent-color: #386c6e;
	}
	.settings-list select {
		padding: 8px;
		border: 1px solid #ccc2ad;
		border-radius: 4px;
		background: #fffaf0;
		color: var(--ink);
	}
	.rules-note {
		padding-top: 18px;
		border-top: 1px solid var(--rule);
		font-size: 12px;
		line-height: 1.7;
		color: var(--muted);
	}
	.standings {
		display: grid;
		gap: 12px;
		margin-top: 24px;
	}
	.standings article {
		display: flex;
		align-items: center;
		gap: 9px;
		flex-wrap: wrap;
		padding: 12px;
		border-bottom: 1px solid var(--rule);
	}
	.standings .winner {
		background: #eee7d4;
		border-radius: 6px;
	}
	.standings img {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		object-fit: cover;
	}
	.standings .rank {
		color: #9c8965;
		font-size: 18px;
	}
	.standings article > div {
		flex: 1;
	}
	.standings small {
		display: block;
		margin-top: 4px;
		font-size: 9px;
		color: var(--muted);
	}
	.standings p {
		flex-basis: 100%;
		display: flex;
		justify-content: space-between;
		font-size: 10px;
		color: #7b705b;
	}
	.final-score {
		font-size: 26px;
	}

	.state-inspector {
		position: fixed;
		bottom: 0;
		left: 5px;
		z-index: 50;
		padding: 3px 6px;
		background: #f5efdde8;
		font-size: 9px;
	}
	.state-inspector pre {
		max-height: 50vh;
		max-width: 90vw;
		overflow: auto;
	}
	.hand-card {
		padding: 0;
		border: 0;
		background: none;
		border-radius: 7px;
	}
	.hand-card.raised {
		transform: translateY(-22px) rotate(0);
		z-index: 20 !important;
		filter: drop-shadow(4px 18px 9px #352b2270);
	}
	.hand-card.dimmed {
		filter: grayscale(0.9) saturate(0.2) brightness(0.7) drop-shadow(2px 8px 5px #352b2240);
	}
	.hand-notice {
		position: absolute;
		z-index: 30;
		width: 100%;
		height: 64px;
		left: 0;
		top: -38px;
		overflow: visible;
		pointer-events: none;
	}
	.hand-notice text {
		font-size: 15px;
		font-weight: 600;
		fill: #314a43;
		paint-order: stroke;
		stroke: #fff7e7;
		stroke-width: 4px;
	}
	.hand-notice .insufficient {
		fill: #9c4337;
	}
	.market-card.departing {
		visibility: hidden;
	}
	.journey-sidebar > :global(.table-status) {
		width: calc(100% - 28px);
		margin: 0 14px 8px;
		flex-shrink: 0;
	}
	.choosing-tickets .ticket-collection {
		max-height: 220px;
		min-height: min(198px, var(--held-height));
	}
	.ticket-button :global(.destination-card) {
		min-height: 0;
	}
	.ticket-collection.empty {
		display: none;
	}
	.choosing-tickets {
		grid-template-columns: 280px minmax(0, 1fr);
	}
	.choosing-tickets .journey-sidebar {
		width: calc(100% + 22px);
	}
	.table-header {
		animation: arrive-top 620ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
	}
	.board-stage {
		animation: arrive-board 900ms cubic-bezier(0.2, 0.8, 0.2, 1) 80ms both;
	}
	.journey-sidebar {
		animation: arrive-left 700ms cubic-bezier(0.2, 0.8, 0.2, 1) 150ms both;
	}
	.play-tray {
		animation: arrive-bottom 750ms cubic-bezier(0.2, 0.8, 0.2, 1) 200ms both;
	}
	@keyframes arrive-top {
		from {
			opacity: 0;
			transform: translateY(-50px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	@keyframes arrive-left {
		from {
			opacity: 0;
			transform: translateX(-90px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}
	@keyframes arrive-bottom {
		from {
			opacity: 0;
			transform: translateY(100px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	@keyframes arrive-board {
		from {
			opacity: 0;
			transform: translate(110px, 30px);
		}
		to {
			opacity: 1;
			transform: translate(0, 0);
		}
	}

	@media (min-width: 1400px) {
		.player-info > strong {
			font-size: 15px;
		}
		.player-info > span {
			font-size: 13px;
		}
		.player img {
			width: 42px;
			height: 42px;
		}
		.game-shell {
			grid-template-rows: 108px minmax(380px, 1fr) 190px;
		}
		.hand-card {
			width: 108px;
			height: 154px;
			margin-left: -33px;
		}
		.market {
			padding: 12px 13px 14px;
		}
		.market-card {
			max-width: none;
		}
		.blind-deck {
			width: 88px;
		}
	}
	@media (max-width: 1250px) {
		.map-edition {
			display: none;
		}
		.players {
			gap: 12px;
		}
		.game-shell {
			grid-template-columns: 190px minmax(0, 1fr);
			padding-right: 16px;
		}
		.journey-sidebar {
			width: calc(100% + 68px);
		}
		.hand-card {
			width: 79px;
			height: 114px;
			margin-left: -27px;
		}
		.market {
			padding: 9px 10px 11px;
		}
		.market-row {
			gap: 13px;
		}
		.face-up {
			gap: 5px;
			padding: 4px;
		}
		.blind-deck {
			width: 59px;
		}
	}
	@media (max-width: 1100px) {
		.table-header {
			height: 102px;
			display: grid;
			grid-template-columns: 1fr auto;
			grid-template-rows: 48px 54px;
			gap: 0 12px;
		}
		.players {
			grid-row: 2;
			grid-column: 1 / -1;
			justify-content: space-between;
		}
		.player img {
			width: 32px;
			height: 32px;
		}
		.game-controls {
			grid-column: 2;
			grid-row: 1;
		}
		.game-shell {
			grid-template-rows: 146px minmax(330px, 1fr) 170px;
			min-height: 768px;
		}
		.history-popover {
			top: 104px;
		}
		.play-tray {
			grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
			margin-top: -20px;
		}
		.hand-card {
			width: 72px;
			height: 104px;
			margin-left: -28px;
		}
	}
	@media (max-width: 1100px) and (orientation: portrait) {
		.game-shell {
			grid-template-columns: 242px minmax(0, 1fr);
			grid-template-rows: 118px minmax(420px, 1fr) 320px;
			min-height: 1024px;
			padding: 0 14px 16px 6px;
		}
		.journey-sidebar {
			grid-column: 1;
			grid-row: 2 / 4;
			width: calc(100% + 18px);
		}
		.board-stage {
			grid-column: 2;
			grid-row: 2;
			align-self: center;
			height: 430px;
		}
		.play-tray {
			grid-column: 2;
			grid-row: 3;
			grid-template-columns: minmax(0, 1fr);
			grid-template-rows: 154px auto;
			margin: -20px 0 0;
			gap: 4px;
		}
		.hand-card {
			width: 85px;
			height: 122px;
		}
		.market {
			padding: 9px;
		}
		.market-row {
			gap: 8px;
		}
		.face-up {
			gap: 4px;
			padding: 3px;
		}
		.blind-deck {
			width: 49px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		*,
		*::before,
		*::after {
			transition: none !important;
			animation: none !important;
		}
	}
</style>
