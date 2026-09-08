<script lang="ts">
	import {
		canClaimRoute,
		isTicketComplete,
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
	import { fly } from 'svelte/transition';
	import Brand from './Brand.svelte';
	import GameBoard from './GameBoard.svelte';
	import TrainCard from './TrainCard.svelte';
	import CardFlight from './CardFlight.svelte';
	import DestinationCard from './DestinationCard.svelte';
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
	const routeById = new Map(USA_ROUTES.map(route => [route.id, route]));
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
	let previousHand: Partial<Record<CardColor, number>> | undefined;
	let drawOrigin: { rect: CardRect; blind: boolean } | undefined;
	let paymentTarget: CardRect | undefined;
	let paymentOrigins = new Map<CardColor, CardRect>();

	const viewer = $derived(gameState.players.find(player => player.id === viewerId));
	const currentPlayer = $derived(gameState.players[gameState.currentPlayerIndex]);
	const isViewerTurn = $derived(gameState.phase.type === 'turn' && currentPlayer?.id === viewerId);
	const turnReady = $derived(isViewerTurn && gameState.phase.type === 'turn' && gameState.phase.drawsTaken === 0);
	const selectedRoute = $derived(selectedRouteId ? routeById.get(selectedRouteId) : undefined);
	const ticketSelection = $derived(
		gameState.phase.type === 'ticket-selection' && gameState.phase.playerId === viewerId ? gameState.phase : undefined,
	);
	const offeredTickets = $derived(ticketSelection?.ticketIds.flatMap(id => ticketById.get(id) ?? []) ?? []);
	const heldTickets = $derived(viewer?.tickets.flatMap(id => ticketById.get(id) ?? []) ?? []);
	const completedIds = $derived(
		new Set(heldTickets.filter(ticket => isTicketComplete(gameState, viewerId, ticket.id)).map(ticket => ticket.id)),
	);
	const visibleTickets = $derived(
		ticketFilter === 'all' ? heldTickets : heldTickets.filter(ticket => !completedIds.has(ticket.id)),
	);
	const highlightedTicket = $derived(
		(previewTicketId ? ticketById.get(previewTicketId) : undefined) ?? offeredTickets[0],
	);
	const handColors = $derived(TRAIN_CARDS.filter(color => (viewer?.hand[color] ?? 0) > 0));
	const handMargin = $derived(
		Math.max(
			20 - handCardWidth,
			Math.min(-27, (handSpace - handCardWidth - 64) / Math.max(1, handColors.length - 1) - handCardWidth),
		),
	);
	const finalResults = $derived(gameState.finalResults ?? []);
	const showResults = $derived(gameState.phase.type === 'game-over' && !resultsDismissed);
	const panel = $derived(settingsOpen ? 'settings' : selectedRoute ? 'claim' : showResults ? 'results' : null);
	const recentLog = $derived(gameState.log.slice(-20).toReversed());
	const motionDuration = $derived(reduceMotion ? 0 : 260);
	const ticketStep = $derived(
		Math.max(30, Math.min(118, (ticketAreaHeight - 110) / Math.max(1, visibleTickets.length - 1))),
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
			previewTicketId = ticketSelection?.ticketIds[0];
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
		if (reduceMotion) return;
		flights = [...flights, { id: ++nextFlightId, color, from, to, blind, delay }];
	}
	function drawCard(event: MouseEvent, index?: number) {
		const rect = cardRect(event.currentTarget as Element);
		if (rect) drawOrigin = { rect, blind: index === undefined };
		send(index === undefined ? { type: 'draw-train-deck' } : { type: 'draw-face-up', index });
	}
	$effect(() => {
		const hand = viewer?.hand;
		if (!hand) return;
		untrack(() => {
			if (previousHand) {
				const before = previousHand;
				const origin = drawOrigin;
				const target = paymentTarget;
				const sources = paymentOrigins;
				for (const color of TRAIN_CARDS) {
					const delta = hand[color] - (before[color] ?? 0);
					if (delta > 0 && origin) {
						drawOrigin = undefined;
						void tick().then(() => {
							const destination = cardRect(document.querySelector('[data-hand-color="' + color + '"]'));
							if (destination) launchCard(color, origin.rect, destination, origin.blind);
						});
					} else if (delta < 0 && target && sources.has(color)) {
						for (let i = 0; i < Math.min(3, -delta); i++) launchCard(color, sources.get(color)!, target, false, i * 70);
					}
				}
				if (TRAIN_CARDS.some(color => hand[color] < (before[color] ?? 0))) {
					paymentTarget = undefined;
					paymentOrigins = new Map();
				}
			}
			previousHand = { ...hand };
		});
	});

	function cityName(id: string) {
		return cityById.get(id)?.name ?? id;
	}
	function canDrawFaceUp(card: CardColor) {
		return (
			isViewerTurn &&
			gameState.phase.type === 'turn' &&
			Boolean(gameState.trainDeck.length || gameState.trainDiscard.length) &&
			!(gameState.phase.drawsTaken === 1 && card === 'locomotive')
		);
	}
	function describeTurn() {
		if (gameState.phase.type === 'game-over') return 'Journey complete';
		if (ticketSelection) return 'Choose your tickets';
		if (selectedRoute) return 'Choose your payment';
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
		settingsOpen = false;
		historyOpen = false;
		selectedRouteId = route.id;
		previewTicketId = undefined;
	}
	function toggleTicket(id: TicketId) {
		previewTicketId = id;
		selectedTickets = selectedTickets.includes(id)
			? selectedTickets.filter(ticket => ticket !== id)
			: [...selectedTickets, id];
	}
	function paymentColors(route: Route): TrainColor[] {
		return TRAIN_CARDS.filter(
			(color): color is TrainColor => color !== 'locomotive' && canClaimRoute(gameState, viewerId, route.id, color).ok,
		);
	}
	function paymentLabel(route: Route, color: TrainColor) {
		const cards = Math.min(viewer?.hand[color] ?? 0, route.length);
		const wilds = route.length - cards;
		return `${cards} ${cardLabels[color].toLowerCase()}${wilds ? ` + ${wilds} wild` : ''}`;
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
	function keepTickets() {
		if (!ticketSelection || selectedTickets.length < ticketSelection.minimum) return;
		send({ type: 'keep-tickets', ticketIds: selectedTickets });
	}
	function claim(route: Route, color: TrainColor) {
		const destination = cardRect(document.getElementById('route-' + route.id));
		if (destination)
			paymentTarget = {
				x: destination.x + destination.width / 2 - 16,
				y: destination.y + destination.height / 2 - 22,
				width: 32,
				height: 44,
			};
		paymentOrigins = new Map(
			TRAIN_CARDS.flatMap(card => {
				const rect = cardRect(document.querySelector('[data-hand-color="' + card + '"]'));
				return rect ? [[card, rect] as const] : [];
			}),
		);
		send({ type: 'claim-route', routeId: route.id, paymentColor: color });
		selectedRouteId = undefined;
		void tick().then(() => document.getElementById(`route-${route.id}`)?.focus());
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

	<div class="action-ticket" class:active={isViewerTurn || Boolean(ticketSelection)} role="status" aria-live="polite">
		<span class="action-light" aria-hidden="true"></span>
		<div>
			<strong>{describeTurn()}</strong>
			{#if ticketSelection}<span>Keep at least {ticketSelection.minimum}</span>
			{:else if selectedRoute}<span>{cityName(selectedRoute.cityA)} — {cityName(selectedRoute.cityB)}</span>
			{:else if turnReady}<span>Draw cards · claim a route · take tickets</span>
			{:else if gameState.finalRound}<span>{gameState.finalRound.turnsRemaining} turns remaining</span>{/if}
		</div>
		{#if gameState.phase.type === 'game-over'}<button
				aria-label="View results"
				onclick={() => (resultsDismissed = false)}><ArrowRightIcon size={18} /></button
			>{/if}
	</div>

	<aside class="journey-sidebar" aria-label="Destination tickets">
		{#if completedIds.size > 0}<button
				class="ticket-filter"
				aria-label={ticketFilter === 'all' ? 'Show unfinished tickets' : 'Show all tickets'}
				aria-pressed={ticketFilter === 'unfinished'}
				onclick={() => (ticketFilter = ticketFilter === 'all' ? 'unfinished' : 'all')}
				>{ticketFilter === 'all' ? 'Unfinished' : 'All tickets'}</button
			>{/if}
		<div
			class="ticket-collection"
			class:stacked={visibleTickets.length > 1 && ticketStep < 100}
			style:height={`${136 + Math.max(0, visibleTickets.length - 1) * 118}px`}
			bind:this={ticketCollection}
			style:--ticket-step={`${ticketStep}px`}
			aria-label="Your destination tickets"
			tabindex="0"
		>
			{#each visibleTickets as ticket, index (ticket.id)}
				<button
					class="ticket-button"
					style:--ticket-angle={`${[-2.4, 1.5, -1.2, 2][index % 4]}deg`}
					style:--ticket-layer={index + 1}
					class:previewed={previewTicketId === ticket.id}
					in:fly={{ x: 100, y: -8, duration: reduceMotion ? 0 : 420, delay: reduceMotion ? 0 : index * 25 }}
					aria-label={`${cityName(ticket.cityA)} to ${cityName(ticket.cityB)}, ${ticket.points} points${completedIds.has(ticket.id) ? ', completed' : ''}`}
					aria-pressed={previewTicketId === ticket.id}
					onmouseenter={() => (previewTicketId = ticket.id)}
					onfocus={() => (previewTicketId = ticket.id)}
					onclick={() => (previewTicketId = ticket.id)}
				>
					<DestinationCard {ticket} complete={completedIds.has(ticket.id)} />
				</button>
			{:else}<p class="empty-tickets">
					{heldTickets.length ? 'All connected' : 'No tickets yet'}
				</p>{/each}
		</div>
		<button
			class="draw-tickets"
			disabled={!turnReady || !gameState.destinationDeck.length}
			onclick={() => send({ type: 'draw-destination-tickets' })}
			aria-label={`Draw destination tickets. ${gameState.destinationDeck.length} remain.`}
			><TicketIcon size={25} /><span>Draw tickets</span></button
		>
	</aside>

	<section class="board-stage" aria-label="Game board">
		<GameBoard
			state={gameState}
			{selectedRouteId}
			{highlightedTicket}
			ambientMotion={ambientMotion && !reduceMotion}
			disabled={!turnReady}
			onselect={selectRoute}
		/>
	</section>

	<footer class="play-tray">
		<section class="hand-panel" aria-label="Your train cards">
			<div class="hand-scroll" bind:this={handScroll}>
				<div class="hand-cards" style:--hand-count={handColors.length}>
					{#each handColors as card, index (card)}
						<div
							class="hand-card"
							data-hand-color={card}
							style:margin-left={index ? `${handMargin}px` : 0}
							style:--fan-angle={`${(index - (handColors.length - 1) / 2) * Math.min(6, 26 / Math.max(1, handColors.length - 1))}deg`}
							style:--fan-rise={`${Math.abs(index - (handColors.length - 1) / 2) * 3}px`}
							style:z-index={index + 1}
							tabindex="0"
							role="img"
							aria-label={`${viewer?.hand[card]} ${cardLabels[card]} ${card === 'locomotive' ? 'cards' : 'carriage cards'}`}
							title={`${viewer?.hand[card]} ${cardLabels[card]} cards`}
							in:fly={{ y: 18, duration: motionDuration }}
						>
							<TrainCard color={card} count={viewer?.hand[card]} />
						</div>
					{:else}<span class="empty-hand">No cards</span>{/each}
				</div>
			</div>
		</section>
		<section class="market" aria-label="Train card market">
			<div class="market-row">
				<div class="face-up">
					{#each gameState.faceUpTrainCards as card, index (`${index}-${card}`)}
						<button
							class="market-card"
							disabled={!canDrawFaceUp(card)}
							onclick={event => drawCard(event, index)}
							aria-label={`Draw ${cardLabels[card]} train card`}
							in:fly={{ x: 44, y: -22, duration: reduceMotion ? 0 : 360, delay: reduceMotion ? 0 : 100 }}
							><TrainCard color={card} /></button
						>
					{/each}
				</div>
				<button
					class="blind-deck"
					disabled={!isViewerTurn || (!gameState.trainDeck.length && !gameState.trainDiscard.length)}
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

	{#if ticketSelection}
		<aside
			class="ticket-selection-sheet"
			aria-label="Choose destination tickets"
			transition:fly={{ x: 70, duration: motionDuration }}
		>
			<div class="ticket-offers">
				{#each offeredTickets as ticket}<button
						class:selected={selectedTickets.includes(ticket.id)}
						onmouseenter={() => (previewTicketId = ticket.id)}
						onfocus={() => (previewTicketId = ticket.id)}
						onclick={() => toggleTicket(ticket.id)}
						aria-pressed={selectedTickets.includes(ticket.id)}
						aria-label={`${cityName(ticket.cityA)} to ${cityName(ticket.cityB)}, ${ticket.points} points`}
						><DestinationCard {ticket} />{#if selectedTickets.includes(ticket.id)}<span
								class="selection-label"
								aria-hidden="true">✓</span
							>{/if}</button
					>{/each}
			</div>
			<footer class="dialog-footer">
				<span>{selectedTickets.length} selected</span><button
					class="primary"
					disabled={selectedTickets.length < ticketSelection.minimum}
					onclick={keepTickets}>Keep tickets <ArrowRightIcon size={16} /></button
				>
			</footer>
		</aside>
	{/if}

	<dialog bind:this={dialog} oncancel={cancelDialog} class="decision-dialog" aria-labelledby="decision-title">
		{#if panel}
			<header class="dialog-heading">
				<div>
					<h2 id="decision-title">
						{panel === 'claim' && selectedRoute
							? `${cityName(selectedRoute.cityA)} — ${cityName(selectedRoute.cityB)}`
							: panel === 'results'
								? 'The final standings'
								: 'Settings'}
					</h2>
				</div>
				<button onclick={closePanel} aria-label="Close panel"><XIcon size={22} /></button>
			</header>
			{#if panel === 'claim' && selectedRoute}
				<p class="dialog-description">
					{selectedRoute.length} trains · {selectedRoute.color === 'gray'
						? 'any one color'
						: cardLabels[selectedRoute.color]}. Choose the cards to spend.
				</p>
				<div class="payment-options">
					{#each paymentColors(selectedRoute) as color}<button
							onclick={() => selectedRoute && claim(selectedRoute, color)}
							aria-label={`Claim route using ${paymentLabel(selectedRoute, color)}`}
							><span class="payment-preview"><TrainCard {color} /></span><span
								><strong>{paymentLabel(selectedRoute, color)}</strong></span
							><ArrowRightIcon size={18} /></button
						>{:else}<p class="claim-error">
							You cannot claim this route yet. Check your cards, remaining trains, and parallel route restrictions.
						</p>{/each}
				</div>
				<footer class="dialog-footer">
					<button class="quiet" onclick={closePanel}>Cancel</button>
				</footer>
			{:else if panel === 'settings'}
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
	{#each flights as flight (flight.id)}<CardFlight
			{...flight}
			onfinish={() => (flights = flights.filter(item => item.id !== flight.id))}
		/>{/each}
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
	.action-ticket {
		position: absolute;
		z-index: 15;
		top: 81px;
		right: 42px;
		display: flex;
		align-items: center;
		gap: 12px;
		width: 266px;
		min-height: 58px;
		padding: 10px 18px;
		border: 1px solid #d1c7b3;
		border-radius: 3px;
		background: #e7e3d8;
		color: #7c8276;
		box-shadow:
			0 2px 0 #b8ad97,
			2px 6px 9px #463d2524;
		transform: rotate(1.2deg);
		transition:
			background 220ms,
			color 220ms,
			box-shadow 220ms;
	}
	.action-ticket::after {
		content: '';
		position: absolute;
		inset: 5px;
		border: 1px solid #a28c5b30;
		pointer-events: none;
	}
	.action-ticket.active {
		background: #fff5da;
		color: #344f47;
		box-shadow:
			0 2px 0 #b8a478,
			2px 7px 11px #463d2533;
	}
	.action-light {
		flex-shrink: 0;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #a6aa9e;
		box-shadow: inset 0 1px 2px #0003;
	}
	.active .action-light {
		background: #b68c3c;
		box-shadow:
			inset 0 1px 2px #0003,
			0 0 0 3px #c5a55b20;
	}
	.action-ticket > div {
		display: grid;
		gap: 3px;
	}
	.action-ticket strong {
		font-size: 15px;
		font-weight: 650;
		line-height: 1.2;
	}
	.action-ticket span:not(.action-light) {
		font-size: 11px;
	}
	.action-ticket button {
		border: 0;
		background: none;
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
		padding: 68px 0 18px;
		pointer-events: none;
	}
	.journey-sidebar > * {
		pointer-events: auto;
	}
	.ticket-filter {
		align-self: start;
		margin: -25px 0 7px 25px;
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
		height: 104px;
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
		margin-top: calc(var(--ticket-step) - 104px);
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
	.ticket-button.previewed {
		outline: 2px solid #b97b44;
		outline-offset: 3px;
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
		padding: 24px 12px 36px;
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
		padding: 17px 18px 19px;
		border: 2px solid #ac9465;
		border-radius: 13px;
		background: linear-gradient(110deg, #304943, #1d322f);
		box-shadow:
			inset 0 0 0 3px #514a34,
			inset 0 0 0 4px #c3aa6a80,
			0 3px 0 #725b37,
			0 6px 0 #372f21,
			4px 14px 14px #3c302445;
		transform: rotate(0.65deg);
	}
	.market-row {
		display: flex;
		align-items: center;
		gap: 20px;
	}
	.face-up {
		display: flex;
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
		max-width: 84px;
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
	.choosing-tickets {
		grid-template-columns: minmax(0, 1fr) 330px;
		padding-left: 18px;
		gap: 0 4px;
	}
	.choosing-tickets .action-ticket {
		top: 68px;
	}
	.choosing-tickets .journey-sidebar {
		display: none;
	}
	.choosing-tickets .board-stage {
		grid-column: 1;
		align-self: center;
		height: min(100%, 64vw);
	}
	.choosing-tickets .play-tray {
		grid-column: 1 / -1;
		margin-left: 20px;
		margin-top: -12px;
	}
	.ticket-selection-sheet {
		grid-column: 2;
		grid-row: 2;
		align-self: center;
		z-index: 14;
		margin-left: -13px;
		padding: 18px 14px 16px;
		border: 1px solid #c8b88f;
		border-radius: 5px;
		background: #f3ead5;
		box-shadow:
			inset 0 0 0 5px #faf5e7,
			0 2px 0 #c9b995,
			0 4px 0 #e8d9b7,
			5px 16px 20px #44352340;
		transform: rotate(1.1deg);
	}
	.ticket-selection-sheet .dialog-footer {
		gap: 8px;
		margin-top: 12px;
		padding-top: 10px;
	}
	.ticket-selection-sheet .dialog-footer > span {
		font-size: 10px;
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
	.ticket-offers {
		display: grid;
		gap: 10px;
	}
	.ticket-offers > button {
		position: relative;
		height: 96px;
		padding: 0;
		border: 0;
		border-radius: 7px;
		background: transparent;
		transition: transform 170ms ease;
	}
	.ticket-offers > button:hover {
		transform: translateX(-3px);
	}
	.ticket-offers > button.selected {
		outline: 3px solid #517454;
		outline-offset: 3px;
	}
	.selection-label {
		position: absolute;
		bottom: 13px;
		left: 15px;
		width: 25px;
		height: 25px;
		display: grid;
		place-items: center;
		border-radius: 3px;
		background: #fff9eb;
		font-size: 10px;
		color: #4a674d;
		font-weight: 700;
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
	.dialog-footer > span {
		color: var(--muted);
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
	.payment-options {
		display: grid;
		gap: 8px;
	}
	.payment-options > button {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 9px;
		border: 1px solid #ddd3bf;
		border-radius: 7px;
		background: #fffbf2;
		text-align: left;
		transition: transform 160ms ease;
	}
	.payment-options > button:hover {
		transform: translateX(-3px);
	}
	.payment-preview {
		width: 42px;
		height: 58px;
	}
	.payment-options strong {
		font-size: 13px;
	}
	.payment-options > button > :last-child {
		margin-left: auto;
	}
	.claim-error {
		font-size: 14px;
		line-height: 1.6;
		color: #8d473b;
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
			padding: 19px 20px 21px;
		}
		.market-card {
			max-width: 98px;
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
			padding: 14px 13px 16px;
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
		.choosing-tickets {
			grid-template-columns: minmax(0, 1fr) 300px;
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
		.choosing-tickets .action-ticket {
			top: 104px;
		}
		.action-ticket {
			top: 110px;
			right: 32px;
			width: 250px;
			min-height: 52px;
			padding-block: 8px;
		}
		.journey-sidebar {
			padding-top: 40px;
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
			grid-template-columns: 258px minmax(0, 1fr);
			grid-template-rows: 146px auto minmax(380px, 1fr);
			min-height: 1024px;
			padding: 0 20px 16px;
			gap: 8px 10px;
		}
		.table-header {
			padding: 0;
		}
		.board-stage {
			grid-column: 1 / -1;
			grid-row: 2;
			aspect-ratio: 1000 / 620;
		}
		.journey-sidebar {
			grid-column: 1;
			grid-row: 3;
			width: calc(100% + 8px);
			padding: 0;
			margin-top: -46px;
		}
		.ticket-collection {
			padding-top: 18px;
		}
		.play-tray {
			grid-column: 2;
			grid-row: 3;
			grid-template-columns: minmax(0, 1fr);
			grid-template-rows: 170px auto;
			margin: -40px 0 0;
			gap: 12px;
		}
		.hand-card {
			width: 85px;
			height: 122px;
			margin-left: -27px;
		}
		.market {
			padding: 16px 12px;
		}
		.blind-deck {
			width: 53px;
		}
		.choosing-tickets {
			grid-template-columns: minmax(0, 1fr) 292px;
			grid-template-rows: 146px minmax(440px, 1fr) 280px;
			gap: 8px 2px;
		}
		.choosing-tickets .board-stage {
			grid-column: 1;
			aspect-ratio: auto;
			height: 310px;
		}
		.choosing-tickets .play-tray {
			grid-column: 1 / -1;
			grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
			grid-template-rows: auto;
			margin: 0;
			align-self: center;
		}
		.choosing-tickets .market-row {
			gap: 9px;
		}
		.choosing-tickets .blind-deck {
			width: 48px;
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
