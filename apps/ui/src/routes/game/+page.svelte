<script lang="ts">
	import GameScreen from '$lib/game/GameScreen.svelte';
	import { applyGameAction, createGame, playBotTurns, type GameAction, type GameState } from '@repo/shared';

	let game = $state<GameState>(createGame({ seed: 'single-player-usa', humanName: 'You', botCount: 1 }));
	let error = $state('');

	function send(action: GameAction) {
		const result = applyGameAction(game, action);
		if (!result.ok) {
			error = result.error;
			return;
		}

		error = '';
		game = playBotTurns(result.state);
	}

	function restart() {
		error = '';
		game = createGame({ seed: `single-player-${Date.now()}`, humanName: 'You', botCount: 1 });
	}
</script>

<svelte:head>
	<title>Single Player — Railbound</title>
</svelte:head>

<div class="game-page">
	<nav aria-label="Game controls">
		<a href="/">← Home</a>
		{#if error}<p role="alert">{error}</p>{/if}
		<button type="button" onclick={restart}>New game</button>
	</nav>
	<GameScreen state={game} viewerId="player" {send} />
</div>

<style>
	.game-page {
		min-height: 100vh;
		background: #07151b;
	}

	nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		border-bottom: 1px solid rgb(255 255 255 / 0.1);
		padding: 0.55rem 1rem;
		background: #081116;
		color: #dce6e3;
		font-size: 0.78rem;
		font-weight: 700;
	}

	nav a {
		color: #dce6e3;
		text-decoration: none;
	}

	nav p {
		margin: 0;
		color: #ffb5a8;
	}

	nav button {
		border: 1px solid rgb(255 255 255 / 0.2);
		border-radius: 0.25rem;
		padding: 0.35rem 0.65rem;
		background: transparent;
		color: inherit;
		cursor: pointer;
	}
</style>
