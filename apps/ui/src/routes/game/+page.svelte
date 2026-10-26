<script lang="ts">
	import { afterNavigate, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import GameScreen from '$lib/game/GameScreen.svelte';
	import GameText from '$lib/game/GameText.svelte';
	import {
		applyGameAction,
		chooseBotAction,
		createGame,
		restoreGameState,
		type GameAction,
		type GameState,
	} from '@repo/shared';
	import { onDestroy } from 'svelte';

	type PageData = { name: string; mapId: string; bots: number; startFresh: boolean };
	let { data }: { data: PageData } = $props();

	const savedGameKey = 'ticket-to-ride:single-player:v1';
	let error = $state('');
	// Loaded before GameScreen mounts: the board and market treat the first state they see as already on the table.
	let game = $state<GameState>(loadSavedGame());
	let botSpeed = $state(1);
	let gameIdle = false;
	let botTimer: ReturnType<typeof setTimeout> | undefined;

	function loadSavedGame() {
		try {
			const saved = data.startFresh ? null : localStorage.getItem(savedGameKey);
			if (saved) return restoreGameState(JSON.parse(saved));
		} catch {
			error = 'Your saved game could not be loaded. A new journey is ready.';
		}
		return createConfiguredGame(`single-player-${Date.now()}`, data.mapId, data.bots);
	}

	afterNavigate(async ({ complete }) => {
		await complete;
		if (data.startFresh && page.url.searchParams.has('new')) {
			const url = new URL(window.location.href);
			url.searchParams.delete('new');
			replaceState(url, page.state);
		}
	});

	onDestroy(() => clearTimeout(botTimer));

	$effect(() => {
		try {
			localStorage.setItem(savedGameKey, JSON.stringify(game));
		} catch {
			error = 'This browser could not save your journey. Keep this tab open to continue playing.';
		}
	});

	function send(action: GameAction) {
		const result = applyGameAction(game, action);
		if (!result.ok) {
			error = result.error;
			return false;
		}

		error = '';
		game = result.state;
		scheduleBotAction();
		return true;
	}

	function restart() {
		clearTimeout(botTimer);
		error = '';
		// Restart keeps the table of the game on screen, which may be a resumed save rather than the URL's choice.
		game = createConfiguredGame(`single-player-${Date.now()}`, game.mapId, game.players.length - 1);
		scheduleBotAction();
	}

	function setIdle(idle: boolean) {
		gameIdle = idle;
		scheduleBotAction();
	}

	function scheduleBotAction() {
		clearTimeout(botTimer);
		if (!gameIdle || !chooseBotAction(game)) return;

		botTimer = setTimeout(() => {
			const action = chooseBotAction(game);
			if (!action) return;
			const result = applyGameAction(game, action);
			if (!result.ok) {
				error = result.error;
				return;
			}
			game = result.state;
			scheduleBotAction();
		}, [900, 450, 160][botSpeed]);
	}

	function createConfiguredGame(seed: string, mapId: string, botCount: number) {
		return createGame({ seed, mapId, humanName: data.name, botCount });
	}
</script>

<svelte:head>
	<title>Single Player — Ticket to Travel</title>
</svelte:head>

<div class="game-page">
	<GameScreen
		state={game}
		viewerId="player"
		{send}
		onrestart={restart}
		ongamespeedchange={speed => (botSpeed = speed)}
		onidlechange={setIdle}
	/>
	{#if error}<p class="game-message error" role="alert"><GameText text={error} /></p>{/if}
</div>

<style>
	.game-page {
		min-height: 100svh;
		background: #f4eee2;
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
