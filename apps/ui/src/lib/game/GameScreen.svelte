<script lang="ts">
	import type {
		DestinationTicket,
		FinalPlayerResult,
		GameAction,
		GameState,
		Player,
		Route,
		RouteId,
		TicketId,
		TrainCard,
		TrainColor,
	} from '@repo/shared';
	import { isTicketComplete, USA_CITIES, USA_ROUTES, USA_TICKETS } from '@repo/shared';
	import ClockCounterClockwiseIcon from 'phosphor-svelte/lib/ClockCounterClockwiseIcon';
	import GaugeIcon from 'phosphor-svelte/lib/GaugeIcon';
	import GearSixIcon from 'phosphor-svelte/lib/GearSixIcon';
	import MusicNotesIcon from 'phosphor-svelte/lib/MusicNotesIcon';
	import SpeakerHighIcon from 'phosphor-svelte/lib/SpeakerHighIcon';
	import TrainIcon from 'phosphor-svelte/lib/TrainIcon';
	import XIcon from 'phosphor-svelte/lib/XIcon';
	import { tick } from 'svelte';
	import { playerPortraitAssets, ticketBackAsset, ticketFaceAsset, trainBackAsset, trainCardAssets } from './assets';
	import GameBoard from './GameBoard.svelte';

	type Props = {
		state: GameState;
		viewerId: string;
		send: (action: GameAction) => void;
		onrestart?: () => void;
		ongamespeedchange?: (speed: number) => void;
		debug?: boolean;
	};

	let { state: gameState, viewerId, send, onrestart, ongamespeedchange, debug = false }: Props = $props();

	const cardOrder: readonly TrainCard[] = [
		'red',
		'orange',
		'yellow',
		'green',
		'blue',
		'purple',
		'black',
		'white',
		'locomotive',
	];
	const paymentColors = cardOrder.filter((color): color is TrainColor => color !== 'locomotive');
	const cardLabels: Record<TrainCard, string> = {
		red: 'Red',
		orange: 'Orange',
		yellow: 'Yellow',
		green: 'Green',
		blue: 'Blue',
		purple: 'Purple',
		black: 'Black',
		white: 'Ivory',
		locomotive: 'Wild',
	};
	const ticketById = new Map(USA_TICKETS.map(ticket => [ticket.id, ticket]));
	const cityById = new Map(USA_CITIES.map(city => [city.id, city]));
	const routeById = new Map(USA_ROUTES.map(route => [route.id, route]));
	const speedLabels = ['Relaxed', 'Normal', 'Fast'];

	let selectedTickets = $state<TicketId[]>([]);
	let selectedRouteId = $state<RouteId | undefined>();
	let previewTicketId = $state<TicketId | undefined>();
	let activeOfferKey = $state('');
	let ticketDialog = $state<HTMLElement | undefined>();
	let settingsDialog = $state<HTMLElement | undefined>();
	let claimDialog = $state<HTMLElement | undefined>();
	let resultsDialog = $state<HTMLElement | undefined>();
	let settingsButton = $state<HTMLButtonElement | undefined>();
	let historyButton = $state<HTMLButtonElement | undefined>();
	let settingsOpen = $state(false);
	let historyOpen = $state(false);
	let soundEffects = $state(82);
	let music = $state(58);
	let simplifiedMap = $state(false);
	let showPlayerInfo = $state(true);
	let gameSpeed = $state(1);

	const currentPlayer = $derived(gameState.players[gameState.currentPlayerIndex]);
	const viewer = $derived(gameState.players.find(player => player.id === viewerId));
	const opponents = $derived(gameState.players.filter(player => player.id !== viewerId));
	const isViewerTurn = $derived(gameState.phase.type === 'turn' && currentPlayer?.id === viewerId);
	const selectedRoute = $derived(selectedRouteId ? routeById.get(selectedRouteId) : undefined);
	const recentLog = $derived(gameState.log.slice(-6).toReversed());
	const ticketSelection = $derived(
		gameState.phase.type === 'ticket-selection' && gameState.phase.playerId === viewerId ? gameState.phase : undefined,
	);
	const offeredTickets = $derived(ticketSelection?.ticketIds.map(id => ticketById.get(id)).filter(isTicket) ?? []);
	const highlightedTicket = $derived(
		(previewTicketId ? ticketById.get(previewTicketId) : undefined) ?? offeredTickets[0],
	);
	const finalRoundPlayer = $derived(
		gameState.finalRound
			? gameState.players.find(player => player.id === gameState.finalRound?.triggeredBy)
			: undefined,
	);
	const finalResults = $derived(gameState.finalResults ?? []);
	const viewerWon = $derived(gameState.phase.type === 'game-over' && gameState.phase.winnerIds.includes(viewerId));
	const drawerOpen = $derived(Boolean(settingsOpen || ticketSelection || selectedRoute || finalResults.length));

	$effect(() => {
		const offer = ticketSelection?.ticketIds.join('|') ?? '';
		if (offer !== activeOfferKey) {
			activeOfferKey = offer;
			selectedTickets = [];
			previewTicketId = ticketSelection?.ticketIds[0];
			if (offer) void tick().then(() => ticketDialog?.focus());
		}
	});

	$effect(() => {
		if (
			selectedRouteId &&
			(!isViewerTurn ||
				gameState.phase.type !== 'turn' ||
				gameState.phase.drawsTaken > 0 ||
				gameState.claimedRoutes[selectedRouteId])
		) {
			selectedRouteId = undefined;
		}
	});

	$effect(() => {
		const dialog = settingsOpen
			? settingsDialog
			: selectedRoute
				? claimDialog
				: finalResults.length
					? resultsDialog
					: undefined;
		if (dialog) void tick().then(() => dialog.focus());
	});

	function isTicket(ticket: DestinationTicket | undefined): ticket is DestinationTicket {
		return Boolean(ticket);
	}

	function playerColor(player: Player): string {
		return `var(--player-${player.color})`;
	}

	function trainCardCount(player: Player): number {
		return Object.values(player.hand).reduce((sum, count) => sum + count, 0);
	}

	function cityName(id: DestinationTicket['cityA']): string {
		return cityById.get(id)?.name ?? id;
	}

	function toggleTicket(id: TicketId) {
		previewTicketId = id;
		selectedTickets = selectedTickets.includes(id)
			? selectedTickets.filter(ticketId => ticketId !== id)
			: [...selectedTickets, id];
	}

	function keepTickets() {
		if (!ticketSelection || selectedTickets.length < ticketSelection.minimum) return;
		send({ type: 'keep-tickets', ticketIds: selectedTickets });
	}

	function resultPlayer(result: FinalPlayerResult): Player | undefined {
		return gameState.players.find(player => player.id === result.playerId);
	}

	function completedTickets(result: FinalPlayerResult): DestinationTicket[] {
		const player = resultPlayer(result);
		return (
			player?.tickets
				.filter(id => isTicketComplete(gameState, result.playerId, id))
				.map(id => ticketById.get(id))
				.filter(isTicket) ?? []
		);
	}

	function failedTickets(result: FinalPlayerResult): DestinationTicket[] {
		const player = resultPlayer(result);
		return (
			player?.tickets
				.filter(id => !isTicketComplete(gameState, result.playerId, id))
				.map(id => ticketById.get(id))
				.filter(isTicket) ?? []
		);
	}

	function winnerHeading(): string {
		if (gameState.phase.type !== 'game-over') return '';
		if (viewerWon) return gameState.phase.winnerIds.length > 1 ? 'A shared victory!' : 'The rails are yours!';
		const winnerNames = gameState.phase.winnerIds
			.map(id => gameState.players.find(player => player.id === id)?.name)
			.filter(Boolean);
		return `${winnerNames.join(' & ') || 'The winner'} ${winnerNames.length > 1 ? 'win' : 'wins'}!`;
	}

	function selectRoute(route: Route) {
		if (!isViewerTurn || gameState.phase.type !== 'turn' || gameState.phase.drawsTaken > 0) return;
		settingsOpen = false;
		historyOpen = false;
		selectedRouteId = selectedRouteId === route.id ? undefined : route.id;
	}

	function availablePaymentColors(route: Route): TrainColor[] {
		if (!viewer) return [];
		const colors = route.color === 'gray' ? paymentColors : [route.color];
		return colors.filter(color => viewer.hand[color] + viewer.hand.locomotive >= route.length);
	}

	function claimRoute(route: Route, paymentColor: TrainColor) {
		send({ type: 'claim-route', routeId: route.id, paymentColor });
		selectedRouteId = undefined;
	}

	function closeRouteSelection() {
		const routeId = selectedRouteId;
		selectedRouteId = undefined;
		if (routeId) void tick().then(() => document.getElementById(`route-${routeId}`)?.focus());
	}

	function canDrawCard(card: TrainCard): boolean {
		if (!isViewerTurn || gameState.phase.type !== 'turn') return false;
		if (gameState.trainDeck.length === 0 && gameState.trainDiscard.length === 0) return false;
		return !(gameState.phase.drawsTaken === 1 && card === 'locomotive');
	}

	function describeTurn(): string {
		const phase = gameState.phase;
		if (phase.type === 'game-over') return 'Journey complete';
		if (phase.type === 'ticket-selection') {
			const selector = gameState.players.find(player => player.id === phase.playerId);
			return selector?.id === viewerId
				? 'Choose your destinations'
				: `${selector?.name ?? 'Opponent'} is choosing tickets`;
		}
		if (currentPlayer?.id !== viewerId) return `${currentPlayer?.name ?? 'Opponent'} is playing`;
		if (phase.drawsTaken === 1) return 'Draw one more train card';
		return "It's your turn!";
	}

	function ticketFor(id: TicketId): DestinationTicket | undefined {
		return ticketById.get(id);
	}

	function showSettings() {
		settingsOpen = true;
		historyOpen = false;
		selectedRouteId = undefined;
	}

	function closeSettings() {
		settingsOpen = false;
		void tick().then(() => settingsButton?.focus());
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape') return;
		if (settingsOpen) {
			event.preventDefault();
			closeSettings();
		} else if (historyOpen) {
			event.preventDefault();
			historyOpen = false;
			void tick().then(() => historyButton?.focus());
		} else if (selectedRouteId) {
			event.preventDefault();
			closeRouteSelection();
		}
	}

	function adjustSpeed(direction: number) {
		const nextSpeed = Math.max(0, Math.min(speedLabels.length - 1, gameSpeed + direction));
		gameSpeed = nextSpeed;
		ongamespeedchange?.(nextSpeed);
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<main
	class:drawer-open={drawerOpen}
	class:debug-mode={debug}
	class:simplified-map={simplifiedMap}
	class:hide-player-info={!showPlayerInfo}
	class="game-shell"
>
	<section class="board-stage" aria-label="Game board">
		<GameBoard
			state={gameState}
			{selectedRouteId}
			{highlightedTicket}
			disabled={!isViewerTurn || gameState.phase.type !== 'turn' || gameState.phase.drawsTaken > 0}
			onselect={selectRoute}
		/>
	</section>

	<nav class="game-controls" aria-label="Game controls">
		<button
			bind:this={settingsButton}
			type="button"
			class:active={settingsOpen}
			onclick={showSettings}
			aria-label="Open settings"
		>
			<GearSixIcon size={31} weight="fill" />
		</button>
		<button
			bind:this={historyButton}
			type="button"
			class:active={historyOpen}
			onclick={() => {
				historyOpen = !historyOpen;
				settingsOpen = false;
			}}
			aria-label="Show turn history"
		>
			<ClockCounterClockwiseIcon size={30} weight="fill" />
		</button>
	</nav>

	{#if historyOpen}
		<aside class="history-popover" aria-label="Recent turns">
			<header>
				<strong>Railway journal</strong><button
					type="button"
					onclick={() => (historyOpen = false)}
					aria-label="Close history"><XIcon size={18} /></button
				>
			</header>
			{#each recentLog as entry}<p>{entry}</p>{:else}<p>No journeys recorded yet.</p>{/each}
		</aside>
	{/if}

	<aside class="opponents" aria-label="Opponents">
		{#each opponents as player (player.id)}
			{@const index = gameState.players.findIndex(candidate => candidate.id === player.id)}
			<article
				class:active={index === gameState.currentPlayerIndex}
				class="opponent"
				style:--player-color={playerColor(player)}
				aria-label={`${player.name}: ${player.score} points, ${player.trains} trains, ${trainCardCount(player)} train cards, ${player.tickets.length} destination tickets`}
			>
				<img src={playerPortraitAssets[player.color]} alt="" />
				<div class="opponent-counts">
					<span><strong>{player.tickets.length}</strong><small>tickets</small></span>
					<span><strong>{trainCardCount(player)}</strong><small>cards</small></span>
				</div>
				<strong class="opponent-score">{player.score}</strong>
				<div class="opponent-trains"><TrainIcon size={17} weight="fill" /><strong>{player.trains}</strong></div>
				<footer>{player.name}</footer>
			</article>
		{/each}
	</aside>

	{#if viewer}
		<aside class="viewer-hud" style:--player-color={playerColor(viewer)} aria-label="Your player information">
			<img class="viewer-portrait" src={playerPortraitAssets[viewer.color]} alt="" />
			<div class="viewer-ticket-stack">
				{#each viewer.tickets.slice(0, 3) as ticketId, index (ticketId)}
					{@const ticket = ticketFor(ticketId)}
					{#if ticket}
						<article class="mini-ticket" style:--ticket-index={index}>
							<strong>{ticket.points}</strong><span>{cityName(ticket.cityA)} · {cityName(ticket.cityB)}</span>
						</article>
					{/if}
				{/each}
			</div>
			<div class="viewer-score"><strong>{viewer.score}</strong><small>points</small></div>
			<div class="viewer-trains"><TrainIcon size={27} weight="fill" /><strong>{viewer.trains}</strong></div>
			<footer><span>You</span><strong>{viewer.name}</strong></footer>
		</aside>
	{/if}

	<aside class="market" aria-label="Train card market">
		<button
			type="button"
			class="destination-deck"
			disabled={!isViewerTurn ||
				gameState.phase.type !== 'turn' ||
				gameState.phase.drawsTaken > 0 ||
				gameState.destinationDeck.length === 0}
			onclick={() => send({ type: 'draw-destination-tickets' })}
			aria-label={`Draw destination tickets. ${gameState.destinationDeck.length} remain.`}
		>
			<img src={ticketBackAsset} alt="" /><small>{gameState.destinationDeck.length}</small>
		</button>
		<div class="face-up">
			{#each gameState.faceUpTrainCards as card, index (`${index}-${card}`)}
				<button
					type="button"
					class="train-card"
					disabled={!canDrawCard(card)}
					onclick={() => send({ type: 'draw-face-up', index })}
					aria-label={`Draw ${cardLabels[card]} train card`}
				>
					<img src={trainCardAssets[card]} alt="" />
					<span class={`card-gem ${card}`} aria-hidden="true"></span>
				</button>
			{/each}
		</div>
		<button
			type="button"
			class="deck"
			disabled={!isViewerTurn ||
				gameState.phase.type !== 'turn' ||
				(gameState.trainDeck.length === 0 && gameState.trainDiscard.length === 0)}
			onclick={() => send({ type: 'draw-train-deck' })}
			aria-label={`Draw a blind train card. ${gameState.trainDeck.length} remain.`}
		>
			<img src={trainBackAsset} alt="" /><small>{gameState.trainDeck.length}</small>
		</button>
	</aside>

	<footer class="hand-panel" aria-label="Your train cards">
		<div class="hand-cards">
			{#each cardOrder as card, index (`${card}-${viewer?.hand[card] ?? 0}`)}
				{#if viewer?.hand[card]}
					<article class="hand-card" style:--card-index={index}>
						<img src={trainCardAssets[card]} alt="" />
						<strong class="card-count">{viewer.hand[card]}</strong>
					</article>
				{/if}
			{/each}
		</div>
	</footer>

	<div class:your-turn={isViewerTurn} class="turn-banner" role="status" aria-live="polite">
		<strong>{describeTurn()}</strong>
		{#if gameState.finalRound && gameState.phase.type !== 'game-over'}
			<span>Final round · {gameState.finalRound.turnsRemaining} turns remain</span>
		{:else}<span>{currentPlayer?.name ?? 'Waiting for players'} · turn {gameState.turnNumber}</span>{/if}
	</div>

	{#if settingsOpen}
		<aside
			bind:this={settingsDialog}
			class="decision-drawer settings-drawer"
			role="dialog"
			aria-labelledby="settings-title"
			tabindex="-1"
		>
			<header class="drawer-heading settings-heading">
				<div>
					<p class="section-label">Conductor's cabinet</p>
					<h1 id="settings-title">Settings</h1>
				</div>
				<button type="button" class="close-drawer" onclick={closeSettings} aria-label="Close settings"
					><XIcon size={28} weight="bold" /></button
				>
			</header>
			<div class="settings-list">
				<label class="setting-row"
					><span><SpeakerHighIcon size={21} />Sound effects</span><input
						aria-label="Sound effects volume"
						type="range"
						min="0"
						max="100"
						bind:value={soundEffects}
					/></label
				>
				<label class="setting-row"
					><span><MusicNotesIcon size={21} />Music</span><input
						aria-label="Music volume"
						type="range"
						min="0"
						max="100"
						bind:value={music}
					/></label
				>
				<div class="setting-row">
					<span><GaugeIcon size={21} />Game speed</span>
					<div class="stepper">
						<button type="button" onclick={() => adjustSpeed(-1)} aria-label="Slower game speed">‹</button><strong
							>{speedLabels[gameSpeed]}</strong
						><button type="button" onclick={() => adjustSpeed(1)} aria-label="Faster game speed">›</button>
					</div>
				</div>
				<div class="setting-row">
					<span>Simplified map</span><button
						type="button"
						class:enabled={simplifiedMap}
						class="toggle"
						role="switch"
						aria-label="Use simplified map"
						aria-checked={simplifiedMap}
						onclick={() => (simplifiedMap = !simplifiedMap)}><i></i></button
					>
				</div>
				<div class="setting-row">
					<span>Player information</span><button
						type="button"
						class:enabled={showPlayerInfo}
						class="toggle"
						role="switch"
						aria-label="Show player information"
						aria-checked={showPlayerInfo}
						onclick={() => (showPlayerInfo = !showPlayerInfo)}><i></i></button
					>
				</div>
			</div>
			<footer class="drawer-footer settings-footer">
				<a href="/" class="quiet">Main menu</a>
				{#if onrestart}<button type="button" class="quiet" onclick={onrestart}>New game</button>{/if}
				<button type="button" class="primary" onclick={closeSettings}>Resume</button>
			</footer>
		</aside>
	{:else if ticketSelection}
		<aside
			class="decision-drawer ticket-drawer"
			role="dialog"
			aria-labelledby="ticket-title"
			aria-describedby="ticket-instructions"
			tabindex="-1"
			bind:this={ticketDialog}
		>
			<header class="drawer-heading">
				<div>
					<p class="section-label">{ticketSelection.source === 'opening' ? 'Plan your journey' : 'New destinations'}</p>
					<h1 id="ticket-title">Choose your routes</h1>
				</div>
				<p id="ticket-instructions">
					Keep at least {ticketSelection.minimum}. Hover or focus to trace a destination on the map.
				</p>
			</header>
			<div class="ticket-offers">
				{#each offeredTickets as ticket}
					<button
						type="button"
						class:previewed={highlightedTicket?.id === ticket.id}
						class:selected={selectedTickets.includes(ticket.id)}
						onmouseenter={() => (previewTicketId = ticket.id)}
						onfocus={() => (previewTicketId = ticket.id)}
						onclick={() => toggleTicket(ticket.id)}
						aria-pressed={selectedTickets.includes(ticket.id)}
						aria-label={`${cityName(ticket.cityA)} to ${cityName(ticket.cityB)}, ${ticket.points} points`}
					>
						<img src={ticketFaceAsset} alt="" />
						<strong class="ticket-points">{ticket.points}</strong>
						<span class="ticket-route"
							><strong>{cityName(ticket.cityA)}</strong><small>to {cityName(ticket.cityB)}</small></span
						>
						<span class="selected-state">{selectedTickets.includes(ticket.id) ? 'Kept' : 'Keep'}</span>
					</button>
				{/each}
			</div>
			<footer class="drawer-footer">
				<span>{selectedTickets.length} selected · {ticketSelection.minimum} required</span><button
					type="button"
					class="primary"
					disabled={selectedTickets.length < ticketSelection.minimum}
					onclick={keepTickets}>Keep tickets</button
				>
			</footer>
		</aside>
	{:else if selectedRoute}
		<aside
			bind:this={claimDialog}
			class="decision-drawer claim-drawer"
			role="dialog"
			aria-labelledby="claim-title"
			aria-live="polite"
			tabindex="-1"
		>
			<header class="drawer-heading">
				<div>
					<p class="section-label">Claim route</p>
					<h1 id="claim-title">{cityName(selectedRoute.cityA)} → {cityName(selectedRoute.cityB)}</h1>
				</div>
				<p>
					{selectedRoute.length} trains · {selectedRoute.color === 'gray'
						? 'any single color'
						: cardLabels[selectedRoute.color]}
				</p>
			</header>
			<div class="claim-actions">
				{#each availablePaymentColors(selectedRoute) as color}
					<button
						type="button"
						class="payment-card"
						onclick={() => claimRoute(selectedRoute, color)}
						aria-label={`Claim route using ${cardLabels[color]} cards`}
					>
						<img src={trainCardAssets[color]} alt="" /><span
							><strong>{cardLabels[color]}</strong><small
								>{viewer?.hand[color] ?? 0} cards + {viewer?.hand.locomotive ?? 0} wild</small
							></span
						>
					</button>
				{/each}
				{#if !availablePaymentColors(selectedRoute).length}<p class="claim-error">
						You need {selectedRoute.length} cards of one color, including wilds.
					</p>{/if}
			</div>
			<footer class="drawer-footer">
				<span>The chosen route is highlighted on the board.</span><button
					type="button"
					class="quiet"
					onclick={closeRouteSelection}>Cancel</button
				>
			</footer>
		</aside>
	{:else if gameState.phase.type === 'game-over' && finalResults.length}
		<aside
			bind:this={resultsDialog}
			class="decision-drawer results-drawer"
			role="dialog"
			aria-labelledby="results-title"
			tabindex="-1"
		>
			<header class="drawer-heading">
				<div>
					<p class="section-label">Journey complete</p>
					<h1 id="results-title">{winnerHeading()}</h1>
				</div>
				<p>Routes, destinations, and the longest railway are scored.</p>
			</header>
			<div class="standings" aria-label="Final standings">
				{#each finalResults as result (result.playerId)}
					{@const player = resultPlayer(result)}
					{@const completed = completedTickets(result)}
					{@const failed = failedTickets(result)}
					<article
						class:winner={result.rank === 1}
						class="result-card"
						style:--player-color={player ? playerColor(player) : undefined}
					>
						{#if player}<img src={playerPortraitAssets[player.color]} alt="" />{/if}<span class="rank"
							>{result.rank}</span
						>
						<div>
							<strong>{player?.name ?? result.playerId}</strong><small
								>{completed.length} completed · {failed.length} failed</small
							>
						</div>
						<strong class="final-score">{result.finalScore}</strong>
						<div class="score-breakdown">
							<span>Routes <strong>+{result.routePoints}</strong></span><span
								>Tickets <strong>{result.ticketPoints >= 0 ? '+' : ''}{result.ticketPoints}</strong></span
							><span>Longest <strong>{result.longestRouteBonus ? `+${result.longestRouteBonus}` : '—'}</strong></span>
						</div>
					</article>
				{/each}
			</div>
			<footer class="drawer-footer">
				<span>{gameState.turnNumber} turns</span>{#if onrestart}<button
						type="button"
						class="primary"
						onclick={onrestart}>Play again</button
					>{/if}
			</footer>
		</aside>
	{/if}

	{#if debug}<details class="debug">
			<summary>State inspector</summary>
			<pre>{JSON.stringify(gameState, null, 2)}</pre>
		</details>{/if}
</main>

<style>
	:global(html) {
		--player-red: #b92f31;
		--player-blue: #2876aa;
		--player-green: #348451;
		--player-yellow: #d1a522;
		--player-black: #323942;
	}

	:global(body) {
		overflow: hidden;
		background: #102d31;
	}

	button,
	input {
		font: inherit;
	}

	button {
		-webkit-tap-highlight-color: transparent;
	}

	.game-shell {
		position: relative;
		isolation: isolate;
		width: 100%;
		height: 100svh;
		overflow: hidden;
		background: #102d31 url('/game-assets/whimsical-1800s/table-background.webp') center / cover;
		color: #fff9e7;
		font-family: 'Arial Narrow', 'Roboto Condensed', Arial, sans-serif;
	}

	.board-stage {
		position: absolute;
		z-index: 0;
		inset: 0;
		background: #326e75;
		transition: right 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.drawer-open .board-stage {
		right: clamp(21rem, 30vw, 24rem);
	}

	.board-stage :global(.board-frame),
	.board-stage :global(.board) {
		width: 100%;
		height: 100%;
	}

	.board-stage :global(.board) {
		display: block;
		border: 0;
		border-radius: 0;
		box-shadow: none;
	}

	.simplified-map .board-stage :global(.map-art) {
		filter: saturate(0.32) contrast(0.94) brightness(0.72);
	}

	.board-stage :global(.board-help) {
		position: absolute;
		bottom: 3.25rem;
		left: 50%;
		margin: 0;
		transform: translateX(-50%);
		color: rgb(255 249 226 / 0.82);
		font-size: 0.62rem;
		text-shadow: 0 1px 4px #111;
		white-space: nowrap;
	}

	.game-controls {
		position: absolute;
		top: 1.15rem;
		left: 1.4rem;
		z-index: 12;
		display: flex;
		gap: 1.25rem;
	}

	.game-controls button {
		display: grid;
		width: 3.6rem;
		height: 3.6rem;
		place-items: center;
		border: 0.22rem solid #d7ae5b;
		border-radius: 50%;
		background: linear-gradient(#fff8e7, #ddd5c3);
		box-shadow:
			inset 0 0 0 2px #5d533e,
			0 0.35rem 0.7rem rgb(0 0 0 / 0.45);
		color: #3d4650;
		cursor: pointer;
		transition:
			transform 140ms ease,
			filter 140ms ease;
	}

	.game-controls button:hover,
	.game-controls button.active {
		transform: translateY(-2px) scale(1.04);
		filter: brightness(1.08);
	}

	.history-popover {
		position: absolute;
		top: 5.55rem;
		left: 1.4rem;
		z-index: 13;
		width: 18rem;
		border: 2px solid #b98b43;
		border-radius: 0.8rem;
		padding: 0.8rem;
		background: rgb(244 232 202 / 0.96);
		box-shadow: 0 0.75rem 2rem rgb(0 0 0 / 0.4);
		color: #392a1c;
		animation: popover-in 180ms ease-out;
	}

	.history-popover header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-family: Georgia, serif;
	}

	.history-popover button {
		border: 0;
		background: transparent;
		cursor: pointer;
	}

	.history-popover p {
		margin: 0.45rem 0 0;
		border-top: 1px solid rgb(91 67 36 / 0.2);
		padding-top: 0.45rem;
		font-size: 0.7rem;
	}

	.opponents {
		position: absolute;
		top: 7.55rem;
		left: 0;
		z-index: 9;
		display: grid;
		width: 8.4rem;
		gap: 0.85rem;
		pointer-events: none;
		transition: opacity 180ms ease;
	}

	.opponent {
		position: relative;
		display: grid;
		height: 5.25rem;
		grid-template-columns: 2.65rem 1fr 2.55rem;
		grid-template-rows: 1fr 1.45rem;
		align-items: center;
		border: 2px solid #d1ae61;
		border-left: 0;
		border-radius: 0 0.55rem 0.55rem 0;
		background: linear-gradient(100deg, color-mix(in srgb, var(--player-color) 85%, #18272a), #f1ede2 70%);
		box-shadow: 0 0.35rem 0.65rem rgb(0 0 0 / 0.4);
		color: #222a2e;
		transition:
			transform 180ms ease,
			filter 180ms ease;
	}

	.opponent.active {
		transform: translateX(0.32rem);
		filter: brightness(1.14);
		box-shadow:
			0 0 0 3px rgb(255 229 143 / 0.38),
			0 0.4rem 0.9rem rgb(0 0 0 / 0.5);
	}

	.opponent img {
		width: 2.75rem;
		height: 3.25rem;
		align-self: end;
		object-fit: cover;
		grid-row: 1;
		border-radius: 0 0.4rem 0 0;
	}

	.opponent-counts {
		display: flex;
		align-self: stretch;
		justify-content: space-around;
		padding-top: 0.35rem;
	}

	.opponent-counts span,
	.opponent-counts strong,
	.opponent-counts small {
		display: block;
		text-align: center;
	}

	.opponent-counts strong,
	.opponent-score {
		font-family: Georgia, serif;
		font-size: 1.35rem;
	}

	.opponent-counts small {
		font-size: 0.43rem;
		text-transform: uppercase;
	}

	.opponent-score {
		justify-self: center;
		font-size: 1.7rem;
	}

	.opponent-trains {
		position: absolute;
		right: 0.25rem;
		bottom: 1.55rem;
		display: flex;
		align-items: center;
		gap: 0.15rem;
		color: var(--player-color);
		text-shadow: 0 1px #fff;
	}

	.opponent footer {
		grid-column: 1 / -1;
		align-self: stretch;
		border-radius: 0 0 0.38rem 0;
		padding: 0.22rem 0.55rem;
		background: var(--player-color);
		color: white;
		font-size: 0.72rem;
		font-weight: 800;
		text-shadow: 0 1px 2px #222;
	}

	.viewer-hud {
		position: absolute;
		bottom: -0.1rem;
		left: 0;
		z-index: 11;
		width: 13.75rem;
		height: 13.3rem;
		pointer-events: none;
		transition: opacity 180ms ease;
	}

	.hide-player-info .opponents,
	.hide-player-info .viewer-hud {
		opacity: 0;
	}

	.viewer-portrait {
		position: absolute;
		bottom: 4.7rem;
		left: 0.25rem;
		width: 7.7rem;
		height: 8.2rem;
		object-fit: cover;
		object-position: 50% 20%;
		filter: drop-shadow(0 0.35rem 0.3rem rgb(0 0 0 / 0.45));
	}

	.viewer-ticket-stack {
		position: absolute;
		bottom: 2.3rem;
		left: 0.2rem;
		width: 8.7rem;
		height: 5.5rem;
	}

	.mini-ticket {
		position: absolute;
		bottom: calc(var(--ticket-index) * 0.55rem);
		left: calc(var(--ticket-index) * 0.15rem);
		display: grid;
		width: 8.4rem;
		height: 4.25rem;
		grid-template-columns: 1.6rem 1fr;
		align-items: center;
		gap: 0.35rem;
		border: 2px solid #9b7237;
		border-radius: 0.45rem;
		padding: 0.4rem;
		background: #efe0b6 url('/game-assets/whimsical-1800s/ticket-face.webp') center / cover;
		box-shadow: 0 0.3rem 0.55rem rgb(0 0 0 / 0.4);
		color: #3a2819;
		transform: rotate(calc((var(--ticket-index) - 1) * -1.5deg));
	}

	.mini-ticket strong {
		display: grid;
		width: 1.55rem;
		height: 1.55rem;
		place-items: center;
		border-radius: 50%;
		background: #9a332c;
		color: #fff3ce;
	}

	.mini-ticket span {
		overflow: hidden;
		font-size: 0.54rem;
		font-weight: 800;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.viewer-score {
		position: absolute;
		right: 0.9rem;
		bottom: 3.1rem;
		display: grid;
		width: 4.8rem;
		height: 4.6rem;
		place-items: center;
		border: 3px solid #d9be7b;
		border-radius: 0.7rem;
		background: rgb(248 243 226 / 0.96);
		box-shadow: 0 0.35rem 0.7rem rgb(0 0 0 / 0.42);
		color: #243033;
	}

	.viewer-score strong {
		align-self: end;
		font-family: Georgia, serif;
		font-size: 2.5rem;
		line-height: 1;
	}

	.viewer-score small {
		align-self: start;
		font-size: 0.48rem;
		text-transform: uppercase;
	}

	.viewer-trains {
		position: absolute;
		right: 1rem;
		bottom: 1.2rem;
		display: flex;
		align-items: center;
		gap: 0.25rem;
		color: var(--player-color);
		font-size: 1.2rem;
		text-shadow: 0 1px #fff;
	}

	.viewer-hud > footer {
		position: absolute;
		bottom: 0;
		left: 0;
		display: flex;
		width: 100%;
		height: 2.4rem;
		align-items: center;
		gap: 0.55rem;
		border: 2px solid #d6b567;
		border-left: 0;
		border-radius: 0 1.2rem 0 0;
		padding: 0.3rem 1rem;
		background: linear-gradient(100deg, var(--player-color), color-mix(in srgb, var(--player-color) 72%, #111));
		box-shadow: 0 -0.25rem 0.6rem rgb(0 0 0 / 0.35);
		color: white;
		text-shadow: 0 1px 2px #222;
	}

	.viewer-hud footer span {
		border-radius: 999px;
		padding: 0.12rem 0.35rem;
		background: rgb(0 0 0 / 0.22);
		font-size: 0.55rem;
		text-transform: uppercase;
	}

	.market {
		position: absolute;
		z-index: 10;
		inset: 0 0 0 auto;
		width: 5.9rem;
		transition:
			transform 220ms ease,
			opacity 160ms ease;
	}

	.drawer-open .market {
		transform: translateX(110%);
		opacity: 0;
		pointer-events: none;
	}

	.destination-deck,
	.deck,
	.train-card {
		border: 0;
		padding: 0;
		background: transparent;
		cursor: pointer;
	}

	.destination-deck {
		position: absolute;
		top: -0.35rem;
		right: 9.9rem;
		width: 6.35rem;
		height: 4.4rem;
	}

	.destination-deck img {
		width: 100%;
		height: 100%;
		border: 3px solid #f3e0b4;
		border-radius: 0.35rem;
		object-fit: cover;
		box-shadow:
			0.25rem 0.25rem 0 #29454a,
			0 0.4rem 0.8rem rgb(0 0 0 / 0.4);
	}

	.market small {
		position: absolute;
		display: grid;
		width: 2rem;
		height: 2rem;
		place-items: center;
		border-radius: 50%;
		background: #343c41;
		box-shadow: 0 0.2rem 0.4rem rgb(0 0 0 / 0.5);
		color: white;
		font-family: Georgia, serif;
		font-size: 1rem;
		font-weight: 800;
	}

	.destination-deck small {
		right: 1.9rem;
		bottom: -1.4rem;
	}

	.face-up {
		position: absolute;
		top: 0.6rem;
		right: -0.8rem;
		display: grid;
		width: 6.8rem;
		gap: 0.42rem;
	}

	.train-card {
		position: relative;
		height: min(14.3vh, 6.95rem);
		border: 3px solid #f2e5c8;
		border-radius: 0.42rem;
		box-shadow: 0 0.28rem 0.5rem rgb(0 0 0 / 0.42);
		overflow: visible;
		transition:
			transform 130ms ease,
			filter 130ms ease;
		animation: market-deal 260ms cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
	}

	.train-card:nth-child(2) {
		animation-delay: 35ms;
	}
	.train-card:nth-child(3) {
		animation-delay: 70ms;
	}
	.train-card:nth-child(4) {
		animation-delay: 105ms;
	}
	.train-card:nth-child(5) {
		animation-delay: 140ms;
	}

	.train-card:not(:disabled):hover {
		transform: translateX(-0.45rem) rotate(-1deg);
		filter: brightness(1.08);
	}

	.train-card img,
	.deck img {
		width: 100%;
		height: 100%;
		border-radius: inherit;
		object-fit: cover;
	}

	.card-gem {
		position: absolute;
		bottom: 0.18rem;
		left: -0.7rem;
		width: 1.4rem;
		height: 1.4rem;
		border: 2px solid #f7edcf;
		border-radius: 50%;
		background: currentColor;
		box-shadow: 0 0.2rem 0.35rem rgb(0 0 0 / 0.45);
	}

	.card-gem.red {
		color: #b92f31;
	}
	.card-gem.orange {
		color: #d86f20;
	}
	.card-gem.yellow {
		color: #e1b726;
	}
	.card-gem.green {
		color: #37834c;
	}
	.card-gem.blue {
		color: #2876aa;
	}
	.card-gem.purple {
		color: #74479b;
	}
	.card-gem.black {
		color: #333a41;
	}
	.card-gem.white {
		color: #eee7d4;
	}
	.card-gem.locomotive {
		background: conic-gradient(#c33, #dd8b25, #d9c33c, #3b8a55, #337fb6, #8a52a5, #c33);
	}

	.deck {
		position: absolute;
		right: -1rem;
		bottom: -1.55rem;
		width: 7.1rem;
		height: 8.75rem;
		border: 3px solid #ead7ac;
		border-radius: 0.45rem;
		box-shadow:
			-0.25rem -0.25rem 0 #29454a,
			0 0.4rem 0.8rem rgb(0 0 0 / 0.42);
	}

	.deck small {
		left: -2.8rem;
		bottom: 1.7rem;
		width: 2.65rem;
		height: 2.65rem;
		font-size: 1.3rem;
	}

	.hand-panel {
		position: absolute;
		bottom: 1.55rem;
		left: 51.5%;
		z-index: 9;
		width: 21rem;
		height: 8.6rem;
		transform: translateX(-50%);
		pointer-events: none;
	}

	.hand-cards {
		display: flex;
		height: 100%;
		align-items: end;
		justify-content: center;
	}

	.hand-card {
		position: relative;
		width: 4.75rem;
		height: 7.35rem;
		flex: 0 0 4.75rem;
		margin-left: -0.75rem;
		transform: translateY(calc(abs(var(--card-index) - 4) * 0.14rem)) rotate(calc((var(--card-index) - 4) * 2.2deg));
		transform-origin: 50% 115%;
		filter: drop-shadow(0 0.35rem 0.38rem rgb(0 0 0 / 0.5));
		animation: hand-deal 320ms cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
		animation-delay: calc(var(--card-index) * 26ms);
	}

	.hand-card:first-child {
		margin-left: 0;
	}

	.hand-card img {
		width: 100%;
		height: 100%;
		border: 2px solid #f4e7c7;
		border-radius: 0.42rem;
		object-fit: cover;
	}

	.card-count {
		position: absolute;
		top: -0.5rem;
		left: 50%;
		display: grid;
		width: 2rem;
		height: 2rem;
		place-items: center;
		transform: translateX(-50%);
		border: 3px solid #fff5d7;
		border-radius: 50%;
		background: #9f352f;
		box-shadow: 0 0.2rem 0.4rem rgb(0 0 0 / 0.45);
		font-family: Georgia, serif;
		font-size: 1rem;
	}

	.turn-banner {
		position: absolute;
		bottom: 0;
		right: 23%;
		left: 18%;
		z-index: 8;
		display: grid;
		width: auto;
		height: 2.7rem;
		place-items: center;
		transform: none;
		border-top: 1px solid rgb(255 255 255 / 0.76);
		background: linear-gradient(90deg, rgb(249 247 237 / 0), rgb(249 247 237 / 0.95) 18%, rgb(249 247 237 / 0.95));
		box-shadow: 0 -0.25rem 0.8rem rgb(0 0 0 / 0.18);
		color: #233034;
		text-align: center;
		animation: banner-in 220ms ease-out;
	}

	.turn-banner strong {
		align-self: end;
		font-family: Georgia, serif;
		font-size: 1.25rem;
		line-height: 1;
	}

	.turn-banner span {
		align-self: start;
		font-size: 0.48rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.decision-drawer {
		position: fixed;
		z-index: 20;
		inset: 0 0 0 auto;
		display: flex;
		width: clamp(21rem, 30vw, 24rem);
		flex-direction: column;
		overflow: hidden;
		border-left: 3px solid #bd944f;
		padding: 1.15rem;
		background: linear-gradient(180deg, rgb(24 62 67 / 0.98), rgb(11 34 38 / 0.99));
		box-shadow: -1rem 0 2.5rem rgb(0 0 0 / 0.4);
		animation: drawer-in 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.drawer-heading {
		flex: 0 0 auto;
		border-bottom: 1px solid rgb(255 255 255 / 0.16);
		padding-bottom: 0.9rem;
	}

	.drawer-heading h1 {
		margin: 0;
		font-family: Georgia, serif;
		font-size: clamp(1.65rem, 2.6vw, 2.35rem);
		font-weight: 500;
		line-height: 1.03;
	}

	.drawer-heading > p,
	.drawer-heading div + p {
		margin: 0.55rem 0 0;
		color: #c6d5cf;
		font-size: 0.72rem;
		line-height: 1.45;
	}

	.section-label {
		margin: 0 0 0.25rem;
		color: #e0bd72;
		font-size: 0.6rem;
		font-weight: 800;
		letter-spacing: 0.16em;
		text-transform: uppercase;
	}

	.drawer-footer {
		display: flex;
		flex: 0 0 auto;
		align-items: center;
		justify-content: space-between;
		gap: 0.7rem;
		border-top: 1px solid rgb(255 255 255 / 0.15);
		padding-top: 0.9rem;
		color: #b8c8c3;
		font-size: 0.66rem;
	}

	.primary,
	.quiet {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.55rem;
		padding: 0.6rem 0.9rem;
		font-weight: 800;
		cursor: pointer;
		text-decoration: none;
	}

	.primary {
		border: 2px solid #d6af61;
		background: #23868b;
		box-shadow:
			inset 0 0 0 1px #f0ddad,
			0 0.25rem 0.5rem rgb(0 0 0 / 0.3);
		color: white;
	}

	.quiet {
		border: 1px solid rgb(255 255 255 / 0.28);
		background: rgb(255 255 255 / 0.08);
		color: #f5ead0;
	}

	button:disabled {
		cursor: not-allowed;
		filter: grayscale(0.6) brightness(0.65);
	}

	button:focus-visible,
	input:focus-visible {
		outline: 3px solid #ffe287;
		outline-offset: 2px;
	}

	.ticket-offers,
	.claim-actions,
	.standings,
	.settings-list {
		min-height: 0;
		flex: 1 1 auto;
		overflow-y: auto;
		margin: 0.9rem -0.15rem;
		padding: 0.15rem;
	}

	.ticket-offers {
		display: grid;
		align-content: start;
		gap: 0.75rem;
	}

	.ticket-offers button {
		position: relative;
		display: grid;
		min-height: 6rem;
		grid-template-columns: 2.9rem minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.6rem;
		overflow: hidden;
		border: 2px solid #96713b;
		border-radius: 0.65rem;
		padding: 0.7rem;
		background: #ead7a8;
		color: #392719;
		cursor: pointer;
		text-align: left;
		transition:
			transform 150ms ease,
			border-color 150ms ease,
			box-shadow 150ms ease;
	}

	.ticket-offers button > img {
		position: absolute;
		z-index: 0;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0.78;
	}

	.ticket-offers button > :not(img) {
		position: relative;
		z-index: 1;
	}

	.ticket-offers button:hover,
	.ticket-offers button.previewed {
		transform: translateX(-0.3rem);
		border-color: #ffe38a;
		box-shadow: 0 0 0 2px rgb(255 226 126 / 0.45);
	}

	.ticket-offers button.selected {
		border-color: #fff1a2;
		box-shadow:
			inset 0 0 0 3px #a83a31,
			0 0 0 2px #f4d77d;
	}

	.ticket-points {
		display: grid;
		width: 2.7rem;
		height: 2.7rem;
		place-items: center;
		border-radius: 50%;
		background: #9d352e;
		color: #fff2cb;
		font-family: Georgia, serif;
		font-size: 1.1rem;
	}

	.ticket-route strong,
	.ticket-route small {
		display: block;
	}

	.ticket-route strong {
		font-family: Georgia, serif;
		font-size: 1rem;
	}

	.ticket-route small {
		margin-top: 0.16rem;
		font-size: 0.7rem;
	}

	.selected-state {
		border-radius: 999px;
		padding: 0.24rem 0.4rem;
		background: rgb(72 46 26 / 0.15);
		font-size: 0.58rem;
		font-weight: 800;
	}

	.claim-actions {
		display: grid;
		align-content: start;
		gap: 0.65rem;
	}

	.payment-card {
		display: grid;
		grid-template-columns: 4.8rem minmax(0, 1fr);
		align-items: center;
		gap: 0.8rem;
		border: 2px solid #c6a25c;
		border-radius: 0.65rem;
		padding: 0.5rem;
		background: rgb(245 235 208 / 0.96);
		color: #31271d;
		cursor: pointer;
		text-align: left;
		transition: transform 140ms ease;
	}

	.payment-card:hover {
		transform: translateX(-0.3rem);
	}

	.payment-card img {
		width: 4.8rem;
		height: 6.5rem;
		border-radius: 0.4rem;
		object-fit: cover;
	}

	.payment-card span strong,
	.payment-card span small {
		display: block;
	}

	.payment-card span strong {
		font-family: Georgia, serif;
		font-size: 1.05rem;
	}

	.payment-card span small {
		margin-top: 0.25rem;
		font-size: 0.66rem;
	}

	.claim-error {
		border: 1px solid rgb(255 164 146 / 0.45);
		border-radius: 0.55rem;
		padding: 0.8rem;
		background: rgb(89 32 28 / 0.38);
		color: #ffc1b4;
		font-size: 0.75rem;
	}

	.settings-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: -1.15rem -1.15rem 0;
		padding: 1rem 1.15rem 0.9rem;
		background: linear-gradient(145deg, #34486d, #1e2d4d);
	}

	.close-drawer {
		display: grid;
		width: 3.1rem;
		height: 3.1rem;
		place-items: center;
		border: 3px solid #d5ad5d;
		border-radius: 50%;
		background: #2c3442;
		color: white;
		cursor: pointer;
	}

	.settings-list {
		display: grid;
		align-content: start;
		gap: 0.42rem;
	}

	.setting-row {
		display: flex;
		min-height: 3.4rem;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		border: 1px solid #c8c1b2;
		border-radius: 0.7rem;
		padding: 0.5rem 0.75rem;
		background: rgb(247 246 242 / 0.96);
		box-shadow: inset 0 1px #fff;
		color: #30343c;
	}

	.setting-row > span {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.86rem;
		font-weight: 700;
	}

	.setting-row input[type='range'] {
		width: 48%;
		accent-color: #23868b;
	}

	.toggle {
		position: relative;
		width: 3.25rem;
		height: 1.8rem;
		border: 0;
		border-radius: 999px;
		background: #c2c6c8;
		cursor: pointer;
		transition: background 140ms ease;
	}

	.toggle i {
		position: absolute;
		top: 0.15rem;
		left: 0.15rem;
		width: 1.5rem;
		height: 1.5rem;
		border: 2px solid #d4ad61;
		border-radius: 50%;
		background: white;
		transition: transform 160ms ease;
	}

	.toggle.enabled {
		background: #23868b;
	}
	.toggle.enabled i {
		transform: translateX(1.45rem);
	}

	.stepper {
		display: grid;
		min-width: 9.8rem;
		grid-template-columns: 2.2rem 1fr 2.2rem;
		align-items: center;
		text-align: center;
	}

	.stepper button {
		display: grid;
		width: 2.2rem;
		height: 2.2rem;
		place-items: center;
		border: 2px solid #d5ad5f;
		border-radius: 50%;
		background: white;
		font-size: 1.7rem;
		cursor: pointer;
	}

	.settings-footer .primary {
		min-width: 9.5rem;
	}

	.standings {
		display: grid;
		align-content: start;
		gap: 0.65rem;
	}

	.result-card {
		position: relative;
		display: grid;
		grid-template-columns: 3.1rem 1.5rem minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.55rem;
		border: 2px solid color-mix(in srgb, var(--player-color) 72%, #d8bc77);
		border-radius: 0.7rem;
		padding: 0.55rem;
		background: rgb(246 235 206 / 0.94);
		color: #34271b;
		animation: result-in 260ms ease-out backwards;
	}

	.result-card.winner {
		box-shadow:
			inset 0 0 0 3px #f4cb64,
			0 0 1rem rgb(244 203 100 / 0.25);
	}

	.result-card > img {
		width: 3.1rem;
		height: 3.1rem;
		border-radius: 50%;
		object-fit: cover;
	}

	.rank {
		display: grid;
		width: 1.45rem;
		height: 1.45rem;
		place-items: center;
		border-radius: 50%;
		background: var(--player-color);
		color: white;
		font-weight: 900;
	}

	.result-card div > strong,
	.result-card div > small {
		display: block;
	}

	.result-card div > small {
		margin-top: 0.12rem;
		font-size: 0.58rem;
	}
	.final-score {
		font-family: Georgia, serif;
		font-size: 1.65rem;
	}

	.score-breakdown {
		display: flex;
		grid-column: 1 / -1;
		gap: 0.35rem;
	}

	.score-breakdown span {
		flex: 1;
		border-radius: 0.35rem;
		padding: 0.35rem;
		background: rgb(74 48 28 / 0.1);
		font-size: 0.58rem;
	}

	.debug {
		position: absolute;
		right: 7rem;
		bottom: 0.4rem;
		z-index: 18;
		border-radius: 0.4rem;
		padding: 0.3rem 0.45rem;
		background: rgb(7 21 24 / 0.84);
		font-size: 0.58rem;
	}

	.debug pre {
		width: min(38rem, 65vw);
		max-height: 45vh;
		overflow: auto;
	}

	@keyframes drawer-in {
		from {
			transform: translateX(100%);
			opacity: 0.5;
		}
	}
	@keyframes popover-in {
		from {
			transform: translateY(-0.35rem);
			opacity: 0;
		}
	}
	@keyframes market-deal {
		from {
			transform: translateX(1.2rem) rotate(3deg);
			opacity: 0;
		}
	}
	@keyframes hand-deal {
		from {
			transform: translateY(2rem) rotate(0);
			opacity: 0;
		}
	}
	@keyframes banner-in {
		from {
			transform: translateY(0.7rem);
			opacity: 0;
		}
	}
	@keyframes result-in {
		from {
			transform: translateX(0.75rem);
			opacity: 0;
		}
	}

	@media (max-width: 900px) {
		.drawer-open .board-stage {
			right: 0;
			bottom: min(45svh, 27rem);
		}
		.game-controls {
			top: 0.55rem;
			left: 0.55rem;
			gap: 0.5rem;
		}
		.game-controls button {
			width: 2.8rem;
			height: 2.8rem;
		}
		.opponents {
			top: 3.8rem;
			display: flex;
			width: auto;
			max-width: calc(100vw - 1rem);
			gap: 0.35rem;
			overflow: hidden;
		}
		.opponent {
			width: 6.8rem;
			height: 3.5rem;
			flex: 0 0 6.8rem;
			grid-template-columns: 2rem 1fr 1.8rem;
			grid-template-rows: 1fr 1rem;
		}
		.opponent img {
			width: 2rem;
			height: 2.3rem;
		}
		.opponent-counts small,
		.opponent-trains {
			display: none;
		}
		.opponent-counts strong {
			font-size: 0.85rem;
		}
		.opponent-score {
			font-size: 1.1rem;
		}
		.opponent footer {
			font-size: 0.55rem;
			padding-block: 0.08rem;
		}
		.viewer-hud {
			transform: scale(0.74);
			transform-origin: bottom left;
		}
		.market {
			top: auto;
			right: 0.3rem;
			bottom: 3rem;
			left: 0.3rem;
			width: auto;
			height: 4.2rem;
		}
		.destination-deck {
			top: 0;
			right: auto;
			left: 0;
			width: 3.8rem;
			height: 3rem;
		}
		.destination-deck small {
			right: -0.5rem;
			bottom: -0.5rem;
			width: 1.5rem;
			height: 1.5rem;
			font-size: 0.7rem;
		}
		.face-up {
			top: 0;
			right: 4.4rem;
			left: 4.4rem;
			display: grid;
			width: auto;
			grid-template-columns: repeat(5, 1fr);
			gap: 0.25rem;
		}
		.train-card {
			height: 4.2rem;
		}
		.deck {
			right: 0;
			bottom: 0;
			width: 3.8rem;
			height: 4.6rem;
		}
		.deck small {
			left: -0.8rem;
			bottom: 0.1rem;
			width: 1.6rem;
			height: 1.6rem;
			font-size: 0.75rem;
		}
		.hand-panel {
			bottom: 6.4rem;
			width: 18rem;
			height: 6.2rem;
		}
		.hand-card {
			width: 3.65rem;
			height: 5.5rem;
			flex-basis: 3.65rem;
			margin-left: -0.85rem;
		}
		.turn-banner {
			right: 0;
			left: 0;
			width: 100%;
			transform: none;
		}
		.decision-drawer {
			inset: auto 0 0;
			width: 100%;
			height: min(45svh, 27rem);
			border-top: 3px solid #bd944f;
			border-left: 0;
			animation-name: sheet-in;
		}
		.ticket-offers {
			grid-template-columns: repeat(3, minmax(12rem, 1fr));
			overflow-x: auto;
			overflow-y: hidden;
		}
		.ticket-offers button {
			min-height: 5rem;
		}
		.settings-list {
			grid-template-columns: 1fr 1fr;
		}
		.setting-row {
			min-height: 3rem;
		}
	}

	@keyframes sheet-in {
		from {
			transform: translateY(100%);
			opacity: 0.5;
		}
	}

	@media (max-width: 560px) {
		.viewer-hud {
			transform: scale(0.62);
		}
		.hand-panel {
			left: 58%;
			width: 14rem;
		}
		.hand-card {
			width: 3.1rem;
			height: 4.7rem;
			flex-basis: 3.1rem;
		}
		.turn-banner strong {
			font-size: 1rem;
		}
		.ticket-offers {
			grid-template-columns: repeat(3, 10rem);
		}
		.settings-list {
			grid-template-columns: 1fr;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.game-shell *,
		.game-shell *::before,
		.game-shell *::after {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.01ms !important;
		}
	}
</style>
