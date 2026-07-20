<script lang="ts">
	import GameScreen from '$lib/game/GameScreen.svelte';
	import {
		applyGameAction,
		chooseBotAction,
		createGame,
		restoreGameState,
		type GameAction,
		type GameState,
	} from '@repo/shared';
	import { onDestroy, onMount } from 'svelte';

	type PageData = { name: string; bots: number; startFresh: boolean };
	let { data }: { data: PageData } = $props();

	const savedGameKey = 'ticket-to-ride:single-player:v1';
	let game = $state<GameState>(createConfiguredGame('single-player-usa'));
	let error = $state('');
	let loaded = $state(false);
	let saveStatus = $state('Loading save…');
	let botMoving = $state(false);
	let botTimer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		const saved = localStorage.getItem(savedGameKey);
		if (saved && !data.startFresh) {
			try {
				game = restoreGameState(JSON.parse(saved));
			} catch {
				localStorage.removeItem(savedGameKey);
			}
		}
		loaded = true;
		saveStatus = 'Saved locally';
		scheduleBotAction();
	});

	onDestroy(() => clearTimeout(botTimer));

	$effect(() => {
		if (typeof localStorage === 'undefined' || !loaded) return;
		localStorage.setItem(savedGameKey, JSON.stringify(game));
		saveStatus = 'Saved locally';
	});

	function send(action: GameAction) {
		const result = applyGameAction(game, action);
		if (!result.ok) {
			error = result.error;
			return;
		}

		error = '';
		game = result.state;
		scheduleBotAction();
	}

	function restart() {
		clearTimeout(botTimer);
		botMoving = false;
		error = '';
		game = createConfiguredGame(`single-player-${Date.now()}`);
	}

	function scheduleBotAction() {
		clearTimeout(botTimer);
		const player = game.players[game.currentPlayerIndex];
		if (!player?.isBot || game.phase.type === 'game-over') {
			botMoving = false;
			return;
		}

		botMoving = true;
		botTimer = setTimeout(() => {
			const action = chooseBotAction(game);
			if (!action) {
				botMoving = false;
				return;
			}
			const result = applyGameAction(game, action);
			if (!result.ok) {
				error = result.error;
				botMoving = false;
				return;
			}
			game = result.state;
			scheduleBotAction();
		}, 450);
	}

	function createConfiguredGame(seed: string) {
		return createGame({ seed, humanName: data.name, botCount: data.bots });
	}
</script>

<svelte:head>
	<title>Single Player — Railbound</title>
</svelte:head>

<div class="game-page">
	<nav class="game-controls" aria-label="Game controls">
		<a href="/">Home</a>
		{#if error}<p role="alert">{error}</p>{/if}
		<span>{botMoving ? 'Rival thinking…' : saveStatus}</span>
		<button type="button" onclick={restart}>New game</button>
	</nav>
	<GameScreen state={game} viewerId="player" {send} onrestart={restart} />
</div>

<style>
	.game-page {
		height: 100svh;
		overflow: hidden;
		background: #07151b;
	}

	.game-controls {
		position: fixed;
		top: 0.65rem;
		left: 0.65rem;
		z-index: 30;
		display: flex;
		align-items: center;
		gap: 0.55rem;
		border: 1px solid rgb(247 231 193 / 0.28);
		border-radius: 999px;
		padding: 0.35rem;
		background: rgb(6 17 21 / 0.84);
		box-shadow: 0 0.65rem 1.6rem rgb(0 0 0 / 0.24);
		backdrop-filter: blur(12px);
		color: #dce6e3;
		font-size: 0.7rem;
		font-weight: 700;
	}

	.game-controls a,
	.game-controls button {
		border: 1px solid rgb(255 255 255 / 0.14);
		border-radius: 999px;
		padding: 0.42rem 0.7rem;
		background: rgb(255 255 255 / 0.06);
		color: #dce6e3;
		text-decoration: none;
	}

	.game-controls p {
		margin: 0;
		max-width: 24rem;
		padding-inline: 0.45rem;
		color: #ffb5a8;
	}

	.game-controls span {
		padding-inline: 0.4rem;
		color: #7f9692;
		font-weight: 500;
	}

	.game-controls button {
		cursor: pointer;
	}

	.game-controls a:hover,
	.game-controls button:hover {
		background: rgb(255 255 255 / 0.12);
	}

	@media (max-width: 700px) {
		.game-controls {
			right: 0.65rem;
			justify-content: space-between;
		}

		.game-controls span {
			display: none;
		}
	}
</style>
