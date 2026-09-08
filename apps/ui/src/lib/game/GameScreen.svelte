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
	import { onMount, tick } from 'svelte';
	import { fly } from 'svelte/transition';
	import Brand from './Brand.svelte';
	import GameBoard from './GameBoard.svelte';
	import TrainCard from './TrainCard.svelte';
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
	const finalResults = $derived(gameState.finalResults ?? []);
	const showResults = $derived(gameState.phase.type === 'game-over' && !resultsDismissed);
	const panel = $derived(
		settingsOpen ? 'settings' : ticketSelection ? 'tickets' : selectedRoute ? 'claim' : showResults ? 'results' : null,
	);
	const recentLog = $derived(gameState.log.slice(-20).toReversed());
	const motionDuration = $derived(reduceMotion ? 0 : 200);

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
		return () => preference.removeEventListener('change', update);
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
		if (ticketSelection) return 'Plan your journey';
		if (gameState.phase.type === 'ticket-selection') return `${currentPlayer?.name ?? 'A player'} is choosing tickets`;
		if (!isViewerTurn) return `${currentPlayer?.name ?? 'A player'} is playing`;
		return gameState.phase.drawsTaken === 1 ? 'One more card' : 'Your turn';
	}
	function selectRoute(route: Route) {
		if (!turnReady) return;
		settingsOpen = false;
		historyOpen = false;
		selectedRouteId = route.id;
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
		send({ type: 'claim-route', routeId: route.id, paymentColor: color });
		selectedRouteId = undefined;
		void tick().then(() => document.getElementById(`route-${route.id}`)?.focus());
	}
</script>

<main class="game-shell" class:reduced-motion={reduceMotion}>
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
						><small
							>{player.tickets.length} tickets · {Object.values(player.hand).reduce((sum, count) => sum + count, 0)} cards</small
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

	<aside class="journey-sidebar">
		<div class="turn-info" role="status" aria-live="polite">
			<span class="eyebrow">{gameState.finalRound ? 'Final round' : `Turn ${gameState.turnNumber}`}</span>
			<h1>{describeTurn()}</h1>
			<p>
				{#if turnReady}Draw cards or<br />claim a route.{:else if isViewerTurn}Choose a carriage card<br />or draw from
					the deck.{:else if ticketSelection}Choose the destinations<br />you want to connect.{:else if gameState.phase.type === 'game-over'}Every
					journey tells a story.{:else}A little patience.<br />Your journey is next.{/if}
			</p>
			{#if gameState.finalRound && gameState.phase.type !== 'game-over'}<strong class="final-round"
					>{gameState.finalRound.turnsRemaining} turns left</strong
				>{/if}
			{#if gameState.phase.type === 'game-over'}<button class="text-button" onclick={() => (resultsDismissed = false)}
					>View results <ArrowRightIcon size={14} /></button
				>{/if}
		</div>
		<div class="ticket-heading">
			<h2>Destination tickets <span>{heldTickets.length}</span></h2>
			<button
				class="ticket-filter"
				aria-pressed={ticketFilter === 'unfinished'}
				onclick={() => (ticketFilter = ticketFilter === 'all' ? 'unfinished' : 'all')}
				>{ticketFilter === 'all' ? 'Show unfinished' : 'Show all'}</button
			>
		</div>
		<div class="ticket-collection" aria-label="Your destination tickets" tabindex="0">
			{#each visibleTickets as ticket (ticket.id)}
				<button
					class="ticket-button"
					class:previewed={previewTicketId === ticket.id}
					aria-label={`${cityName(ticket.cityA)} to ${cityName(ticket.cityB)}, ${ticket.points} points${completedIds.has(ticket.id) ? ', completed' : ''}`}
					aria-pressed={previewTicketId === ticket.id}
					onmouseenter={() => (previewTicketId = ticket.id)}
					onfocus={() => (previewTicketId = ticket.id)}
					onclick={() => (previewTicketId = previewTicketId === ticket.id ? undefined : ticket.id)}
				>
					<DestinationCard {ticket} complete={completedIds.has(ticket.id)} />
				</button>
			{:else}<p class="empty-tickets">
					{heldTickets.length ? 'Every destination connected.' : 'Your next great journey starts with a ticket.'}
				</p>{/each}
		</div>
		<button
			class="draw-tickets"
			disabled={!turnReady || !gameState.destinationDeck.length}
			onclick={() => send({ type: 'draw-destination-tickets' })}
			aria-label={`Draw destination tickets. ${gameState.destinationDeck.length} remain.`}
			><TicketIcon size={25} /><span>Draw tickets<small>{gameState.destinationDeck.length} in the deck</small></span
			></button
		>
		<p class="table-motto">A wider world<br />by train.</p>
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
			<div class="section-title">
				<h2>Your train cards</h2>
				<span>{Object.values(viewer?.hand ?? {}).reduce((a, b) => a + b, 0)} in hand</span>
			</div>
			<div class="hand-scroll">
				<div class="hand-cards" style:--hand-count={handColors.length}>
					{#each handColors as card, index (card)}
						<div
							class="hand-card"
							style:--fan-angle={`${(index - (handColors.length - 1) / 2) * Math.min(4, 20 / Math.max(1, handColors.length - 1))}deg`}
							style:--fan-rise={`${Math.abs(index - (handColors.length - 1) / 2) * 2}px`}
							style:z-index={index + 1}
							tabindex="0"
							role="img"
							aria-label={`${viewer?.hand[card]} ${cardLabels[card]} ${card === 'locomotive' ? 'cards' : 'carriage cards'}`}
							title={`${viewer?.hand[card]} ${cardLabels[card]} cards`}
							in:fly={{ y: 18, duration: motionDuration }}
						>
							<TrainCard color={card} count={viewer?.hand[card]} />
						</div>
					{:else}<span class="empty-hand">Collect cards to build your railway.</span>{/each}
				</div>
			</div>
		</section>
		<section class="market" aria-label="Train card market">
			<div class="section-title">
				<h2>Face-up train cards</h2>
				<span>Wild takes both draws</span>
			</div>
			<div class="market-row">
				<div class="face-up">
					{#each gameState.faceUpTrainCards as card, index (`${index}-${card}`)}
						<button
							class="market-card"
							disabled={!canDrawFaceUp(card)}
							onclick={() => send({ type: 'draw-face-up', index })}
							aria-label={`Draw ${cardLabels[card]} train card`}
							in:fly={{ y: 8, duration: motionDuration }}><TrainCard color={card} /></button
						>
					{/each}
				</div>
				<button
					class="blind-deck"
					disabled={!isViewerTurn || (!gameState.trainDeck.length && !gameState.trainDiscard.length)}
					onclick={() => send({ type: 'draw-train-deck' })}
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
				{#each recentLog as entry}<p>{entry}</p>{:else}<p>Your story is just beginning.</p>{/each}
			</div>
		</aside>{/if}

	<dialog bind:this={dialog} oncancel={cancelDialog} class="decision-dialog" aria-labelledby="decision-title">
		{#if panel}
			<header class="dialog-heading">
				<div>
					<span class="eyebrow"
						>{panel === 'tickets'
							? 'Plan your journey'
							: panel === 'claim'
								? 'Lay your railway'
								: panel === 'results'
									? 'Journey complete'
									: 'At your own pace'}</span
					>
					<h2 id="decision-title">
						{panel === 'tickets'
							? 'Choose your destinations'
							: panel === 'claim' && selectedRoute
								? `${cityName(selectedRoute.cityA)} — ${cityName(selectedRoute.cityB)}`
								: panel === 'results'
									? 'The final standings'
									: 'Settings'}
					</h2>
				</div>
				{#if panel !== 'tickets'}<button onclick={closePanel} aria-label="Close panel"><XIcon size={22} /></button>{/if}
			</header>
			{#if panel === 'tickets' && ticketSelection}
				<p class="dialog-description">
					Keep at least {ticketSelection.minimum}. Each ticket earns its points when connected, or loses them if
					unfinished.
				</p>
				<div class="ticket-offers">
					{#each offeredTickets as ticket}<button
							class:selected={selectedTickets.includes(ticket.id)}
							onmouseenter={() => (previewTicketId = ticket.id)}
							onfocus={() => (previewTicketId = ticket.id)}
							onclick={() => toggleTicket(ticket.id)}
							aria-pressed={selectedTickets.includes(ticket.id)}
							aria-label={`${cityName(ticket.cityA)} to ${cityName(ticket.cityB)}, ${ticket.points} points`}
							><DestinationCard {ticket} /><span class="selection-label"
								>{selectedTickets.includes(ticket.id) ? 'Selected' : 'Keep this ticket'}</span
							></button
						>{/each}
				</div>
				<footer class="dialog-footer">
					<span>{selectedTickets.length} selected · {ticketSelection.minimum} required</span><button
						class="primary"
						disabled={selectedTickets.length < ticketSelection.minimum}
						onclick={keepTickets}>Keep tickets <ArrowRightIcon size={16} /></button
					>
				</footer>
			{:else if panel === 'claim' && selectedRoute}
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
								><strong>{paymentLabel(selectedRoute, color)}</strong><small>Spend these cards</small></span
							><ArrowRightIcon size={18} /></button
						>{:else}<p class="claim-error">
							You cannot claim this route yet. Check your cards, remaining trains, and parallel route restrictions.
						</p>{/each}
				</div>
				<footer class="dialog-footer">
					<span>The route is highlighted on the atlas.</span><button class="quiet" onclick={closePanel}>Cancel</button>
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
		--ink: #182e3e;
		--muted: #6d736f;
		--paper: #f8f5ed;
		--rule: #dcd5c6;
		--accent: #bd4b3f;
		position: relative;
		isolation: isolate;
		display: grid;
		grid-template-columns: 198px minmax(0, 1fr);
		grid-template-rows: 78px minmax(280px, 1fr) 180px;
		gap: 0 16px;
		width: 100%;
		height: 100svh;
		min-height: 640px;
		padding: 0 22px 8px 0;
		background: var(--paper);
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
	h1,
	h2,
	p {
		margin: 0;
	}
	h2 {
		font-family: 'Barlow Condensed', sans-serif;
		font-size: 16px;
		letter-spacing: -0.025em;
	}
	.table-header {
		grid-column: 1 / -1;
		display: flex;
		align-items: center;
		gap: 18px;
		padding: 0 0 0 13px;
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
		font-size: 16px;
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
	.player-info small {
		font-size: 9px;
		color: var(--muted);
		white-space: nowrap;
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
		background: transparent;
		transition:
			transform 160ms ease,
			background 160ms ease;
	}
	.game-controls button:hover,
	.dialog-heading > button:hover {
		transform: translateY(-2px);
		background: #eee8dc;
	}
	.journey-sidebar {
		grid-column: 1;
		grid-row: 2 / 4;
		display: flex;
		flex-direction: column;
		min-height: 0;
		padding: 23px 8px 12px 23px;
	}
	.turn-info {
		padding-bottom: 18px;
		margin-bottom: 16px;
		border-bottom: 1px solid var(--rule);
	}
	.eyebrow {
		display: block;
		margin-bottom: 7px;
		font-size: 9px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: #8a785b;
	}
	h1 {
		font-family: 'Barlow Condensed', sans-serif;
		margin-bottom: 12px;
		font-size: clamp(23px, 2.5vw, 35px);
		font-weight: 800;
		line-height: 1.04;
		letter-spacing: -0.055em;
	}
	.turn-info p {
		color: #646c73;
		font-size: 15px;
		line-height: 1.45;
	}
	.final-round {
		display: block;
		padding-top: 8px;
		color: var(--accent);
		font-size: 12px;
	}
	.ticket-heading {
		margin-bottom: 12px;
	}
	.ticket-heading h2 span {
		color: #9a9385;
		margin-left: 3px;
		font-size: 11px;
	}
	.ticket-filter {
		margin-top: 5px;
		padding: 0;
		border: 0;
		background: none;
		font-size: 10px;
		color: #827359;
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.ticket-collection {
		min-height: 0;
		flex: 0 1 auto;
		display: flex;
		flex-direction: column;
		gap: 13px;
		padding: 4px 5px 9px;
		margin: 0 -5px 10px;
		overflow: auto;
		scrollbar-width: thin;
		scrollbar-color: #baaf99 transparent;
	}
	.ticket-button {
		flex-shrink: 0;
		min-height: 116px;
		width: 100%;
		padding: 0;
		border: 0;
		background: transparent;
		border-radius: 7px;
		transition: transform 160ms ease;
	}
	.ticket-button:hover {
		transform: translateY(-3px) rotate(-1deg);
	}
	.ticket-button.previewed {
		outline: 2px solid #b8a979;
		outline-offset: 3px;
	}
	.empty-tickets,
	.empty-hand {
		color: var(--muted);
		font-size: 12px;
		line-height: 1.5;
	}
	.draw-tickets {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 11px;
		padding: 14px 9px;
		margin-top: 5px;
		border: 1px solid var(--rule);
		border-radius: 5px;
		background: #fffcf5;
		box-shadow: 0 4px 8px #5442260d;
		text-align: left;
		transition:
			transform 170ms ease,
			box-shadow 170ms ease;
	}
	.draw-tickets:hover:not(:disabled) {
		transform: translateY(-3px);
		box-shadow: 0 7px 11px #5442261a;
	}
	.draw-tickets > span {
		font-size: 13px;
		font-weight: 700;
	}
	.draw-tickets small {
		display: block;
		margin-top: 3px;
		font-size: 9px;
		font-weight: 400;
		color: var(--muted);
	}
	.draw-tickets:disabled {
		opacity: 0.5;
	}
	.table-motto {
		margin: 12px 0 0;
		color: #a6a197;
		font:
			italic 12px/1.6 Georgia,
			serif;
	}
	.board-stage {
		grid-column: 2;
		grid-row: 2;
		position: relative;
		min-width: 0;
		min-height: 0;
		overflow: hidden;
		border: 1px solid #91a8a0;
		border-radius: 12px;
		box-shadow:
			0 5px 5px #332c2026,
			0 14px 22px #44341c10;
		background: #82b8bd;
	}
	.play-tray {
		grid-column: 2;
		grid-row: 3;
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 22px;
		min-width: 0;
		padding-top: 15px;
	}
	.hand-panel,
	.market {
		min-width: 0;
	}
	.market {
		padding-left: 22px;
		border-left: 1px solid var(--rule);
	}
	.section-title {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 6px;
	}
	.section-title > span {
		font-size: 10px;
		color: #8a887e;
		white-space: nowrap;
	}
	.hand-scroll {
		overflow-x: auto;
		overflow-y: hidden;
		padding: 12px 9px 8px;
		margin: 0 -9px;
		scrollbar-width: thin;
	}
	.hand-cards {
		display: flex;
		align-items: flex-start;
		justify-content: flex-start;
		width: max-content;
		min-width: 100%;
		padding-top: 9px;
		padding-inline: 4px;
	}
	.hand-card {
		position: relative;
		width: 78px;
		height: 112px;
		flex-shrink: 0;
		margin-left: -15px;
		transform: translateY(var(--fan-rise)) rotate(var(--fan-angle));
		transform-origin: bottom center;
		transition: transform 190ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.hand-card:first-child {
		margin-left: 0;
	}
	.hand-card:hover,
	.hand-card:focus-visible {
		transform: translateY(-10px) rotate(0) scale(1.05);
		z-index: 20 !important;
	}
	.market-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 14px;
		padding: 12px 1px 6px;
	}
	.face-up {
		display: flex;
		flex: 1;
		min-width: 0;
		gap: 7px;
	}
	.market-card,
	.blind-deck {
		position: relative;
		display: block;
		padding: 0;
		border: 0;
		border-radius: 8px;
		background: none;
		aspect-ratio: 0.7;
		transition:
			transform 170ms ease,
			opacity 170ms ease;
	}
	.market-card {
		flex: 1;
		min-width: 0;
		max-width: 72px;
	}
	.market-card:hover:not(:disabled),
	.blind-deck:hover:not(:disabled) {
		transform: translateY(-7px) rotate(1deg);
	}
	.market-card:disabled {
		opacity: 0.52;
	}
	.blind-deck {
		width: 68px;
		flex-shrink: 0;
		box-shadow:
			3px -3px #e9e4d7,
			4px -4px #7b806e,
			6px -6px #e9e4d7,
			7px -7px #7b806e;
	}
	.blind-deck:disabled {
		opacity: 0.6;
	}
	.deck-count {
		position: absolute;
		right: -5px;
		bottom: -6px;
		display: grid;
		place-items: center;
		min-width: 23px;
		height: 23px;
		padding: 2px 5px;
		border-radius: 50%;
		background: #fdf6e4;
		color: #29455b;
		border: 1px solid #a8a190;
		font-size: 11px;
		font-weight: 700;
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
		width: 410px;
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
		font-size: 28px;
		line-height: 1.1;
		letter-spacing: -0.05em;
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
		gap: 13px;
	}
	.ticket-offers > button {
		position: relative;
		height: 137px;
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
		padding: 4px 7px;
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
	.payment-options small {
		display: block;
		margin-top: 4px;
		color: var(--muted);
		font-size: 11px;
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
	.text-button {
		display: flex;
		align-items: center;
		gap: 5px;
		margin-top: 8px;
		border: 0;
		background: none;
		padding: 0;
		color: #386a7a;
		font-size: 11px;
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
		.game-shell {
			grid-template-rows: 78px minmax(280px, 1fr) 220px;
		}
		h2 {
			font-size: 18px;
		}
		.hand-card {
			width: 106px;
			height: 150px;
			margin-left: -24px;
		}
		.market-card {
			max-width: 102px;
		}
		.blind-deck {
			width: 94px;
		}
	}
	@media (min-width: 1650px) {
		.game-shell {
			grid-template-columns: 220px minmax(0, 1fr);
			grid-template-rows: 86px minmax(0, 1fr) 220px;
			gap: 0 22px;
			padding-right: 28px;
		}
		.play-tray {
			gap: 35px;
		}
	}
	@media (max-width: 1250px) {
		.map-edition {
			display: none;
		}
		.player img {
			width: 31px;
			height: 31px;
		}
		.players {
			gap: 12px;
		}
		.game-shell {
			grid-template-columns: 175px minmax(0, 1fr);
			gap: 0 12px;
			padding-right: 14px;
		}
		.journey-sidebar {
			padding-left: 16px;
		}
		.hand-card {
			width: 69px;
			height: 104px;
			margin-left: -20px;
		}
		.section-title > span {
			display: none;
		}
		.market {
			padding-left: 13px;
		}
		.play-tray {
			gap: 13px;
		}
		.face-up {
			gap: 5px;
		}
		.blind-deck {
			width: 55px;
		}
		.market-row {
			gap: 10px;
		}
	}
	@media (max-width: 1000px) {
		.table-header {
			display: grid;
			grid-template-columns: 1fr auto;
			grid-template-rows: 51px 50px;
			gap: 0 12px;
		}
		.players {
			grid-row: 2;
			grid-column: 1 / -1;
			justify-content: space-around;
		}
		.game-controls {
			grid-column: 2;
			grid-row: 1;
		}
		.game-shell {
			grid-template-rows: 112px minmax(280px, 1fr) 155px;
		}
		.player-info small {
			display: none;
		}
		.player-info > span {
			font-size: 10px;
		}
		.journey-sidebar {
			padding-top: 17px;
		}
		.turn-info {
			padding-bottom: 15px;
			margin-bottom: 15px;
		}
		.turn-info p {
			font-size: 13px;
		}
		.table-motto {
			display: none;
		}
		.hand-card {
			width: 65px;
			height: 95px;
			margin-left: -25px;
		}
		.blind-deck {
			width: 45px;
		}
	}
	@media (max-width: 900px) {
		.game-shell {
			height: auto;
			min-height: 100svh;
			grid-template-columns: minmax(0, 1fr);
			grid-template-rows: auto auto 410px auto;
			padding: 0 12px 20px;
			gap: 12px;
		}
		.table-header {
			grid-column: 1;
			grid-row: 1;
			padding: 0;
			grid-template-rows: 50px 56px;
		}
		.players {
			overflow-x: auto;
			justify-content: flex-start;
			gap: 14px;
			padding-bottom: 3px;
		}
		.player {
			flex-shrink: 0;
		}
		.player img {
			width: 28px;
			height: 28px;
		}
		.player-info > strong {
			max-width: 85px;
			font-size: 11px;
		}
		.player-info > span {
			font-size: 9px;
		}
		.game-controls button {
			width: 31px;
			height: 31px;
		}
		.journey-sidebar {
			grid-column: 1;
			grid-row: 2;
			padding: 0;
			display: grid;
			grid-template-columns: 1fr auto;
			gap: 7px 10px;
		}
		.turn-info {
			grid-column: 1;
			margin: 0;
			border: 0;
			padding: 0;
		}
		.eyebrow {
			font-size: 8px;
			margin-bottom: 4px;
		}
		h1 {
			font-size: 24px;
			margin-bottom: 4px;
		}
		.turn-info p {
			font-size: 11px;
		}
		.turn-info br {
			display: none;
		}
		.ticket-heading {
			grid-column: 1;
			grid-row: 2;
			margin: 3px 0 0;
			display: flex;
			align-items: baseline;
			gap: 10px;
		}
		.ticket-heading h2 {
			font-size: 12px;
		}
		.ticket-filter {
			font-size: 9px;
		}
		.ticket-collection {
			grid-column: 1 / -1;
			grid-row: 3;
			flex-direction: row;
			max-height: 108px;
			padding: 4px 3px 7px;
			margin: 0;
			gap: 10px;
		}
		.ticket-button {
			width: 159px;
			min-height: 90px;
		}
		.ticket-button :global(.destination-card) {
			min-height: 90px;
		}
		.draw-tickets {
			grid-column: 2;
			grid-row: 1 / 3;
			padding: 9px;
			gap: 5px;
			margin: 0;
			align-self: center;
		}
		.draw-tickets > span {
			font-size: 11px;
		}
		.board-stage {
			grid-column: 1;
			grid-row: 3;
			border-radius: 9px;
		}
		.play-tray {
			grid-column: 1;
			grid-row: 4;
			grid-template-columns: 1fr;
			gap: 9px;
			padding-top: 0;
		}
		.hand-panel {
			min-height: 142px;
		}
		.hand-card {
			width: 75px;
			height: 111px;
			margin-left: -23px;
		}
		.hand-scroll {
			padding-top: 6px;
			padding-bottom: 12px;
		}
		.section-title {
			padding-top: 3px;
		}
		.section-title > span {
			display: block;
			font-size: 9px;
		}
		.market {
			padding: 11px 0 0;
			border-left: 0;
			border-top: 1px solid var(--rule);
		}
		.market-row {
			gap: 16px;
			padding-top: 13px;
		}
		.market-card {
			max-width: 65px;
		}
		.blind-deck {
			width: 56px;
		}
		.decision-dialog {
			margin: auto;
			padding: 21px;
		}
		.dialog-heading h2 {
			font-size: 25px;
		}
		.history-popover {
			top: 104px;
			right: 12px;
			max-height: 65svh;
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
