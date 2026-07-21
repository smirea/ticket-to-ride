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
	let botSpeed = $state(1);
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
		scheduleBotAction();
	});

	onDestroy(() => clearTimeout(botTimer));

	$effect(() => {
		if (typeof localStorage === 'undefined' || !loaded) return;
		localStorage.setItem(savedGameKey, JSON.stringify(game));
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
		error = '';
		game = createConfiguredGame(`single-player-${Date.now()}`);
	}

	function scheduleBotAction() {
		clearTimeout(botTimer);
		const player = game.players[game.currentPlayerIndex];
		if (!player?.isBot || game.phase.type === 'game-over') {
			return;
		}

		botTimer = setTimeout(() => {
			const action = chooseBotAction(game);
			if (!action) {
				return;
			}
			const result = applyGameAction(game, action);
			if (!result.ok) {
				error = result.error;
				return;
			}
			game = result.state;
			scheduleBotAction();
		}, [900, 450, 160][botSpeed]);
	}

	function createConfiguredGame(seed: string) {
		return createGame({ seed, humanName: data.name, botCount: data.bots });
	}
</script>

<svelte:head>
	<title>Single Player — Railbound</title>
</svelte:head>

<div class="game-page">
	<GameScreen
		state={game}
		viewerId="player"
		{send}
		onrestart={restart}
		ongamespeedchange={speed => (botSpeed = speed)}
	/>
	{#if error}<p class="game-message error" role="alert">{error}</p>{/if}
</div>

<style>
	.game-page {
		height: 100svh;
		overflow: hidden;
		background: #07151b;
	}

	.game-message {
		position: fixed;
		top: 0.6rem;
		left: 50%;
		z-index: 30;
		margin: 0;
		transform: translateX(-50%);
		border: 1px solid rgb(247 231 193 / 0.28);
		border-radius: 999px;
		padding: 0.35rem 0.7rem;
		background: rgb(6 17 21 / 0.84);
		box-shadow: 0 0.65rem 1.6rem rgb(0 0 0 / 0.24);
		backdrop-filter: blur(12px);
		color: #d7e6e1;
		font-size: 0.62rem;
		font-weight: 700;
		pointer-events: none;
	}

	.game-message.error {
		border-color: rgb(255 148 128 / 0.45);
		color: #ffc1b5;
	}
</style>
