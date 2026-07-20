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
	<nav aria-label="Game controls">
		<a href="/">← Home</a>
		{#if error}<p role="alert">{error}</p>{/if}
		<span>{botMoving ? 'Rival thinking…' : saveStatus}</span>
		<button type="button" onclick={restart}>New game</button>
	</nav>
	<GameScreen state={game} viewerId="player" {send} onrestart={restart} />
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

	nav span {
		margin-left: auto;
		color: #7f9692;
		font-weight: 500;
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
