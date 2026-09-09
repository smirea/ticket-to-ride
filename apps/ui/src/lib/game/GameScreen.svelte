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
	} from '@repo/shared';
	import TrophyIcon from 'phosphor-svelte/lib/TrophyIcon';
	import GearSixIcon from 'phosphor-svelte/lib/GearSixIcon';
	import ClockCounterClockwiseIcon from 'phosphor-svelte/lib/ClockCounterClockwiseIcon';
	import XIcon from 'phosphor-svelte/lib/XIcon';
	import TicketIcon from 'phosphor-svelte/lib/TicketIcon';
	import ArrowRightIcon from 'phosphor-svelte/lib/ArrowRightIcon';
	import { onMount, tick, untrack } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';
	import Brand from './Brand.svelte';
	import GameText from './GameText.svelte';
	import PointsSeal from './PointsSeal.svelte';
	import GameBoard from './GameBoard.svelte';
	import TrainCard from './TrainCard.svelte';
	import RoutePayment from './RoutePayment.svelte';
	import { routePayments, type RoutePayment as Payment } from './route-payments';
	import CardFlight from './CardFlight.svelte';
	import { paperPose, type PaperPose } from './paper-pose';
	import DestinationCard from './DestinationCard.svelte';
	import TableStatus from './TableStatus.svelte';
	import RouteScoring from './RouteScoring.svelte';
	import PlayerPlaque from './PlayerPlaque.svelte';
	import TicketSelection from './TicketSelection.svelte';
	import ClaimFlight from './ClaimFlight.svelte';
	import type { CarriageSprite } from './board/carriage-sprites';
	import { playerPortraitAssets } from './assets';

	type Props = {
		state: GameState;
		viewerId: string;
		send: (action: GameAction) => void | boolean | Promise<void | boolean>;
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
	let paymentRoute = $state<Route>();
	let previewPayment = $state<Payment>();
	let previewTicketId = $state<TicketId>();
	let activeOfferKey = $state('');
	let settingsOpen = $state(false);
	let historyOpen = $state(false);
	let reduceMotion = $state(false);
	let gameSpeed = $state(1);
	let preferencesLoaded = $state(false);
	const preferencesKey = 'ticket-to-travel:preferences:v1';
	let dialog = $state<HTMLDialogElement>();
	let board = $state<ReturnType<typeof GameBoard>>();
	let dialogTrigger: HTMLElement | null = null;
	let resultsDismissed = $state(false);
	let ticketFilter = $state<'all' | 'unfinished'>('all');
	let ticketCollection = $state<HTMLDivElement>();
	let ticketAreaHeight = $state(480);
	let handScroll = $state<HTMLDivElement>();
	let handSpace = $state(450);
	let handCardWidth = $state(92);
	type CardRect = PaperPose;
	type Flight = {
		id: number;
		color?: CardColor;
		ticket?: (typeof USA_TICKETS)[number];
		from: CardRect;
		to: CardRect;
		blind?: boolean;
		delay?: number;
	};
	let flights = $state<Flight[]>([]);
	let nextFlightId = 0;
	let busy = $state(false);
	let actionInFlight = $state<string>();
	let hoveredRoute = $state<Route>();
	let hoveredCard = $state<CardColor>();
	let pinnedCard = $state<CardColor>();
	let rejectedRouteId = $state<string>();
	let rejectionKey = $state(0);
	let incomingCard = $state<CardColor>();
	let handReflowing = $state(false);
	let heldHand = $state<Partial<Record<CardColor, number>>>();
	let keptTicketIds = $state<TicketId[]>([]);
	let closingTickets = $state(false);
	let ticketsLanded = $state(false);
	let frozenTicketSheet = $state<{ top: number; left: number; width: number }>();
	let marketCards = $state<{ id: number; color: CardColor }[]>([]);
	let marketSerial = 0;
	let marketReady = false;
	let marketHistoryLength = 0;
	let marketAnimating = $state(false);
	let departingMarketId = $state<number>();
	let claimFlight = $state<{
		cards: { color: CardColor; from: CardRect }[];
		loadSprites: () => Promise<CarriageSprite[]>;
		settled: boolean;
	}>();
	let finishClaimFlight: (() => void) | undefined;
	const flightResolvers = new Map<number, () => void>();
	const pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, reduceMotion ? 0 : ms));

	const viewer = $derived(gameState.players.find(player => player.id === viewerId));
	const paymentsByRoute = $derived(
		new Map(USA_ROUTES.map(route => [route.id, routePayments(gameState, viewerId, route)])),
	);
	const paymentOptions = $derived(paymentRoute ? (paymentsByRoute.get(paymentRoute.id) ?? []) : []);
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
	const handColors = $derived(TRAIN_CARDS.filter(color => (displayHand?.[color] ?? 0) > 0 || incomingCard === color));
	const handMargin = $derived(
		Math.max(
			20 - handCardWidth,
			Math.min(-27, (handSpace - handCardWidth - 64) / Math.max(1, handColors.length - 1) - handCardWidth),
		),
	);
	const finalResults = $derived(gameState.finalResults ?? []);
	const showResults = $derived(gameState.phase.type === 'game-over' && !resultsDismissed);
	const panel = $derived(settingsOpen ? 'settings' : showResults ? 'results' : null);
	let visiblePanel = $state<'settings' | 'results' | null>(null);
	let panelClosing = $state(false);
	const recentLog = $derived(gameState.log.slice(-20).toReversed());
	const motionDuration = $derived(reduceMotion ? 0 : 260);
	const ticketStep = $derived(
		Math.max(
			ticketSelection && !closingTickets ? 26 : 30,
			Math.min(92, (ticketAreaHeight - 100) / Math.max(1, visibleTickets.length - 1)),
		),
	);

	onMount(() => {
		try {
			const saved = JSON.parse(localStorage.getItem(preferencesKey) ?? 'null');
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
			localStorage.setItem(preferencesKey, JSON.stringify({ gameSpeed }));
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
		if (!turnReady) paymentRoute = undefined;
		if (selectedRouteId && (!turnReady || gameState.claimedRoutes[selectedRouteId])) selectedRouteId = undefined;
	});
	$effect(() => {
		if (gameState.phase.type !== 'game-over') resultsDismissed = false;
	});
	$effect(() => {
		if (!dialog) return;
		const element = dialog;
		let motion: Animation | undefined;
		if (panel) {
			visiblePanel = panel;
			panelClosing = false;
			if (!element.open) {
				dialogTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
				element.showModal();
				motion = element.animate(
					[
						{ opacity: 0, transform: 'translateX(50px) rotate(1deg)' },
						{ opacity: 1, transform: 'translateX(0) rotate(-.4deg)' },
					],
					{ duration: motionDuration, easing: 'cubic-bezier(.2,.8,.2,1)' },
				);
			}
		} else if (element.open) {
			panelClosing = true;
			motion = element.animate(
				[
					{ opacity: 1, transform: 'translateX(0) rotate(-.4deg)' },
					{ opacity: 0, transform: 'translateX(35px) rotate(.5deg)' },
				],
				{ duration: reduceMotion ? 0 : 180, easing: 'ease-in', fill: 'forwards' },
			);
			void motion.finished
				.then(() => {
					element.close();
					visiblePanel = null;
					panelClosing = false;
					dialogTrigger?.focus();
				})
				.catch(() => {});
		}
		return () => motion?.cancel();
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
		flightResolvers.get(id)?.();
		flightResolvers.delete(id);
	}
	async function settleMarket(target: CardColor[], removedIndex?: number) {
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
				if (survivors.length === 4 && survivors.filter(color => color === 'locomotive').length === 2) {
					marketCards = [...marketCards, { id: ++marketSerial, color: 'locomotive' }];
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
		const history = gameState.history;
		const locked = busy || marketAnimating;
		untrack(() => {
			if (!marketReady) {
				marketReady = true;
				marketHistoryLength = history.length;
				marketCards = target.map(color => ({ id: ++marketSerial, color }));
			} else if (!locked) {
				const action = history.length === marketHistoryLength + 1 ? history.at(-1) : undefined;
				marketHistoryLength = history.length;
				if (target.join() !== marketCards.map(card => card.color).join()) {
					void settleMarket(target, action?.type === 'draw-face-up' ? action.index : undefined);
				}
			}
		});
	});
	async function drawCard(event: MouseEvent, index?: number) {
		if (busy || marketAnimating || !viewer || !isViewerTurn) return;
		busy = true;
		actionInFlight = 'Drawing a card';
		const before = { ...viewer.hand };
		const origin = paperPose(event.currentTarget as HTMLElement);
		heldHand = before;
		if (index !== undefined) departingMarketId = marketCards[index]?.id;
		try {
			if ((await send(index === undefined ? { type: 'draw-train-deck' } : { type: 'draw-face-up', index })) === false)
				return;
			await tick();
			const color = TRAIN_CARDS.find(card => (viewer?.hand[card] ?? 0) > before[card]);
			if (!color) return;
			const nextMarket = [...gameState.faceUpTrainCards];
			incomingCard = color;
			handReflowing = true;
			await tick();
			await pause(280);
			handReflowing = false;
			const button = document.querySelector<HTMLElement>(`[data-hand-color="${color}"]`);
			if (origin && button) {
				const destination = { ...paperPose(button), count: viewer.hand[color] };
				await launchCard(color, origin, destination, index === undefined);
			}
			heldHand = undefined;
			incomingCard = undefined;
			await tick();
			flights = [];

			if (index !== undefined) await settleMarket(nextMarket, index);
		} finally {
			departingMarketId = undefined;
			incomingCard = undefined;
			handReflowing = false;
			flights = [];
			heldHand = undefined;
			busy = false;
			actionInFlight = undefined;
		}
	}

	function claimInfo(route: Route, card?: CardColor) {
		const options = paymentsByRoute.get(route.id) ?? [];
		const choice = options.find(
			option => !card || (card === 'locomotive' ? option.wilds > 0 : option.color === card && option.cars > 0),
		);
		const color = choice?.color ?? (route.color === 'gray' ? undefined : route.color);
		return {
			color,
			wilds: choice?.wilds ?? 0,
			ok: Boolean(choice),
			points: ROUTE_SCORES[route.length] ?? route.length,
		};
	}
	const eligibleRouteIds = $derived(
		activeCard ? USA_ROUTES.filter(route => claimInfo(route, activeCard).ok).map(route => route.id) : undefined,
	);
	const routeHints = $derived(
		activeCard
			? Object.fromEntries(
					USA_ROUTES.filter(route => claimInfo(route, activeCard).ok).map(route => {
						const info = claimInfo(route, activeCard);
						return [route.id, { points: info.points, wilds: info.wilds }];
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
		if (previewPayment)
			return (
				(card === previewPayment.color && previewPayment.cars > 0) ||
				(card === 'locomotive' && previewPayment.wilds > 0)
			);
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
		if (actionInFlight && activePlayer?.id === viewerId) return actionInFlight;
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
	function selectRoute(route: Route) {
		if (!turnReady) return;
		previewTicketId = undefined;
		const options = paymentsByRoute.get(route.id) ?? [];
		if (!options.length) {
			rejectedRouteId = route.id;
			rejectionKey++;
			return;
		}
		if (options.length > 1) {
			paymentRoute = paymentRoute?.id === route.id ? undefined : route;
			selectedRouteId = paymentRoute?.id;
			return;
		}
		void claimRoute(route, options[0]!);
	}
	async function claimRoute(route: Route, payment: Payment) {
		if (!turnReady || !canClaimRoute(gameState, viewerId, route.id, payment.color, payment.wilds).ok) return;
		busy = true;
		actionInFlight = 'Placing trains';
		paymentRoute = undefined;
		selectedRouteId = route.id;
		const colors: CardColor[] = [
			...Array<CardColor>(payment.cars).fill(payment.color),
			...Array<CardColor>(payment.wilds).fill('locomotive'),
		];
		try {
			if (!reduceMotion) {
				const playerColor = viewer!.color;
				const cards = colors.flatMap(color => {
					const element = document.querySelector<HTMLElement>(`[data-hand-color="${color}"]`);
					return element
						? [{ color, from: paperPose(element.querySelector<HTMLElement>('.card-face') ?? element) }]
						: [];
				});
				if (cards.length) {
					heldHand = { ...viewer!.hand };
					for (const color of colors) heldHand[color] = (heldHand[color] ?? 0) - 1;
					claimFlight = {
						cards,
						loadSprites: async () => (await board?.claimSprites(route, playerColor)) ?? [],
						settled: false,
					};
					await new Promise<void>(resolve => {
						finishClaimFlight = resolve;
					});
				}
			}
			if (
				(await send({
					type: 'claim-route',
					routeId: route.id,
					paymentColor: payment.color,
					locomotives: payment.wilds,
				})) === false
			)
				return;
			await tick();
			if (claimFlight) {
				claimFlight.settled = true;
				await pause(240);
			}
			pinnedCard = undefined;
			hoveredCard = undefined;
			hoveredRoute = undefined;
		} finally {
			claimFlight = undefined;
			heldHand = undefined;
			busy = false;
			actionInFlight = undefined;
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
		actionInFlight = 'Keeping tickets';
		const ids = [...selectedTickets];
		const sheet = document.querySelector<HTMLElement>('.ticket-selection-sheet');
		if (sheet) frozenTicketSheet = { top: sheet.offsetTop, left: sheet.offsetLeft, width: sheet.offsetWidth };
		const sources = ids.map(id => {
			const element = document.querySelector<HTMLElement>(`[data-offer-ticket="${id}"]`);
			return { id, element, from: element ? paperPose(element) : undefined };
		});
		closingTickets = true;
		previewTicketId = undefined;
		keptTicketIds = ids;
		ticketsLanded = false;
		await tick();
		await pause(360);
		if (ticketCollection) ticketAreaHeight = ticketCollection.clientHeight;
		await tick();
		const destination = cardRect(ticketCollection ?? null);
		try {
			if (!reduceMotion && destination) {
				await Promise.all(
					sources.map(async ({ id, element, from }, i) => {
						const target = document.querySelector<HTMLElement>(`[data-held-ticket="${id}"]`);
						const ticket = ticketById.get(id);
						if (!element || !from || !target || !ticket) return;
						const flightId = ++nextFlightId;
						flights = [...flights, { id: flightId, ticket, from, to: paperPose(target), delay: i * 120 }];
						element.style.visibility = 'hidden';
						await new Promise<void>(resolve => flightResolvers.set(flightId, resolve));
					}),
				);
			}
			ticketsLanded = true;
			for (const id of ids) {
				const element = document.querySelector<HTMLElement>(`[data-offer-ticket="${id}"]`);
				if (element) element.style.visibility = 'hidden';
			}
			await tick();
			flights = [];
			await pause(100);
			if ((await send({ type: 'keep-tickets', ticketIds: ids })) === false) {
				for (const id of ids) {
					const element = document.querySelector<HTMLElement>(`[data-offer-ticket="${id}"]`);
					if (element) {
						element.style.visibility = '';
						element.getAnimations().forEach(animation => animation.cancel());
					}
				}
				return;
			}
			await tick();
			closingTickets = true;
			await pause(320);
		} finally {
			flights = [];
			closingTickets = false;
			frozenTicketSheet = undefined;
			keptTicketIds = [];
			ticketsLanded = false;
			previewTicketId = undefined;
			busy = false;
			actionInFlight = undefined;
		}
	}
</script>

<main
	class="game-shell"
	class:choosing-tickets={Boolean(ticketSelection) && !closingTickets}
	class:reduced-motion={reduceMotion}
>
	<header class="table-header">
		<div class="identity"><Brand compact /><span class="map-edition">Classic USA</span></div>
		<div class="players" aria-label="Players" style:--players={gameState.players.length}>
			{#each gameState.players as player, index (player.id)}
				<PlayerPlaque
					{player}
					{viewerId}
					{index}
					active={player.id === activePlayer?.id && gameState.phase.type !== 'game-over'}
					color={playerColors[player.color]}
				/>
			{/each}
		</div>
		<nav class="game-controls" aria-label="Game controls">
			{#if gameState.phase.type === 'game-over'}
				<button
					onclick={() => {
						settingsOpen = false;
						resultsDismissed = false;
					}}
					aria-label="Show final standings"><TrophyIcon size={21} /></button
				>
			{/if}
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
			player={gameState.phase.type === 'game-over' ? undefined : activePlayer}
			{viewerId}
			active={gameState.phase.type !== 'game-over' && (isViewerTurn || Boolean(ticketSelection))}
			message={describeTurn()}
			detail={ticketSelection
				? `Keep at least ${ticketSelection.minimum}`
				: gameState.finalRound && gameState.phase.type !== 'game-over'
					? `${gameState.finalRound.turnsRemaining} ${gameState.finalRound.turnsRemaining === 1 ? 'turn' : 'turns'} remaining`
					: undefined}
		/>
		<button
			style:visibility={completedIds.size ? undefined : 'hidden'}
			aria-hidden={!completedIds.size}
			disabled={!completedIds.size}
			class="ticket-filter"
			aria-label={ticketFilter === 'all' ? 'Show unfinished tickets' : 'Show all tickets'}
			aria-pressed={ticketFilter === 'unfinished'}
			onclick={() => (ticketFilter = ticketFilter === 'all' ? 'unfinished' : 'all')}
			>{ticketFilter === 'all' ? 'Unfinished' : 'All tickets'}</button
		>
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
		<div class="route-scoring-reference"><RouteScoring /></div>
	</aside>

	<section class="board-stage" aria-label="Game board">
		<GameBoard
			bind:this={board}
			state={gameState}
			{viewerId}
			{selectedRouteId}
			{highlightedTicket}
			motionEnabled={!reduceMotion}
			disabled={!turnReady}
			disabledReason={!busy && isViewerTurn && gameState.phase.type === 'turn' && gameState.phase.drawsTaken === 1
				? 'Draw one more card first'
				: undefined}
			onselect={selectRoute}
			onhover={route => (hoveredRoute = route)}
			{eligibleRouteIds}
			cardColor={activeCard}
			{routeHints}
			routeNotice={turnReady && !paymentRoute && hoveredRoute && handNotice
				? { routeId: hoveredRoute.id, text: handNotice, insufficient: !hoverInfo?.ok }
				: undefined}
			{rejectedRouteId}
			{rejectionKey}
		/>
	</section>

	{#if paymentRoute}
		<RoutePayment
			routeId={paymentRoute.id}
			options={paymentOptions}
			points={ROUTE_SCORES[paymentRoute.length] ?? 0}
			{reduceMotion}
			onpreview={payment => (previewPayment = payment)}
			onchoose={payment => {
				if (paymentRoute) void claimRoute(paymentRoute, payment);
			}}
			onclose={() => {
				paymentRoute = undefined;
				selectedRouteId = undefined;
			}}
		/>
	{/if}

	<footer class="play-tray">
		<section class="hand-panel" aria-label="Your train cards">
			<div class="hand-scroll" bind:this={handScroll}>
				<div class="hand-cards" class:reflowing={handReflowing} style:--hand-count={handColors.length}>
					{#each handColors as card, index (card)}
						<button
							class="hand-card"
							class:raised={!busy &&
								(previewPayment
									? cardRelevant(card)
									: (Boolean(hoveredRoute) && cardRelevant(card)) || pinnedCard === card)}
							class:receiving={incomingCard === card && !displayHand?.[card]}
							animate:flip={{ duration: motionDuration }}
							class:dimmed={!busy && Boolean(previewPayment || hoveredRoute || activeCard) && !cardRelevant(card)}
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
							in:fly={{ y: incomingCard === card ? 0 : 18, duration: incomingCard === card ? 0 : motionDuration }}
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
				{#each recentLog as entry}<p><GameText text={entry} /></p>{:else}<p>No turns yet.</p>{/each}
			</div>
		</aside>{/if}

	<dialog
		bind:this={dialog}
		oncancel={cancelDialog}
		class="decision-dialog"
		class:closing={panelClosing}
		aria-labelledby="decision-title"
	>
		{#if visiblePanel}
			<header class="dialog-heading">
				<div>
					<h2 id="decision-title">
						{visiblePanel === 'results' ? 'The final standings' : 'Settings'}
					</h2>
				</div>
				<button onclick={closePanel} aria-label="Close panel"><XIcon size={22} /></button>
			</header>
			{#if visiblePanel === 'settings'}
				<div class="settings-list">
					{#if reduceMotion}<p class="dialog-description">
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
						<GameText
							text="On your turn, take two cards, claim one route, or draw destination tickets. A face-up locomotive uses both draws."
						/>
					</p>
				</div>
				<footer class="dialog-footer">
					<a href="/">Main menu</a>{#if onrestart}<button class="quiet" onclick={restart}>New game</button>{/if}<button
						class="primary"
						onclick={closePanel}>Resume</button
					>
				</footer>
			{:else if visiblePanel === 'results'}
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
							<strong class="final-score"><span class="final-seal"><PointsSeal /></span>{result.finalScore}</strong>
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
	.final-score {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.final-seal {
		width: 25px;
		height: 25px;
		flex-shrink: 0;
	}
	.game-shell {
		transition: grid-template-columns 320ms ease;
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
		height: 130px;
		position: relative;
		z-index: 20;
		display: flex;
		align-items: flex-start;
		gap: 18px;
		padding: 20px 0 0 10px;
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
		gap: clamp(7px, 0.8vw, 13px);
		margin-top: 14px;
		min-width: 0;
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
	.route-scoring-reference {
		width: 196px;
		max-width: calc(100% - 40px);
		margin: auto 0 0 16px;
		padding-top: 20px;
		flex-shrink: 0;
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
	.journey-sidebar > .ticket-collection {
		pointer-events: none;
	}
	.ticket-button {
		pointer-events: auto;
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
	.ticket-button :global(.destination-card) {
		pointer-events: none;
		transition: transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.ticket-button.previewed :global(.destination-card) {
		transform: translate(5px, -5px);
	}
	.ticket-button.previewed {
		z-index: 50;
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
		flex-shrink: 0;
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
		pointer-events: none;
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
		overflow: visible;
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
		pointer-events: auto;
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
	.hand-card.receiving {
		visibility: hidden;
	}
	.hand-cards.reflowing .hand-card {
		transition: filter 220ms;
	}
	.hand-card:first-child {
		margin-left: 0;
	}
	.hand-card :global(.card-face) {
		pointer-events: none;
		transition: transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.hand-card:not(:disabled):hover :global(.card-face),
	.hand-card:focus-visible :global(.card-face),
	.hand-card.raised :global(.card-face) {
		transform: translateY(-18px) rotate(calc(-1 * var(--fan-angle))) scale(1.04);
	}
	.hand-card:not(:disabled):hover,
	.hand-card:focus-visible {
		filter: drop-shadow(6px 20px 11px #352b2260);
		z-index: 20 !important;
	}
	.market {
		pointer-events: auto;
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
		border: 1px solid #b09b71;
		border-radius: 5px 8px 4px 5px;
		background: #f7eed9;
		transform: rotate(-0.4deg);
		color: var(--ink);
		box-shadow:
			inset 0 0 0 3px #fff9e799,
			0 3px 0 #a99168,
			0 10px 18px #3b2c2540,
			0 30px 55px #3b2c2526;
	}
	.decision-dialog::backdrop {
		background: #182f3724;
		transition: background 180ms;
	}
	.decision-dialog.closing::backdrop {
		background: transparent;
	}
	@starting-style {
		.decision-dialog[open]::backdrop {
			background: transparent;
		}
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
		z-index: 20 !important;
		filter: drop-shadow(4px 18px 9px #352b2270);
	}
	.hand-card.dimmed {
		filter: grayscale(0.9) saturate(0.2) brightness(0.7) drop-shadow(2px 8px 5px #352b2240);
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
		.game-shell {
			transition: grid-template-columns 320ms ease;
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
			transition: grid-template-columns 320ms ease;
			grid-template-columns: 224px minmax(0, 1fr);
			padding-right: 16px;
		}
		.journey-sidebar {
			width: 254px;
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
			height: 163px;
			padding-top: 0;
			display: grid;
			grid-template-columns: 1fr auto;
			grid-template-rows: 48px 99px;
			gap: 0 12px;
		}
		.players {
			grid-row: 2;
			grid-column: 1 / -1;
			justify-content: space-between;
			margin-top: 18px;
		}
		.game-controls {
			grid-column: 2;
			grid-row: 1;
		}
		.journey-sidebar {
			padding-top: 20px;
		}
		.game-shell {
			transition: grid-template-columns 320ms ease;
			grid-template-rows: 150px minmax(330px, 1fr) 170px;
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
			transition: grid-template-columns 320ms ease;
			grid-template-columns: 242px minmax(0, 1fr);
			grid-template-rows: 150px 430px minmax(300px, 1fr);
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
			align-self: start;
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
