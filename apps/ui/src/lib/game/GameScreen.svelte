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
	import { tick } from 'svelte';
	import GameBoard from './GameBoard.svelte';

	type Props = {
		state: GameState;
		viewerId: string;
		send: (action: GameAction) => void;
		onrestart?: () => void;
		debug?: boolean;
	};

	let { state: gameState, viewerId, send, onrestart, debug = false }: Props = $props();

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
		white: 'White',
		locomotive: 'Wild',
	};
	const ticketById = new Map(USA_TICKETS.map(ticket => [ticket.id, ticket]));
	const cityById = new Map(USA_CITIES.map(city => [city.id, city]));
	const routeById = new Map(USA_ROUTES.map(route => [route.id, route]));

	let selectedTickets = $state<TicketId[]>([]);
	let selectedRouteId = $state<RouteId | undefined>();
	let previewTicketId = $state<TicketId | undefined>();
	let activeOfferKey = $state('');
	let ticketDialog = $state<HTMLElement | undefined>();

	const currentPlayer = $derived(gameState.players[gameState.currentPlayerIndex]);
	const viewer = $derived(gameState.players.find(player => player.id === viewerId));
	const isViewerTurn = $derived(gameState.phase.type === 'turn' && currentPlayer?.id === viewerId);
	const selectedRoute = $derived(selectedRouteId ? routeById.get(selectedRouteId) : undefined);
	const recentLog = $derived(gameState.log.slice(-4).toReversed());
	const ticketSelection = $derived(
		gameState.phase.type === 'ticket-selection' && gameState.phase.playerId === viewerId ? gameState.phase : undefined,
	);
	const offeredTickets = $derived(ticketSelection?.ticketIds.map(id => ticketById.get(id)).filter(isTicket) ?? []);
	const highlightedTicket = $derived(
		(previewTicketId ? ticketById.get(previewTicketId) : undefined) ?? offeredTickets[0],
	);
	const latestMove = $derived(gameState.log.at(-1));
	const latestMoveIsBot = $derived(
		gameState.players.some(player => player.isBot && latestMove?.startsWith(player.name)),
	);
	const finalRoundPlayer = $derived(
		gameState.finalRound
			? gameState.players.find(player => player.id === gameState.finalRound?.triggeredBy)
			: undefined,
	);
	const finalResults = $derived(gameState.finalResults ?? []);
	const viewerWon = $derived(gameState.phase.type === 'game-over' && gameState.phase.winnerIds.includes(viewerId));

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
		if (viewerWon) return gameState.phase.winnerIds.length > 1 ? 'You tied for first!' : 'You won!';
		const winnerNames = gameState.phase.winnerIds
			.map(id => gameState.players.find(player => player.id === id)?.name)
			.filter(Boolean);
		return `${winnerNames.join(' & ') || 'The winner'} ${winnerNames.length > 1 ? 'win' : 'wins'}!`;
	}

	function selectRoute(route: Route) {
		if (!isViewerTurn || gameState.phase.type !== 'turn' || gameState.phase.drawsTaken > 0) return;
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

	function canDrawCard(card: TrainCard): boolean {
		if (!isViewerTurn || gameState.phase.type !== 'turn') return false;
		return !(gameState.phase.drawsTaken === 1 && card === 'locomotive');
	}

	function describeTurn(): string {
		const phase = gameState.phase;
		if (phase.type === 'game-over') return 'Game complete';
		if (phase.type === 'ticket-selection') {
			const selector = gameState.players.find(player => player.id === phase.playerId);
			return selector?.id === viewerId ? 'Choose your tickets' : `${selector?.name ?? 'Opponent'} is choosing tickets`;
		}
		if (currentPlayer?.id !== viewerId) return `${currentPlayer?.name ?? 'Opponent'} is playing`;
		if (phase.drawsTaken === 1) return 'Draw one more train card';
		return 'Choose an action';
	}

	function ticketFor(id: TicketId): DestinationTicket | undefined {
		return ticketById.get(id);
	}
</script>

<main
	class:drawer-open={Boolean(ticketSelection || selectedRoute || finalResults.length)}
	class:debug-mode={debug}
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

	<header class="game-controls">
		<span class="brand-mark" aria-hidden="true">T</span>
		<div>
			<strong>Ticket to Ride</strong>
			<span>Turn {gameState.turnNumber}</span>
		</div>
	</header>

	<aside class="players" aria-label="Players">
		{#each gameState.players as player, index (player.id)}
			<div
				class:active={index === gameState.currentPlayerIndex}
				class:viewer-player={player.id === viewerId}
				class="player-row"
				style:--player-color={playerColor(player)}
				aria-label={`${player.name}: ${player.score} points, ${player.trains} trains, ${trainCardCount(player)} train cards, ${player.tickets.length} destination tickets`}
			>
				<span class="player-token">{index + 1}</span>
				<div class="player-name">
					<strong>{player.name}</strong>
					<span>{player.id === viewerId ? 'You' : player.isBot ? 'Bot' : 'Player'}</span>
				</div>
				<div class="player-stats">
					<strong>{player.score}</strong>
					<span>{player.trains} trains</span>
				</div>
			</div>
		{/each}
	</aside>

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
			<span class="ticket-stack" aria-hidden="true">TKT</span>
			<small>{gameState.destinationDeck.length}</small>
		</button>
		<div class="face-up">
			{#each gameState.faceUpTrainCards as card, index (`${index}-${card}`)}
				<button
					type="button"
					class={`train-card ${card}`}
					disabled={!canDrawCard(card)}
					onclick={() => send({ type: 'draw-face-up', index })}
					aria-label={`Draw ${cardLabels[card]} train card`}
				>
					<span class="rails" aria-hidden="true"></span>
					<strong>{cardLabels[card]}</strong>
				</button>
			{/each}
		</div>
		<button
			type="button"
			class="deck"
			disabled={!isViewerTurn || gameState.phase.type !== 'turn' || gameState.trainDeck.length === 0}
			onclick={() => send({ type: 'draw-train-deck' })}
			aria-label={`Draw a blind train card. ${gameState.trainDeck.length} remain.`}
		>
			<span class="deck-card" aria-hidden="true"></span>
			<small>{gameState.trainDeck.length}</small>
		</button>
	</aside>

	<div class:your-turn={isViewerTurn} class="turn-banner" role="status" aria-live="polite">
		<span class="turn-light" style:background={currentPlayer ? playerColor(currentPlayer) : undefined}></span>
		<strong>{describeTurn()}</strong>
		<span>{currentPlayer?.name ?? 'Waiting for players'}</span>
	</div>

	<div class="game-feedback" aria-live="polite">
		{#if gameState.finalRound && gameState.phase.type !== 'game-over'}
			<div class="final-round-alert" role="status">
				<strong>Final round · {gameState.finalRound.turnsRemaining}</strong>
				<span>{finalRoundPlayer?.name ?? 'A player'} is down to two trains.</span>
			</div>
		{:else if latestMove}
			<div class:bot-move={latestMoveIsBot} class="latest-move" role="status">
				<strong>{latestMoveIsBot ? 'Opponent' : 'Latest'}</strong>
				<span>{latestMove}</span>
			</div>
		{/if}
	</div>

	<div class="ticket-hand" aria-label="Your destination tickets">
		{#each viewer?.tickets ?? [] as ticketId, index (ticketId)}
			{@const ticket = ticketFor(ticketId)}
			{#if ticket}
				<article class="ticket" style:--ticket-index={index}>
					<span>{ticket.points}</span>
					<div>
						<strong>{cityName(ticket.cityA)}</strong>
						<small>{cityName(ticket.cityB)}</small>
					</div>
				</article>
			{/if}
		{/each}
	</div>

	<footer class="hand-panel">
		<div class="hand-cards" aria-label="Your train cards">
			{#each cardOrder as card, index (`${card}-${viewer?.hand[card] ?? 0}`)}
				<div class:empty={!viewer?.hand[card]} class={`hand-card ${card}`} style:--card-index={index}>
					<span class="card-count">{viewer?.hand[card] ?? 0}</span>
					<span class="mini-rails" aria-hidden="true"></span>
					<strong>{cardLabels[card]}</strong>
				</div>
			{/each}
		</div>
	</footer>

	{#if ticketSelection}
		<aside
			class="decision-drawer ticket-drawer"
			role="dialog"
			aria-labelledby="ticket-title"
			aria-describedby="ticket-instructions"
			tabindex="-1"
			bind:this={ticketDialog}
		>
			<header class="drawer-heading">
				<p class="section-label">
					{ticketSelection.source === 'opening' ? 'Plan your journey' : 'New destinations'}
				</p>
				<h1 id="ticket-title">
					{ticketSelection.source === 'opening' ? 'Choose your routes' : 'Keep destinations'}
				</h1>
				<p id="ticket-instructions">
					Keep at least {ticketSelection.minimum}. Point at a ticket to trace it on the map.
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
						aria-label={`${cityName(ticket.cityA)} to ${cityName(ticket.cityB)}, ${ticket.points} points${selectedTickets.includes(ticket.id) ? ', selected' : ''}`}
					>
						<span class="ticket-points">{ticket.points}</span>
						<span class="ticket-route">
							<strong>{cityName(ticket.cityA)}</strong>
							<small>to {cityName(ticket.cityB)}</small>
						</span>
						<span class="selected-state" aria-hidden="true"
							>{selectedTickets.includes(ticket.id) ? 'Kept' : 'Keep'}</span
						>
					</button>
				{/each}
			</div>
			<footer class="drawer-footer">
				<span>{selectedTickets.length} selected · {ticketSelection.minimum} required</span>
				<button
					type="button"
					class="primary"
					disabled={selectedTickets.length < ticketSelection.minimum}
					onclick={keepTickets}
				>
					Keep tickets
				</button>
			</footer>
		</aside>
	{:else if selectedRoute}
		<aside class="decision-drawer claim-drawer" role="dialog" aria-labelledby="claim-title" aria-live="polite">
			<header class="drawer-heading">
				<p class="section-label">Claim route</p>
				<h1 id="claim-title">{cityName(selectedRoute.cityA)} → {cityName(selectedRoute.cityB)}</h1>
				<p>
					{selectedRoute.length} trains · {selectedRoute.color === 'gray'
						? 'use any single color'
						: cardLabels[selectedRoute.color]}
				</p>
			</header>
			<div class="claim-actions">
				{#each availablePaymentColors(selectedRoute) as color}
					<button
						type="button"
						class={`card-swatch ${color}`}
						onclick={() => claimRoute(selectedRoute, color)}
						aria-label={`Claim ${cityName(selectedRoute.cityA)} to ${cityName(selectedRoute.cityB)} using ${cardLabels[color]} cards. You have ${viewer?.hand[color] ?? 0} plus ${viewer?.hand.locomotive ?? 0} wild.`}
					>
						<span class="mini-rails" aria-hidden="true"></span>
						<strong>{cardLabels[color]}</strong>
						<small>{viewer?.hand[color] ?? 0} cards + {viewer?.hand.locomotive ?? 0} wild</small>
					</button>
				{/each}
				{#if !availablePaymentColors(selectedRoute).length}
					<p class="claim-error">You need {selectedRoute.length} cards of one color, including wilds.</p>
				{/if}
			</div>
			<footer class="drawer-footer">
				<span>Select a color to claim the highlighted track.</span>
				<button type="button" class="quiet" onclick={() => (selectedRouteId = undefined)}>Cancel</button>
			</footer>
		</aside>
	{:else if gameState.phase.type === 'game-over' && finalResults.length}
		<aside class="decision-drawer results-drawer" role="dialog" aria-labelledby="results-title">
			<header class="drawer-heading results-heading">
				<p class="section-label">Journey complete</p>
				<h1 id="results-title">{winnerHeading()}</h1>
				<p>Final routes, destinations, and the longest railway are scored.</p>
			</header>
			<div class="standings" aria-label="Final standings">
				{#each finalResults as result (result.playerId)}
					{@const player = resultPlayer(result)}
					{@const completed = completedTickets(result)}
					{@const failed = failedTickets(result)}
					<article
						class:winner={result.rank === 1}
						class:viewer-result={result.playerId === viewerId}
						class="result-card"
					>
						<div class="result-summary">
							<span class="rank">{result.rank}</span>
							<span class="player-token result-token" style:--player-color={player ? playerColor(player) : undefined}
								>{result.rank}</span
							>
							<div class="result-name">
								<strong>{player?.name ?? result.playerId}</strong><span
									>{completed.length} completed · {failed.length} failed</span
								>
							</div>
							<div class="score-total"><strong>{result.finalScore}</strong><span>points</span></div>
						</div>
						<div class="score-breakdown">
							<span>Routes <strong>+{result.routePoints}</strong></span>
							<span>Tickets <strong>{result.ticketPoints >= 0 ? '+' : ''}{result.ticketPoints}</strong></span>
							<span>Longest <strong>{result.longestRouteBonus ? `+${result.longestRouteBonus}` : '—'}</strong></span>
						</div>
						<details class="ticket-results">
							<summary>Ticket results</summary>
							{#each completed as ticket}<div class="ticket-result complete">
									<span>Complete · {cityName(ticket.cityA)} to {cityName(ticket.cityB)}</span><strong
										>+{ticket.points}</strong
									>
								</div>{/each}
							{#each failed as ticket}<div class="ticket-result failed">
									<span>Failed · {cityName(ticket.cityA)} to {cityName(ticket.cityB)}</span><strong
										>−{ticket.points}</strong
									>
								</div>{/each}
						</details>
					</article>
				{/each}
			</div>
			<footer class="drawer-footer">
				<span>{gameState.turnNumber} turns · seed {gameState.seed}</span>
				{#if onrestart}<button type="button" class="primary" onclick={onrestart}>Play again</button>{/if}
			</footer>
		</aside>
	{/if}

	{#if debug}
		<details class="debug">
			<summary>State inspector</summary>
			<pre>{JSON.stringify(gameState, null, 2)}</pre>
		</details>
	{/if}
</main>

<style>
	:global(html) {
		--player-red: #d84f49;
		--player-blue: #4388c6;
		--player-green: #4c9a65;
		--player-yellow: #e4b934;
		--player-black: #484b50;
	}

	:global(body) {
		background: #15262a;
		overflow: hidden;
	}

	.game-shell {
		min-height: 100vh;
		padding: 1rem;
		background:
			radial-gradient(circle at 50% 15%, rgba(89, 128, 122, 0.38), transparent 38rem),
			linear-gradient(145deg, #203b3d, #101d21 70%);
		color: #f7f1df;
	}

	.topbar,
	.game-feedback,
	.table,
	.hand-panel,
	.debug {
		width: min(100%, 112rem);
		margin-inline: auto;
	}

	.topbar {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 1rem;
		min-height: 4.5rem;
		margin-bottom: 1rem;
		padding: 0 0.4rem;
	}

	.brand,
	.turn-status,
	.player-row,
	.deck,
	.destination-deck,
	.hand-heading,
	.hand-summary,
	.modal-footer {
		display: flex;
		align-items: center;
	}

	.brand {
		gap: 0.75rem;
	}

	.brand-mark {
		display: grid;
		width: 2.8rem;
		height: 2.8rem;
		place-items: center;
		border: 2px solid #ead29d;
		border-radius: 50%;
		background: #a23e35;
		box-shadow: 0 0.3rem 1rem rgba(0, 0, 0, 0.25);
		color: #fff4d6;
		font-family: Georgia, serif;
		font-size: 1.55rem;
		font-weight: 800;
	}

	.turn-status strong,
	.turn-status span,
	.round-meta span,
	.round-meta strong {
		display: block;
		margin: 0;
	}

	.turn-status span,
	.round-meta span {
		color: #9fb3b1;
		font-size: 0.72rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.turn-status {
		gap: 0.65rem;
		min-width: 15rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 999px;
		padding: 0.55rem 1rem;
		background: rgba(10, 21, 24, 0.58);
	}

	.turn-status.your-turn {
		border-color: rgba(237, 207, 125, 0.58);
		box-shadow: 0 0 1.5rem rgba(237, 207, 125, 0.14);
	}

	.turn-light {
		width: 0.75rem;
		height: 0.75rem;
		border: 2px solid rgba(255, 255, 255, 0.7);
		border-radius: 50%;
		box-shadow: 0 0 0.65rem currentColor;
	}

	.round-meta {
		justify-self: end;
		text-align: right;
	}

	.round-meta strong {
		font-size: 1.2rem;
	}

	.game-feedback {
		display: flex;
		align-items: stretch;
		justify-content: center;
		gap: 0.65rem;
		margin-top: -0.45rem;
		margin-bottom: 1rem;
	}

	.latest-move,
	.final-round-alert {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 0.75rem;
		padding: 0.55rem 0.8rem;
		background: rgba(10, 21, 24, 0.7);
	}

	.latest-move {
		min-width: min(100%, 22rem);
	}

	.latest-move.bot-move {
		border-color: rgba(115, 164, 209, 0.42);
		background: rgba(31, 54, 69, 0.74);
	}

	.latest-move strong,
	.latest-move span,
	.final-round-alert strong,
	.final-round-alert span {
		display: block;
	}

	.latest-move strong,
	.final-round-alert strong {
		font-size: 0.71rem;
	}

	.move-icon,
	.countdown {
		display: grid;
		width: 1.75rem;
		height: 1.75rem;
		flex: 0 0 auto;
		place-items: center;
		border-radius: 50%;
		background: #385c67;
		color: #d9ece8;
		font-size: 0.7rem;
		font-weight: 900;
	}

	.final-round-alert {
		border-color: rgba(235, 177, 75, 0.55);
		background: rgba(76, 50, 23, 0.82);
	}

	.countdown {
		background: #b94a36;
		color: #fff1cc;
		font-size: 0.82rem;
	}

	.table {
		display: grid;
		grid-template-columns: 15.5rem minmax(0, 1fr) 12rem;
		gap: 1rem;
		align-items: start;
	}

	.panel {
		border: 1px solid rgba(255, 255, 255, 0.11);
		border-radius: 1rem;
		background: rgba(10, 21, 24, 0.78);
		box-shadow: 0 0.8rem 2rem rgba(0, 0, 0, 0.18);
		backdrop-filter: blur(12px);
	}

	.players,
	.market {
		padding: 1rem;
	}

	.section-label {
		margin: 0 0 0.55rem;
		color: #adc0bd;
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.player-row {
		gap: 0.65rem;
		margin-top: 0.45rem;
		border: 1px solid transparent;
		border-radius: 0.75rem;
		padding: 0.62rem;
		background: rgba(255, 255, 255, 0.035);
	}

	.player-row.active {
		border-color: rgba(234, 210, 153, 0.45);
		background: rgba(234, 210, 153, 0.09);
	}

	.player-token {
		display: grid;
		width: 1.8rem;
		height: 1.8rem;
		flex: 0 0 auto;
		place-items: center;
		border: 2px solid rgba(255, 255, 255, 0.75);
		border-radius: 50%;
		color: white;
		font-size: 0.72rem;
		font-weight: 900;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
	}

	.player-name {
		min-width: 0;
		flex: 1;
	}

	.player-name strong,
	.player-name span,
	.player-stats strong,
	.player-stats span {
		display: block;
	}

	.player-name strong {
		overflow: hidden;
		font-size: 0.82rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.player-name span,
	.player-stats span {
		color: #8fa4a2;
		font-size: 0.65rem;
	}

	.player-stats {
		text-align: right;
	}

	.player-stats strong {
		font-size: 0.95rem;
	}

	.history {
		margin-top: 1.2rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		padding-top: 1rem;
	}

	.board-wrap {
		position: relative;
		min-width: 0;
	}

	.claim-panel {
		position: absolute;
		left: 50%;
		bottom: 1rem;
		display: flex;
		width: min(94%, 42rem);
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		transform: translateX(-50%);
		border: 1px solid rgba(255, 244, 206, 0.45);
		border-radius: 0.9rem;
		padding: 0.8rem 1rem;
		background: rgba(21, 31, 31, 0.96);
		box-shadow: 0 0.8rem 2rem rgba(0, 0, 0, 0.36);
		animation: panel-arrive 180ms ease-out;
	}

	.claim-panel strong,
	.claim-panel span {
		display: block;
	}

	.claim-panel span {
		margin-top: 0.2rem;
		color: #aabbb8;
		font-size: 0.72rem;
	}

	.claim-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.45rem;
	}

	.card-swatch {
		min-width: 5.6rem;
		border: 2px solid rgba(255, 255, 255, 0.6);
		border-radius: 0.6rem;
		padding: 0.45rem 0.6rem;
		color: white;
		cursor: pointer;
		text-align: left;
		text-shadow: 0 1px 2px #000;
	}

	.card-swatch span {
		margin: 0;
		color: inherit;
		font-size: 0.58rem;
	}

	.claim-error {
		max-width: 15rem;
		margin: 0;
		color: #ffb8ae;
		font-size: 0.72rem;
	}

	button.quiet {
		border: 0;
		padding: 0.5rem;
		background: transparent;
		color: #b8c5c3;
		cursor: pointer;
	}

	.face-up {
		display: grid;
		gap: 0.55rem;
		margin: 1rem 0;
	}

	.train-card {
		position: relative;
		display: flex;
		height: 4.2rem;
		align-items: end;
		justify-content: space-between;
		overflow: hidden;
		border: 3px solid rgba(247, 238, 211, 0.75);
		border-radius: 0.7rem;
		padding: 0.55rem;
		box-shadow:
			inset 0 0 0 1px rgba(37, 30, 23, 0.5),
			0 0.3rem 0.7rem rgba(0, 0, 0, 0.22);
		color: white;
		cursor: pointer;
		font-size: 0.65rem;
		text-shadow: 0 1px 3px #000;
		transition:
			transform 120ms ease,
			filter 120ms ease;
		animation: card-arrive 180ms ease-out;
	}

	.train-card:not(:disabled):hover {
		transform: translateY(-2px) rotate(-1deg);
		filter: brightness(1.12);
	}

	button:focus-visible {
		outline: 3px solid #f2d879;
		outline-offset: 2px;
	}

	button:disabled {
		cursor: not-allowed;
		filter: grayscale(0.45) brightness(0.66);
	}

	.rails,
	.mini-rails {
		position: absolute;
		inset: 0.55rem 0.45rem 1.45rem;
		border: 3px solid rgba(255, 255, 255, 0.58);
		border-right-width: 10px;
		border-left-width: 10px;
		border-radius: 45% 45% 28% 28%;
		background: repeating-linear-gradient(90deg, transparent 0 12%, rgba(255, 255, 255, 0.38) 12% 19%);
		transform: perspective(2rem) rotateX(-8deg);
	}

	.deck {
		width: 100%;
		gap: 0.7rem;
		border: 0;
		border-radius: 0.7rem;
		padding: 0.6rem;
		background: rgba(255, 255, 255, 0.07);
		color: #f7f1df;
		cursor: pointer;
		text-align: left;
	}

	.deck-card {
		width: 2.35rem;
		height: 3.2rem;
		border: 3px double #e5cf96;
		border-radius: 0.3rem;
		background: repeating-linear-gradient(45deg, #963d35 0 5px, #752d2a 5px 10px);
		box-shadow: 3px 3px 0 #46342b;
	}

	.deck strong,
	.deck small {
		display: block;
	}

	.deck small {
		margin-top: 0.2rem;
		color: #98aaa8;
	}

	.destination-deck {
		width: 100%;
		gap: 0.7rem;
		margin-top: 0.55rem;
		border: 1px solid rgba(220, 195, 139, 0.28);
		border-radius: 0.7rem;
		padding: 0.6rem;
		background: rgba(217, 183, 113, 0.08);
		color: #f7f1df;
		cursor: pointer;
		text-align: left;
	}

	.ticket-stack {
		display: grid;
		width: 2.35rem;
		height: 3.2rem;
		flex: 0 0 auto;
		place-items: center;
		border: 2px solid #d4ba7e;
		border-radius: 0.3rem;
		background: linear-gradient(135deg, #e2cc99, #b79255);
		box-shadow: 3px 3px 0 #5f4931;
		color: #794435;
		font-size: 1.2rem;
	}

	.destination-deck strong,
	.destination-deck small {
		display: block;
	}

	.destination-deck small {
		margin-top: 0.2rem;
		color: #98aaa8;
	}

	.hand-panel {
		margin-top: 1rem;
		padding: 1rem;
	}

	.hand-heading {
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}

	.hand-summary {
		gap: 1rem;
		color: #9fb1af;
		font-size: 0.76rem;
	}

	.hand-summary strong {
		color: #f7f1df;
		font-size: 1rem;
	}

	.hand-content {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(15rem, 28rem);
		gap: 1rem;
	}

	.hand-cards {
		display: grid;
		grid-template-columns: repeat(9, minmax(3.6rem, 1fr));
		gap: 0.45rem;
	}

	.hand-card {
		position: relative;
		display: flex;
		height: 5.4rem;
		align-items: flex-end;
		overflow: hidden;
		border: 2px solid rgba(255, 255, 255, 0.62);
		border-radius: 0.55rem;
		padding: 0.45rem;
		box-shadow: inset 0 0 0 1px rgba(21, 18, 14, 0.45);
		color: white;
		font-size: 0.62rem;
		text-shadow: 0 1px 2px black;
		animation: card-arrive 180ms ease-out;
	}

	.hand-card.empty {
		opacity: 0.25;
	}

	.card-count {
		position: absolute;
		top: 0.3rem;
		right: 0.35rem;
		z-index: 1;
		display: grid;
		width: 1.35rem;
		height: 1.35rem;
		place-items: center;
		border-radius: 50%;
		background: rgba(18, 20, 21, 0.82);
		font-size: 0.72rem;
		font-weight: 900;
	}

	.mini-rails {
		inset: 1.45rem 0.35rem 1.35rem;
		border-width: 2px 7px;
	}

	.red {
		background: linear-gradient(145deg, #dc554d, #8b2c2a);
	}
	.orange {
		background: linear-gradient(145deg, #e48b3e, #9a4b21);
	}
	.yellow {
		background: linear-gradient(145deg, #e5c842, #9b791e);
	}
	.green {
		background: linear-gradient(145deg, #54a36a, #28623c);
	}
	.blue {
		background: linear-gradient(145deg, #4d91c7, #285a84);
	}
	.purple {
		background: linear-gradient(145deg, #a271ad, #674373);
	}
	.black {
		background: linear-gradient(145deg, #5b6067, #25282c);
	}
	.white {
		background: linear-gradient(145deg, #f4f0e1, #b7ad98);
		color: #29251e;
		text-shadow: none;
	}
	.locomotive {
		background: conic-gradient(from 30deg, #c94b44, #dfae35, #4a9562, #3c7eaf, #9662a0, #c94b44);
	}

	.tickets {
		display: flex;
		gap: 0.55rem;
		overflow-x: auto;
	}

	.ticket {
		display: grid;
		min-width: 9.5rem;
		grid-template-columns: 2.1rem 1fr;
		align-items: center;
		gap: 0.5rem;
		border: 1px solid #866b3d;
		border-radius: 0.55rem;
		padding: 0.55rem;
		background: linear-gradient(135deg, #ead7a7, #c6a66d);
		color: #39291a;
	}

	.ticket > span {
		display: grid;
		width: 2rem;
		height: 2rem;
		place-items: center;
		border: 2px solid #8c3f34;
		border-radius: 50%;
		color: #8c3029;
		font-family: Georgia, serif;
		font-size: 1rem;
		font-weight: 900;
	}

	.ticket strong,
	.ticket small {
		display: block;
	}

	.ticket strong {
		font-size: 0.68rem;
	}

	.ticket small {
		font-size: 0.61rem;
	}

	.muted {
		color: #91a3a1;
		font-size: 0.75rem;
	}

	.debug {
		margin-top: 1rem;
		padding: 0.8rem 1rem;
	}

	.debug summary {
		cursor: pointer;
		font-weight: 700;
	}

	.debug pre {
		max-height: 20rem;
		overflow: auto;
		color: #c9d4d1;
		font-size: 0.7rem;
	}

	.modal-backdrop {
		position: fixed;
		z-index: 20;
		inset: 0;
		display: grid;
		place-items: center;
		padding: 1.25rem;
		background: rgba(5, 12, 14, 0.8);
		backdrop-filter: blur(8px);
	}

	.ticket-modal {
		width: min(100%, 54rem);
		border: 1px solid rgba(233, 211, 157, 0.5);
		border-radius: 1.3rem;
		padding: 1.5rem;
		background: #18292b;
		box-shadow: 0 2rem 5rem rgba(0, 0, 0, 0.55);
		color: #f7f1df;
	}

	.ticket-offers {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.8rem;
		margin: 1.5rem 0;
	}

	.ticket-offers button {
		position: relative;
		display: flex;
		min-height: 12rem;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border: 3px solid #8b7145;
		border-radius: 0.85rem;
		padding: 1rem;
		background:
			linear-gradient(rgba(238, 217, 171, 0.82), rgba(205, 175, 117, 0.86)),
			repeating-linear-gradient(25deg, #ddd 0 1px, transparent 1px 12px);
		box-shadow: inset 0 0 0 2px #ead29d;
		color: #39281a;
		cursor: pointer;
		transition:
			transform 150ms ease,
			box-shadow 150ms ease,
			border-color 150ms ease;
	}

	.ticket-offers button.selected {
		border-color: #f4da7c;
		box-shadow:
			inset 0 0 0 2px #9d3a30,
			0 0 0 3px #f4da7c,
			0 0 1.5rem rgba(244, 218, 124, 0.34);
		transform: translateY(-4px);
	}

	.ticket-offers strong {
		font-family: Georgia, serif;
		font-size: 1.1rem;
	}

	.ticket-offers small {
		margin: 0.25rem 0;
		color: #785c34;
	}

	.ticket-map {
		position: absolute;
		top: -1.6rem;
		right: -1rem;
		color: rgba(130, 96, 50, 0.22);
		font-size: 8rem;
	}

	.ticket-points {
		margin-top: 1.2rem;
		border-radius: 999px;
		padding: 0.3rem 0.65rem;
		background: #963a31;
		color: #fff4d5;
		font-size: 0.75rem;
		font-weight: 800;
	}

	.selected-state {
		position: absolute;
		top: 0.65rem;
		left: 0.65rem;
		z-index: 1;
		border-radius: 999px;
		padding: 0.25rem 0.5rem;
		background: #963a31;
		color: #fff4d5;
		font-size: 0.65rem;
		font-weight: 800;
	}

	.modal-footer {
		justify-content: space-between;
		gap: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.12);
		padding-top: 1rem;
		color: #a9bab7;
		font-size: 0.8rem;
	}

	button.primary {
		border: 1px solid #f0d58e;
		border-radius: 0.65rem;
		padding: 0.72rem 1rem;
		background: #a84238;
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
		color: #fff5da;
		cursor: pointer;
		font-weight: 800;
	}

	.results-backdrop {
		overflow-y: auto;
		place-items: start center;
	}

	.results-modal {
		width: min(100%, 68rem);
		margin-block: auto;
		border: 1px solid rgba(233, 211, 157, 0.52);
		border-radius: 1.3rem;
		padding: clamp(1rem, 3vw, 2rem);
		background: radial-gradient(circle at 50% 0, rgba(190, 132, 60, 0.2), transparent 24rem), #142629;
		box-shadow: 0 2rem 5rem rgba(0, 0, 0, 0.55);
		color: #f7f1df;
	}

	.results-heading {
		max-width: 42rem;
		margin: 0 auto 1.5rem;
		text-align: center;
	}

	.results-heading h1 {
		margin: 0;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: clamp(2.2rem, 6vw, 4.1rem);
		font-weight: 500;
		line-height: 1;
	}

	.results-heading > p:last-child {
		margin: 0.85rem auto 0;
		color: #adbfbc;
		font-size: 0.9rem;
		line-height: 1.55;
	}

	.standings {
		display: grid;
		gap: 0.7rem;
	}

	.result-card {
		border: 1px solid rgba(255, 255, 255, 0.11);
		border-radius: 0.9rem;
		padding: 0.8rem 1rem;
		background: rgba(4, 14, 17, 0.46);
	}

	.result-card.winner {
		border-color: rgba(236, 200, 105, 0.65);
		background: rgba(86, 62, 24, 0.35);
		box-shadow: 0 0 1.3rem rgba(236, 200, 105, 0.1);
	}

	.result-card.viewer-result {
		box-shadow: inset 3px 0 #e2b64e;
	}

	.result-summary {
		display: grid;
		grid-template-columns: 1.5rem 2.15rem minmax(8rem, 1fr) auto;
		align-items: center;
		gap: 0.65rem;
	}

	.rank {
		color: #8fa3a0;
		font-family: Georgia, serif;
		font-size: 1rem;
		font-weight: 800;
		text-align: center;
	}

	.result-token {
		width: 2.15rem;
		height: 2.15rem;
	}

	.result-name strong,
	.result-name span,
	.score-total strong,
	.score-total span {
		display: block;
	}

	.result-name span,
	.score-total span {
		color: #94a7a4;
		font-size: 0.65rem;
	}

	.score-total {
		min-width: 4.3rem;
		text-align: right;
	}

	.score-total strong {
		font-family: Georgia, serif;
		font-size: 1.65rem;
		line-height: 1;
	}

	.score-breakdown {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
		margin-top: 0.7rem;
		padding-left: 5.1rem;
	}

	.score-breakdown span {
		color: #9fb0ad;
	}

	.score-breakdown strong {
		color: #9ed8a8;
		font-size: 0.8rem;
	}

	.ticket-results {
		margin: 0.65rem 0 0 5.1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		padding-top: 0.55rem;
	}

	.ticket-results summary {
		color: #a9bbb8;
		cursor: pointer;
		font-size: 0.7rem;
		font-weight: 700;
	}

	.ticket-result-list {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.35rem;
		margin-top: 0.5rem;
	}

	.ticket-result {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		border-radius: 0.4rem;
		padding: 0.4rem 0.55rem;
		background: rgba(255, 255, 255, 0.04);
		font-size: 0.67rem;
	}

	.ticket-result.complete strong {
		color: #9ed8a8;
	}

	.ticket-result.failed strong {
		color: #ff9c91;
	}

	.results-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-top: 1.25rem;
		border-top: 1px solid rgba(255, 255, 255, 0.12);
		padding-top: 1rem;
		color: #94a7a4;
		font-size: 0.7rem;
	}

	@keyframes panel-arrive {
		from {
			opacity: 0;
			transform: translate(-50%, 0.5rem);
		}
	}

	@keyframes card-arrive {
		from {
			opacity: 0.35;
			transform: translateY(-0.35rem);
		}
	}

	@media (max-width: 1180px) {
		.table {
			grid-template-columns: 13rem minmax(0, 1fr);
		}

		.market {
			grid-column: 1 / -1;
			display: grid;
			grid-template-columns: auto 1fr 10rem 11rem;
			align-items: center;
			gap: 1rem;
		}

		.destination-deck {
			margin-top: 0;
		}

		.face-up {
			grid-template-columns: repeat(5, 1fr);
			margin: 0;
		}
	}

	@media (max-width: 860px) {
		.game-shell {
			padding: 0.7rem;
		}

		.game-feedback {
			align-items: stretch;
			flex-direction: column;
		}

		.topbar {
			grid-template-columns: 1fr auto;
		}

		.turn-status {
			grid-column: 1 / -1;
			grid-row: 2;
			justify-self: stretch;
		}

		.table {
			grid-template-columns: 1fr;
		}

		.board-wrap {
			grid-row: 1;
			overflow-x: auto;
		}

		.board-wrap :global(.board) {
			min-width: 48rem;
		}

		.players {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
			gap: 0.45rem;
		}

		.market {
			grid-template-columns: 1fr;
		}

		.destination-deck {
			margin-top: 0.55rem;
		}

		.face-up {
			grid-template-columns: repeat(5, minmax(5.5rem, 1fr));
			overflow-x: auto;
		}

		.hand-content {
			grid-template-columns: 1fr;
		}

		.hand-cards {
			grid-template-columns: repeat(9, 4.5rem);
			overflow-x: auto;
		}

		.claim-panel {
			position: fixed;
			z-index: 10;
			bottom: 1rem;
			flex-direction: column;
			align-items: stretch;
		}

		.results-modal {
			margin-block: 0;
		}

		.score-breakdown {
			padding-left: 0;
		}

		.ticket-results {
			margin-left: 0;
		}
	}

	@media (max-width: 600px) {
		.players {
			grid-template-columns: 1fr;
		}

		.ticket-offers {
			grid-template-columns: 1fr;
			max-height: 60vh;
			overflow-y: auto;
		}

		.ticket-offers button {
			min-height: 8rem;
		}

		.result-summary {
			grid-template-columns: 1.2rem 2rem minmax(0, 1fr) auto;
		}

		.score-breakdown,
		.ticket-result-list {
			grid-template-columns: 1fr;
		}

		.results-footer {
			align-items: stretch;
			flex-direction: column;
		}

		.modal-footer {
			align-items: stretch;
			flex-direction: column;
		}

		.claim-actions {
			flex-wrap: wrap;
			justify-content: flex-start;
		}

		.claim-panel {
			bottom: 0.5rem;
			width: calc(100% - 1rem);
			max-height: min(50vh, 20rem);
			overflow-y: auto;
		}
	}

	.game-shell {
		position: relative;
		isolation: isolate;
		width: 100%;
		height: 100svh;
		min-height: 0;
		overflow: hidden;
		padding: 0;
		background: #2f5d63;
		color: #f7f1df;
	}

	.board-stage {
		position: absolute;
		z-index: 0;
		inset: 0;
		display: grid;
		min-width: 0;
		place-items: center;
		background: #547d82;
		transition:
			right 240ms cubic-bezier(0.2, 0.8, 0.2, 1),
			filter 240ms ease;
	}

	.drawer-open .board-stage {
		right: clamp(20rem, 29vw, 23rem);
		filter: saturate(0.88) brightness(0.88);
	}

	.board-stage :global(.board-frame) {
		display: grid;
		width: 100%;
		height: 100%;
		place-items: center;
	}

	.board-stage :global(.board) {
		width: 100%;
		height: 100%;
		border: 0;
		border-radius: 0;
		box-shadow: none;
	}

	.board-stage :global(.board-help) {
		position: absolute;
		bottom: 3.35rem;
		left: 50%;
		z-index: 2;
		margin: 0;
		transform: translateX(-50%);
		color: rgba(255, 249, 229, 0.82);
		font-size: 0.62rem;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
		white-space: nowrap;
	}

	.game-controls {
		position: absolute;
		top: 0.55rem;
		left: 50%;
		z-index: 7;
		display: flex;
		align-items: center;
		gap: 0.55rem;
		transform: translateX(-50%);
		border: 1px solid rgba(255, 244, 210, 0.4);
		border-radius: 999px;
		padding: 0.3rem 0.65rem 0.3rem 0.3rem;
		background: rgba(13, 34, 38, 0.76);
		box-shadow: 0 0.4rem 1.2rem rgba(0, 0, 0, 0.25);
		backdrop-filter: blur(9px);
	}

	.debug-mode .game-controls {
		display: none;
	}

	.game-controls .brand-mark {
		width: 2rem;
		height: 2rem;
		border-width: 1px;
		font-size: 1rem;
	}

	.game-controls strong,
	.game-controls span {
		display: block;
	}

	.game-controls strong {
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 0.78rem;
	}

	.game-controls div > span {
		color: #c4d4d0;
		font-size: 0.55rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.players {
		position: absolute;
		top: 4.2rem;
		bottom: 4.9rem;
		left: 0.45rem;
		z-index: 6;
		display: flex;
		width: clamp(7.75rem, 11.5vw, 9rem);
		flex-direction: column;
		gap: 0.42rem;
		padding: 0;
		pointer-events: none;
	}

	.players .player-row {
		position: relative;
		display: grid;
		min-height: 4.4rem;
		grid-template-columns: 1.7rem minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.4rem;
		margin: 0;
		border: 1px solid rgba(255, 255, 255, 0.45);
		border-left: 0.35rem solid var(--player-color);
		border-radius: 0 0.55rem 0.55rem 0;
		padding: 0.45rem 0.45rem 0.45rem 0.35rem;
		background: linear-gradient(100deg, color-mix(in srgb, var(--player-color) 68%, #172125), rgba(12, 24, 27, 0.88));
		box-shadow: 0 0.35rem 0.9rem rgba(0, 0, 0, 0.26);
		color: white;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
		transition:
			transform 180ms ease,
			filter 180ms ease;
	}

	.players .player-row.active {
		transform: translateX(0.35rem);
		border-color: #fff0b6;
		filter: brightness(1.13);
		box-shadow:
			0 0 0 2px rgba(255, 231, 145, 0.28),
			0 0.45rem 1.1rem rgba(0, 0, 0, 0.32);
	}

	.players .viewer-player {
		order: 99;
		margin-top: auto;
	}

	.players .player-token,
	.result-token {
		width: 1.7rem;
		height: 1.7rem;
		background: var(--player-color);
		font-size: 0.68rem;
	}

	.players .player-name strong,
	.players .player-name span,
	.players .player-stats strong,
	.players .player-stats span {
		display: block;
	}

	.players .player-name strong {
		overflow: hidden;
		font-size: 0.7rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.players .player-name span,
	.players .player-stats span {
		color: rgba(255, 255, 255, 0.78);
		font-size: 0.52rem;
	}

	.players .player-stats strong {
		font-family: Georgia, serif;
		font-size: 1rem;
	}

	.market {
		position: absolute;
		top: 0.45rem;
		right: 0.45rem;
		bottom: 0.45rem;
		z-index: 7;
		display: flex;
		width: clamp(5.6rem, 8.8vw, 6.8rem);
		flex-direction: column;
		gap: 0.45rem;
		padding: 0;
		transition:
			transform 220ms ease,
			opacity 180ms ease;
	}

	.drawer-open .market {
		transform: translateX(120%);
		opacity: 0;
		pointer-events: none;
	}

	.market .destination-deck,
	.market .deck {
		position: relative;
		display: grid;
		width: 100%;
		min-height: 4rem;
		flex: 0 0 auto;
		place-items: center;
		gap: 0;
		margin: 0;
		border: 2px solid rgba(241, 215, 154, 0.82);
		border-radius: 0.45rem;
		padding: 0.35rem;
		background: rgba(16, 34, 37, 0.9);
		box-shadow: 0 0.35rem 1rem rgba(0, 0, 0, 0.3);
		color: #fff4d8;
		text-align: center;
	}

	.market .destination-deck {
		min-height: 4.5rem;
		background: linear-gradient(150deg, rgba(220, 196, 143, 0.98), rgba(150, 110, 62, 0.98));
	}

	.market .ticket-stack {
		width: 3.2rem;
		height: 2.35rem;
		border-width: 1px;
		box-shadow: 2px 2px 0 rgba(61, 42, 25, 0.75);
		font-size: 0.6rem;
		font-weight: 900;
		letter-spacing: 0.08em;
	}

	.market button small {
		position: absolute;
		right: 0.25rem;
		bottom: 0.18rem;
		border-radius: 999px;
		padding: 0.12rem 0.3rem;
		background: rgba(4, 11, 13, 0.76);
		color: white;
		font-size: 0.56rem;
		font-weight: 800;
	}

	.market .face-up {
		display: grid;
		min-height: 0;
		flex: 1 1 auto;
		grid-template-rows: repeat(5, minmax(0, 1fr));
		gap: 0.42rem;
		margin: 0;
	}

	.market .train-card {
		display: flex;
		width: 100%;
		height: 100%;
		min-height: 3.8rem;
		align-items: end;
		border-width: 2px;
		border-radius: 0.5rem;
		padding: 0.38rem;
		font-size: 0.56rem;
		animation: card-deal 220ms cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
	}

	.market .train-card:nth-child(2) {
		animation-delay: 35ms;
	}
	.market .train-card:nth-child(3) {
		animation-delay: 70ms;
	}
	.market .train-card:nth-child(4) {
		animation-delay: 105ms;
	}
	.market .train-card:nth-child(5) {
		animation-delay: 140ms;
	}

	.market .rails {
		inset: 0.45rem 0.35rem 1.15rem;
		border-width: 2px 7px;
	}

	.market .deck-card {
		width: 2.6rem;
		height: 3.35rem;
	}

	.turn-banner {
		position: absolute;
		bottom: 0;
		left: 50%;
		z-index: 9;
		display: flex;
		width: min(52vw, 42rem);
		min-height: 2.65rem;
		align-items: center;
		justify-content: center;
		gap: 0.55rem;
		transform: translateX(-50%);
		border: 1px solid rgba(255, 255, 255, 0.62);
		border-bottom: 0;
		border-radius: 0.8rem 0.8rem 0 0;
		padding: 0.45rem 1rem;
		background: rgba(245, 241, 228, 0.9);
		box-shadow: 0 -0.35rem 1.1rem rgba(0, 0, 0, 0.22);
		color: #24373a;
		animation: turn-banner-in 220ms ease-out;
	}

	.turn-banner.your-turn {
		background: rgba(255, 250, 228, 0.95);
		box-shadow: 0 -0.35rem 1.3rem rgba(241, 209, 112, 0.34);
	}

	.turn-banner .turn-light {
		width: 0.68rem;
		height: 0.68rem;
	}

	.turn-banner strong {
		font-family: Georgia, serif;
		font-size: clamp(0.8rem, 1.25vw, 1rem);
	}

	.turn-banner > span:last-child {
		color: #5d6f70;
		font-size: 0.62rem;
		text-transform: uppercase;
	}

	.game-feedback {
		position: absolute;
		top: 3.45rem;
		left: 50%;
		z-index: 6;
		display: block;
		width: min(40vw, 25rem);
		margin: 0;
		transform: translateX(-50%);
	}

	.game-feedback .latest-move,
	.game-feedback .final-round-alert {
		display: grid;
		min-width: 0;
		grid-template-columns: auto 1fr;
		align-items: baseline;
		gap: 0.45rem;
		border: 1px solid rgba(255, 255, 255, 0.24);
		border-radius: 999px;
		padding: 0.38rem 0.75rem;
		background: rgba(7, 24, 28, 0.78);
		box-shadow: 0 0.35rem 1rem rgba(0, 0, 0, 0.24);
		backdrop-filter: blur(8px);
		animation: toast-in 220ms ease-out;
	}

	.game-feedback strong {
		font-size: 0.6rem;
		text-transform: uppercase;
	}

	.game-feedback span {
		overflow: hidden;
		color: #d7e2df;
		font-size: 0.62rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ticket-hand {
		position: absolute;
		bottom: 0.8rem;
		left: 0.45rem;
		z-index: 8;
		width: clamp(8rem, 13vw, 10rem);
		height: 7.8rem;
		pointer-events: none;
	}

	.ticket-hand .ticket {
		position: absolute;
		bottom: calc(var(--ticket-index) * 1.15rem);
		left: 0;
		width: 100%;
		min-width: 0;
		grid-template-columns: 1.7rem minmax(0, 1fr);
		padding: 0.4rem;
		box-shadow: 0 0.3rem 0.75rem rgba(0, 0, 0, 0.3);
	}

	.ticket-hand .ticket > span {
		width: 1.6rem;
		height: 1.6rem;
		font-size: 0.76rem;
	}

	.ticket-hand .ticket strong,
	.ticket-hand .ticket small {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.hand-panel {
		position: absolute;
		bottom: 2.45rem;
		left: 50%;
		z-index: 8;
		width: min(33vw, 26rem);
		height: 7.7rem;
		margin: 0;
		transform: translateX(-50%);
		padding: 0;
		background: transparent;
		box-shadow: none;
		pointer-events: none;
	}

	.hand-panel .hand-cards {
		display: flex;
		width: 100%;
		height: 100%;
		align-items: end;
		justify-content: center;
		gap: 0;
		overflow: visible;
	}

	.hand-panel .hand-card {
		width: 4.8rem;
		height: 6.7rem;
		flex: 0 0 4.8rem;
		margin-left: -1.15rem;
		transform: translateY(calc(var(--card-index) * 0.05rem)) rotate(calc((var(--card-index) - 4) * 1.5deg));
		transform-origin: 50% 110%;
		box-shadow: 0 0.4rem 0.85rem rgba(0, 0, 0, 0.35);
		animation: hand-deal 280ms cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
		animation-delay: calc(var(--card-index) * 28ms);
	}

	.hand-panel .hand-card:first-child {
		margin-left: 0;
	}

	.hand-panel .hand-card.empty {
		display: none;
	}

	.hand-panel .card-count {
		top: 0.3rem;
		right: 0.3rem;
		width: 1.45rem;
		height: 1.45rem;
		background: #f7ead0;
		box-shadow: 0 0.15rem 0.35rem rgba(0, 0, 0, 0.35);
		color: #263438;
		text-shadow: none;
		animation: count-pop 180ms ease-out;
	}

	.decision-drawer {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 20;
		display: flex;
		width: clamp(20rem, 29vw, 23rem);
		flex-direction: column;
		overflow: hidden;
		border-left: 1px solid rgba(237, 211, 150, 0.62);
		padding: 1.25rem;
		background: linear-gradient(180deg, rgba(38, 66, 70, 0.98), rgba(12, 29, 33, 0.99)), #14272a;
		box-shadow: -1rem 0 2.4rem rgba(0, 0, 0, 0.4);
		color: #f7f1df;
		animation: drawer-in 240ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.drawer-heading {
		flex: 0 0 auto;
		border-bottom: 1px solid rgba(255, 255, 255, 0.13);
		padding-bottom: 1rem;
	}

	.drawer-heading h1 {
		margin: 0;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: clamp(1.6rem, 2.6vw, 2.35rem);
		font-weight: 500;
		line-height: 1.02;
	}

	.drawer-heading > p:last-child {
		margin: 0.65rem 0 0;
		color: #b2c4c0;
		font-size: 0.76rem;
		line-height: 1.5;
	}

	.decision-drawer .ticket-offers {
		display: grid;
		min-height: 0;
		flex: 1 1 auto;
		grid-template-columns: 1fr;
		align-content: start;
		gap: 0.7rem;
		overflow-y: auto;
		margin: 1rem -0.15rem;
		padding: 0.15rem;
	}

	.decision-drawer .ticket-offers button {
		display: grid;
		width: 100%;
		min-height: 5.5rem;
		grid-template-columns: 2.8rem minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.7rem;
		border: 2px solid #8b7145;
		border-radius: 0.65rem;
		padding: 0.75rem;
		background:
			linear-gradient(rgba(238, 217, 171, 0.91), rgba(205, 175, 117, 0.93)),
			repeating-linear-gradient(25deg, #ddd 0 1px, transparent 1px 12px);
		box-shadow: inset 0 0 0 1px #ead29d;
		color: #39281a;
		text-align: left;
		transition:
			transform 150ms ease,
			box-shadow 150ms ease,
			border-color 150ms ease;
	}

	.decision-drawer .ticket-offers button:hover,
	.decision-drawer .ticket-offers button.previewed {
		transform: translateX(-0.25rem);
		border-color: #f3d87b;
		box-shadow:
			inset 0 0 0 1px #9d3a30,
			0 0 0 2px rgba(243, 216, 123, 0.5);
	}

	.decision-drawer .ticket-offers button.selected {
		border-color: #fff0a1;
		background:
			linear-gradient(rgba(248, 227, 174, 0.96), rgba(218, 187, 124, 0.97)),
			repeating-linear-gradient(25deg, #ddd 0 1px, transparent 1px 12px);
		box-shadow:
			inset 0 0 0 2px #9d3a30,
			0 0 0 2px #f4da7c;
	}

	.decision-drawer .ticket-points {
		display: grid;
		width: 2.7rem;
		height: 2.7rem;
		place-items: center;
		margin: 0;
		border-radius: 50%;
		background: #963a31;
		color: #fff4d5;
		font-family: Georgia, serif;
		font-size: 1rem;
		font-weight: 900;
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
		margin-top: 0.2rem;
		color: #72562f;
		font-size: 0.72rem;
	}

	.decision-drawer .selected-state {
		position: static;
		border-radius: 999px;
		padding: 0.25rem 0.42rem;
		background: rgba(70, 49, 27, 0.14);
		color: #6d3a2d;
		font-size: 0.58rem;
	}

	.drawer-footer {
		display: flex;
		flex: 0 0 auto;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		border-top: 1px solid rgba(255, 255, 255, 0.13);
		padding-top: 1rem;
		color: #aebfbc;
		font-size: 0.68rem;
	}

	.claim-actions {
		display: grid;
		min-height: 0;
		flex: 1 1 auto;
		align-content: start;
		gap: 0.65rem;
		overflow-y: auto;
		margin-block: 1rem;
	}

	.claim-actions .card-swatch {
		position: relative;
		display: grid;
		width: 100%;
		min-height: 5.5rem;
		grid-template-columns: 4rem minmax(0, 1fr);
		align-items: center;
		gap: 0.8rem;
		border-radius: 0.7rem;
		padding: 0.65rem;
	}

	.claim-actions .card-swatch .mini-rails {
		position: relative;
		inset: auto;
		width: 4rem;
		height: 3rem;
		grid-row: 1 / 3;
	}

	.claim-actions .card-swatch strong,
	.claim-actions .card-swatch small {
		display: block;
	}

	.claim-actions .card-swatch small {
		color: inherit;
		font-size: 0.65rem;
		opacity: 0.86;
	}

	.results-drawer {
		overflow-y: auto;
	}

	.results-drawer .standings {
		margin-block: 1rem;
	}

	.results-drawer .result-card {
		padding: 0.65rem;
	}

	.results-drawer .result-summary {
		grid-template-columns: 1.2rem 1.8rem minmax(0, 1fr) auto;
		gap: 0.45rem;
	}

	.results-drawer .score-breakdown {
		display: flex;
		gap: 0.35rem;
		margin-top: 0.55rem;
		padding-left: 0;
	}

	.results-drawer .score-breakdown > span {
		flex: 1;
		border-radius: 0.35rem;
		padding: 0.35rem;
		background: rgba(255, 255, 255, 0.05);
		font-size: 0.58rem;
	}

	.results-drawer .ticket-results {
		margin-left: 0;
	}

	.debug {
		position: absolute;
		right: 7.8rem;
		bottom: 0.55rem;
		z-index: 12;
		width: auto;
		margin: 0;
		border-radius: 0.45rem;
		padding: 0.35rem 0.5rem;
		background: rgba(6, 17, 21, 0.82);
		font-size: 0.62rem;
	}

	.debug pre {
		width: min(38rem, 70vw);
		max-height: 50vh;
	}

	@keyframes drawer-in {
		from {
			transform: translateX(100%);
			opacity: 0.5;
		}
	}

	@keyframes toast-in {
		from {
			transform: translateY(-0.45rem);
			opacity: 0;
		}
	}

	@keyframes turn-banner-in {
		from {
			transform: translate(-50%, 0.7rem);
			opacity: 0;
		}
	}

	@keyframes card-deal {
		from {
			transform: translateX(0.7rem) rotate(2deg);
			opacity: 0;
		}
	}

	@keyframes hand-deal {
		from {
			transform: translateY(1.5rem) rotate(0);
			opacity: 0;
		}
	}

	@keyframes count-pop {
		from {
			transform: scale(0.65);
		}
	}

	@media (max-width: 900px) {
		.drawer-open .board-stage {
			right: 0;
			bottom: min(42svh, 26rem);
		}

		.game-controls {
			top: 0.4rem;
		}

		.players {
			top: 3.35rem;
			right: 0.35rem;
			bottom: auto;
			left: 0.35rem;
			width: auto;
			height: auto;
			flex-direction: row;
			overflow-x: auto;
		}

		.players .player-row {
			width: 7.4rem;
			min-height: 3.4rem;
			flex: 0 0 7.4rem;
			grid-template-columns: 1.35rem minmax(0, 1fr) auto;
			border-left-width: 0.25rem;
		}

		.players .viewer-player {
			order: 0;
			margin-top: 0;
		}

		.players .player-token {
			width: 1.35rem;
			height: 1.35rem;
		}

		.market {
			top: auto;
			right: 0.35rem;
			bottom: 2.9rem;
			left: 0.35rem;
			display: grid;
			width: auto;
			height: 4.1rem;
			grid-template-columns: 3.6rem minmax(0, 1fr) 3.6rem;
		}

		.market .destination-deck,
		.market .deck {
			min-height: 0;
			height: 4.1rem;
		}

		.market .ticket-stack,
		.market .deck-card {
			width: 2rem;
			height: 2.7rem;
		}

		.market .face-up {
			display: grid;
			grid-template-columns: repeat(5, minmax(3.25rem, 1fr));
			grid-template-rows: 1fr;
		}

		.market .train-card {
			min-height: 0;
			height: 4.1rem;
		}

		.hand-panel {
			bottom: 6.55rem;
			width: min(80vw, 22rem);
			height: 5.8rem;
		}

		.hand-panel .hand-card {
			width: 4rem;
			height: 5.2rem;
			flex-basis: 4rem;
		}

		.ticket-hand {
			display: none;
		}

		.turn-banner {
			width: 100%;
			border-radius: 0;
		}

		.game-feedback {
			top: 7.2rem;
			width: min(86vw, 25rem);
		}

		.decision-drawer {
			top: auto;
			left: 0;
			width: 100%;
			height: min(42svh, 26rem);
			border-top: 1px solid rgba(237, 211, 150, 0.62);
			border-left: 0;
			padding: 0.9rem;
			animation-name: sheet-in;
		}

		.drawer-heading {
			padding-bottom: 0.55rem;
		}

		.drawer-heading h1 {
			font-size: 1.4rem;
		}

		.decision-drawer .ticket-offers {
			grid-template-columns: repeat(3, minmax(11rem, 1fr));
			overflow-x: auto;
			overflow-y: hidden;
			margin-block: 0.6rem;
		}

		.decision-drawer .ticket-offers button {
			min-height: 4.6rem;
		}

		.drawer-footer {
			padding-top: 0.55rem;
		}

		.drawer-open .market,
		.drawer-open .hand-panel,
		.drawer-open .ticket-hand,
		.drawer-open .turn-banner,
		.drawer-open .game-feedback {
			opacity: 0;
			pointer-events: none;
		}
	}

	@media (max-width: 560px) {
		.game-controls div,
		.board-stage :global(.board-help) {
			display: none;
		}

		.game-controls {
			left: 0.4rem;
			transform: none;
			padding-right: 0.3rem;
		}

		.players {
			top: 2.9rem;
		}

		.players .player-name span,
		.players .player-stats span {
			display: none;
		}

		.players .player-row {
			width: 5.7rem;
			min-height: 2.8rem;
			flex-basis: 5.7rem;
		}

		.game-feedback {
			display: none;
		}

		.hand-panel {
			bottom: 6.65rem;
		}

		.turn-banner > span:last-child {
			display: none;
		}

		.decision-drawer .ticket-offers {
			grid-template-columns: repeat(3, 10rem);
		}

		.decision-drawer .ticket-offers button {
			grid-template-columns: 2.3rem minmax(0, 1fr);
		}

		.decision-drawer .selected-state {
			display: none;
		}
	}

	@keyframes sheet-in {
		from {
			transform: translateY(100%);
			opacity: 0.5;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.game-shell *,
		.game-shell *::before,
		.game-shell *::after,
		.modal-backdrop *,
		.modal-backdrop *::before,
		.modal-backdrop *::after {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.01ms !important;
		}
	}
</style>
