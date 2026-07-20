<script lang="ts">
	import GameScreen from '$lib/game/GameScreen.svelte';
	import {
		applyGameAction,
		createDebugClaimScenario,
		createDebugFinalRoundScenario,
		createDebugFinalScenario,
		createDebugTicketScenario,
		createGame,
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

	function loadScenario(next: GameState) {
		game = next;
		viewerId = 'player';
		error = '';
	}
</script>

<svelte:head>
	<title>Game Debugger — Railbound</title>
</svelte:head>

<div class="debug-page">
	<nav aria-label="Debug controls">
		<a href="/">← Home</a>
		<div class="controls">
			<label>
				Viewer
				<select bind:value={viewerId}>
					{#each game.players as player}
						<option value={player.id}>{player.name}</option>
					{/each}
				</select>
			</label>
			<button type="button" onclick={resetClaimScenario}>Claim scenario</button>
			<button type="button" onclick={() => loadScenario(createDebugTicketScenario())}>Ticket draw</button>
			<button type="button" onclick={() => loadScenario(createDebugFinalRoundScenario())}>Final round</button>
			<button type="button" onclick={() => loadScenario(createDebugFinalScenario())}>Results</button>
			<button type="button" onclick={resetSetupScenario}>Setup scenario</button>
		</div>
		{#if error}<p role="alert">{error}</p>{/if}
	</nav>
	<GameScreen state={game} {viewerId} {send} onrestart={resetSetupScenario} debug />
</div>

<style>
	.debug-page {
		min-height: 100vh;
		background: #07151b;
	}

	nav,
	.controls,
	label {
		display: flex;
		align-items: center;
	}

	nav {
		justify-content: space-between;
		gap: 1rem;
		border-bottom: 1px solid rgb(255 255 255 / 0.1);
		padding: 0.55rem 1rem;
		background: #081116;
		color: #dce6e3;
		font-size: 0.76rem;
		font-weight: 700;
	}

	.controls,
	label {
		gap: 0.5rem;
	}

	nav a {
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
		border-radius: 0.25rem;
		padding: 0.35rem 0.55rem;
		background: #14232a;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}

	@media (max-width: 720px) {
		nav {
			align-items: flex-start;
			flex-direction: column;
		}

		.controls {
			flex-wrap: wrap;
		}
	}
</style>
