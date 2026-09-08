<script lang="ts">
	import GameScreen from '$lib/game/GameScreen.svelte';
	import {
		applyGameAction,
		createDebugClaimScenario,
		createDebugFinalRoundScenario,
		createDebugFinalScenario,
		createDebugTicketScenario,
		createGame,
		USA_TICKETS,
		USA_ROUTES,
		TRAIN_CARDS,
		type GameAction,
		type GameState,
	} from '@repo/shared';

	let game = $state<GameState>(createDebugClaimScenario());
	let viewerId = $state('player');
	let error = $state('');

	function send(action: GameAction) {
		const result = applyGameAction(game, action);
		if (!result.ok) {
			error = result.error;
			return;
		}
		error = '';
		game = result.state;
	}

	function resetClaimScenario() {
		game = createDebugClaimScenario();
		viewerId = 'player';
		error = '';
	}

	function resetSetupScenario() {
		game = createGame({ seed: 'debug-setup', humanName: 'Debug player', botCount: 1 });
		viewerId = 'player';
		error = '';
	}

	function loadFullTable() {
		let next = createGame({ seed: 'full-table-layout', humanName: 'You', botCount: 4 });
		while (next.phase.type === 'ticket-selection') {
			const result = applyGameAction(next, { type: 'keep-tickets', ticketIds: next.phase.ticketIds.slice(0, 2) });
			if (!result.ok) break;
			next = result.state;
		}
		next.players[0].tickets = USA_TICKETS.slice(0, 12).map(ticket => ticket.id);
		next.destinationDeck = next.destinationDeck.filter(id => !next.players.some(player => player.tickets.includes(id)));
		for (const color of TRAIN_CARDS) next.players[0].hand[color] = color === 'locomotive' ? 2 : 4;
		loadScenario(next);
	}

	function loadMarketReset() {
		const next = createDebugClaimScenario();
		next.faceUpTrainCards = ['locomotive', 'red', 'locomotive', 'blue', 'black'];
		next.trainDeck.push('locomotive');
		loadScenario(next);
	}

	function loadStampScenario() {
		const next = createDebugClaimScenario();
		next.players[0].tickets = ['portland-phoenix'];
		for (const [a, b] of [
			['portland', 'san-francisco'],
			['los-angeles', 'phoenix'],
		]) {
			const route = USA_ROUTES.find(
				route => (route.cityA === a && route.cityB === b) || (route.cityA === b && route.cityB === a),
			)!;
			next.claimedRoutes[route.id] = 'player';
		}
		next.players[0].trains = 37;
		next.players[0].score = 14;
		loadScenario(next);
	}

	function loadAtlasScenario() {
		const next = createDebugClaimScenario();
		next.players[0].tickets = ['portland-phoenix', 'chicago-santa-fe'];
		next.players[0].hand = {
			red: 4,
			orange: 0,
			yellow: 2,
			green: 0,
			blue: 3,
			purple: 0,
			black: 0,
			white: 0,
			locomotive: 1,
		};
		next.players[0].score = 24;
		next.players[0].trains = 32;
		next.players[1].score = 18;
		next.players[1].trains = 35;
		next.faceUpTrainCards = ['blue', 'white', 'red', 'locomotive', 'black'];
		loadScenario(next);
	}

	function loadScenario(next: GameState) {
		game = next;
		viewerId = 'player';
		error = '';
	}
</script>

<svelte:head>
	<title>Game Debugger — Ticket to Travel</title>
</svelte:head>

<div class="debug-page">
	<details class="debug-toolbar">
		<summary>Debug</summary>
		<nav aria-label="Debug controls">
			<a href="/">Home</a>
			<div class="controls">
				<label>
					Viewer
					<select bind:value={viewerId}>
						{#each game.players as player}
							<option value={player.id}>{player.name}</option>
						{/each}
					</select>
				</label>
				<button type="button" onclick={loadAtlasScenario}>Atlas preview</button>
				<button type="button" onclick={loadFullTable}>Full table</button>
				<button type="button" onclick={resetClaimScenario}>Claim scenario</button>
				<button type="button" onclick={loadStampScenario}>Ticket stamp</button>
				<button type="button" onclick={loadMarketReset}>Market reset</button>
				<button type="button" onclick={() => loadScenario(createDebugTicketScenario())}>Ticket draw</button>
				<button type="button" onclick={() => loadScenario(createDebugFinalRoundScenario())}>Final round</button>
				<button type="button" onclick={() => loadScenario(createDebugFinalScenario())}>Results</button>
				<button type="button" onclick={resetSetupScenario}>Setup scenario</button>
			</div>
			{#if error}<p role="alert">{error}</p>{/if}
		</nav>
	</details>
	<GameScreen state={game} {viewerId} {send} onrestart={resetSetupScenario} debug />
</div>

<style>
	.debug-page {
		min-height: 100svh;
		background: #07151b;
	}

	.debug-toolbar,
	nav,
	.controls,
	label {
		display: flex;
		align-items: center;
	}

	.debug-toolbar {
		position: fixed;
		top: 0.35rem;
		left: 50%;
		z-index: 40;
		transform: translateX(-50%);
	}

	.debug-toolbar summary {
		list-style: none;
		border: 1px solid rgb(255 255 255 / 0.18);
		border-radius: 999px;
		padding: 0.25rem 0.55rem;
		background: rgb(8 17 22 / 0.72);
		color: #dce6e3;
		font-size: 0.6rem;
		font-weight: 800;
		cursor: pointer;
		text-align: center;
	}

	.debug-toolbar[open] {
		align-items: center;
		flex-direction: column;
	}

	nav {
		justify-content: space-between;
		gap: 0.55rem;
		margin-top: 0.3rem;
		border: 1px solid rgb(255 255 255 / 0.16);
		border-radius: 999px;
		padding: 0.3rem 0.4rem;
		background: rgb(8 17 22 / 0.86);
		box-shadow: 0 0.65rem 1.6rem rgb(0 0 0 / 0.24);
		backdrop-filter: blur(12px);
		color: #dce6e3;
		font-size: 0.68rem;
		font-weight: 700;
	}

	.controls,
	label {
		gap: 0.5rem;
	}

	nav a {
		padding-inline: 0.35rem;
		color: inherit;
		text-decoration: none;
	}

	nav p {
		margin: 0;
		color: #ffb5a8;
	}

	button,
	select {
		border: 1px solid rgb(255 255 255 / 0.2);
		border-radius: 999px;
		padding: 0.3rem 0.55rem;
		background: #14232a;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}
</style>
