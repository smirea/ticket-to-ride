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
		height: 100svh;
		overflow: hidden;
		background: #07151b;
	}

	nav,
	.controls,
	label {
		display: flex;
		align-items: center;
	}

	nav {
		position: fixed;
		top: 0.45rem;
		left: 0.45rem;
		z-index: 40;
		justify-content: space-between;
		gap: 0.55rem;
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

	@media (max-width: 720px) {
		nav {
			left: 0.45rem;
			right: 0.45rem;
			align-items: flex-start;
			border-radius: 0.8rem;
		}

		.controls {
			flex-wrap: wrap;
		}

		nav > a,
		nav label {
			display: none;
		}
	}
</style>
