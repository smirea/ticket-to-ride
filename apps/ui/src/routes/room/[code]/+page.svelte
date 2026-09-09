<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Brand from '$lib/game/Brand.svelte';
	import GameScreen from '$lib/game/GameScreen.svelte';
	import { playerPortraitAssets } from '$lib/game/assets';
	import { fly } from 'svelte/transition';
	import {
		abandonRoom,
		getClientId,
		getRoom,
		leaveRoom as leaveRoomRequest,
		loadPlayerProfile,
		normalizeRoomCode,
		preserveDebugId,
		roomEventsUrl,
		savePlayerProfile,
		setRoomReady,
		startRoom,
		submitRoomAction,
		updateRoomSettings,
	} from '$lib/multiplayer-client';
	import { type GameAction, type RoomEvent, type RoomPlayer, type RoomSettings, type RoomState } from '@repo/shared';
	import { onMount } from 'svelte';

	type ConnectionStatus = 'connecting' | 'live' | 'retrying' | 'offline' | 'closed';
	type PendingCommand = 'ready' | 'settings' | 'start' | 'leave' | 'abandon' | 'action' | null;
	type ClientIdentity = { clientId: string };
	const reconnectingNotice = 'Reconnecting to the room…';

	const roomCode = normalizeRoomCode(page.params.code);

	let identity = $state<ClientIdentity | null>(null);
	let lobbyHref = $state('/lobby');
	let room = $state<RoomState | null>(null);
	let connection = $state<ConnectionStatus>('connecting');
	let pending = $state<PendingCommand>(null);
	let error = $state('');
	let notice = $state('');
	let settingsMaxPlayers = $state<number>(5);
	let settingsSeed = $state('');
	let copied = $state(false);
	let slowAction = $state(false);
	let eventSource: EventSource | null = null;
	let disposed = false;

	const viewer = $derived(identity && room ? room.players.find(player => player.id === identity?.clientId) : undefined);
	const activePlayers = $derived(room?.players.filter(player => player.status === 'active') ?? []);
	const isHost = $derived(Boolean(identity && room?.hostId === identity.clientId));
	const allReady = $derived(activePlayers.length >= 2 && activePlayers.every(player => player.ready));
	const canStart = $derived(Boolean(room?.phase === 'lobby' && isHost && allReady && !pending));
	const game = $derived(room?.game ?? null);

	onMount(() => {
		disposed = false;
		lobbyHref = preserveDebugId('/lobby');
		identity = { clientId: getClientId() };

		const handleOnline = () => {
			if (connection === 'offline' || connection === 'retrying') reconnect();
		};
		const handleOffline = () => (connection = 'offline');
		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);
		void initializeRoom();

		return () => {
			disposed = true;
			eventSource?.close();
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	});

	async function initializeRoom() {
		connection = navigator.onLine ? 'connecting' : 'offline';
		try {
			applySnapshot(await getRoom(roomCode));
			connectEvents();
		} catch (cause) {
			connection = navigator.onLine ? 'retrying' : 'offline';
			error = messageFrom(cause);
		}
	}

	function connectEvents() {
		if (!identity || disposed) return;
		eventSource?.close();
		connection = navigator.onLine ? 'connecting' : 'offline';
		const source = new EventSource(roomEventsUrl(roomCode));
		eventSource = source;

		source.onopen = () => {
			if (eventSource !== source) return;
			connection = 'live';
			error = '';
			if (notice === reconnectingNotice) notice = '';
		};
		source.onerror = () => {
			if (eventSource !== source || connection === 'closed') return;
			connection = navigator.onLine ? 'retrying' : 'offline';
		};
		source.addEventListener('snapshot', rawEvent => {
			const event = parseRoomEvent(rawEvent);
			if (event?.type !== 'snapshot') return;
			applySnapshot(event.room);
			connection = 'live';
			error = '';
			if (notice === reconnectingNotice) notice = '';
		});
		source.addEventListener('closed', rawEvent => {
			const event = parseRoomEvent(rawEvent);
			if (event?.type !== 'closed') return;
			connection = 'closed';
			notice = 'This room has closed.';
			source.close();
		});
	}

	function parseRoomEvent(event: Event): RoomEvent | null {
		if (!(event instanceof MessageEvent) || typeof event.data !== 'string') return null;
		try {
			return JSON.parse(event.data) as RoomEvent;
		} catch {
			return null;
		}
	}

	function applySnapshot(nextRoom: RoomState) {
		if (room && nextRoom.revision < room.revision) return;
		const wasReady = viewer?.ready;
		room = nextRoom;
		if (
			wasReady &&
			nextRoom.phase === 'lobby' &&
			!nextRoom.players.find(player => player.id === identity?.clientId)?.ready
		)
			notice = 'The table changed. Please ready up again.';
		const roomProfile = identity ? nextRoom.players.find(player => player.id === identity?.clientId) : undefined;
		const savedProfile = loadPlayerProfile();
		if (roomProfile && (savedProfile?.name !== roomProfile.name || savedProfile.color !== roomProfile.color)) {
			savePlayerProfile({ name: roomProfile.name, color: roomProfile.color });
		}
		if (pending !== 'settings') {
			settingsMaxPlayers = nextRoom.settings.maxPlayers;
			settingsSeed = nextRoom.settings.seed;
		}
	}

	$effect(() => {
		slowAction = false;
		if (pending !== 'action') return;
		const timer = setTimeout(() => (slowAction = true), 700);
		return () => clearTimeout(timer);
	});
	async function copyCode() {
		try {
			await navigator.clipboard.writeText(roomCode);
			copied = true;
		} catch {
			notice = 'Select the room code to copy it.';
		}
	}
	function reconnect() {
		if (!identity) return;
		error = '';
		notice = reconnectingNotice;
		eventSource?.close();
		void initializeRoom();
	}

	async function runCommand(
		command: Exclude<PendingCommand, 'action' | null>,
		operation: () => Promise<RoomState | null>,
	): Promise<RoomState | null | undefined> {
		if (!identity || pending) return undefined;
		pending = command;
		error = '';
		notice = '';
		try {
			const nextRoom = await operation();
			if (nextRoom) applySnapshot(nextRoom);
			return nextRoom;
		} catch (cause) {
			error = messageFrom(cause);
			return undefined;
		} finally {
			pending = null;
		}
	}

	async function toggleReady() {
		if (!viewer) return;
		const nextReady = !viewer.ready;
		await runCommand('ready', () => setRoomReady(roomCode, nextReady));
		notice = '';
	}

	async function saveSettings(event: SubmitEvent) {
		event.preventDefault();
		const maxPlayers = settingsMaxPlayers as RoomSettings['maxPlayers'];
		const next = await runCommand('settings', () => updateRoomSettings(roomCode, { maxPlayers, seed: settingsSeed }));
		if (next) {
			settingsMaxPlayers = next.settings.maxPlayers;
			settingsSeed = next.settings.seed;
			notice = 'Room settings saved. Everyone must ready up again.';
		}
	}

	async function startGame() {
		const next = await runCommand('start', () => startRoom(roomCode));
		if (next) notice = 'The game has started.';
	}

	async function leaveRoom() {
		const next = await runCommand('leave', () => leaveRoomRequest(roomCode));
		if (next !== undefined) await goto(lobbyHref);
	}

	async function abandonGame() {
		if (!window.confirm('Abandon this live game for every player? This cannot be undone.')) return;
		const next = await runCommand('abandon', () => abandonRoom(roomCode));
		if (next) notice = 'The game was abandoned.';
	}

	function send(action: GameAction) {
		return submitAction(action);
	}

	async function submitAction(action: GameAction) {
		if (!identity || pending) return false;
		pending = 'action';
		error = '';
		notice = 'Submitting move…';
		const actionId = crypto.randomUUID();
		try {
			const response = await submitRoomAction(roomCode, action, actionId);
			applySnapshot(response.room);
			notice = '';
			return true;
		} catch (cause) {
			error = messageFrom(cause);
			notice = '';
			return false;
		} finally {
			pending = null;
		}
	}

	function messageFrom(cause: unknown): string {
		return cause instanceof Error ? cause.message : 'The room request failed.';
	}

	function playerColor(player: RoomPlayer): string {
		return `var(--room-player-${player.color})`;
	}

	function connectionLabel(): string {
		if (connection === 'live') return 'Live';
		if (connection === 'connecting') return 'Connecting';
		if (connection === 'retrying') return 'Reconnecting';
		if (connection === 'offline') return 'Offline';
		return 'Closed';
	}
</script>

<svelte:head>
	<title>Room {roomCode} — Ticket to Travel</title>
</svelte:head>

{#if (room?.phase === 'playing' || room?.finishedReason === 'game-over') && game && identity}
	<div class="live-room">
		<details class="game-room-menu">
			<summary aria-label={`Room ${room.code} controls — ${connectionLabel()}`}>
				<i class:live={connection === 'live'} class:warning={connection !== 'live'}></i>
				<span aria-hidden="true">•••</span>
			</summary>
			<div class="game-room-popover">
				<div class="room-title">
					<span>Room</span>
					<strong>{room.code}</strong>
				</div>
				<div
					class="connection"
					class:live={connection === 'live'}
					class:warning={connection !== 'live'}
					role="status"
					aria-live="polite"
				>
					<i></i>
					<span>{connectionLabel()}</span>
				</div>
				<div class="game-room-actions">
					<a href={lobbyHref}>Lobby</a>
					{#if connection !== 'live'}
						<button type="button" class="small-button" onclick={reconnect}>Reconnect</button>
					{/if}
					{#if room.phase === 'playing'}
						<button type="button" class="danger-link" disabled={Boolean(pending)} onclick={abandonGame}
							>Abandon game</button
						>
					{:else}
						<button type="button" class="small-button" disabled={Boolean(pending)} onclick={leaveRoom}
							>Leave room</button
						>
					{/if}
				</div>
			</div>
		</details>
		{#if error || slowAction || connection !== 'live'}
			<div
				class:error={Boolean(error)}
				class="game-message"
				role="status"
				aria-live="polite"
				transition:fly={{ y: -8, duration: 180 }}
			>
				{error ||
					(pending === 'action'
						? 'Sending your move…'
						: connection === 'closed'
							? notice || 'This room has closed.'
							: `${connectionLabel()}…`)}
			</div>
		{/if}
		<GameScreen state={game} viewerId={identity.clientId} {send} />
	</div>
{:else}
	<main class="room-page">
		<nav>
			<Brand compact href={preserveDebugId('/')} />
			<a class="lobby-link" href={lobbyHref}>← Lobby</a>
			<div
				class="connection"
				class:live={connection === 'live'}
				class:warning={connection !== 'live'}
				role="status"
				aria-live="polite"
			>
				<i></i>
				<span>{connectionLabel()}</span>
			</div>
		</nav>

		{#if !room}
			<section class="loading-card">
				<div class="signal" class:warning={connection !== 'connecting'} aria-hidden="true"></div>
				<p>{connection === 'connecting' ? 'Joining room' : 'Room unavailable'}</p>
				<h1>{roomCode}</h1>
				<span>{error || 'Preparing your table…'}</span>
				<div class="loading-actions">
					<button type="button" onclick={reconnect} disabled={!identity}>Try again</button>
					<a href={lobbyHref}>Return to lobby</a>
				</div>
			</section>
		{:else if room.phase === 'lobby'}
			<header class="room-heading">
				<div>
					<p>Your table</p>
					<h1>{room.code}</h1>
					<button class="copy-code" onclick={copyCode}>{copied ? 'Copied' : 'Copy room code'}</button>
				</div>
				<div class="occupancy">
					<strong>{activePlayers.length}/{room.settings.maxPlayers}</strong>
					<span>players</span>
				</div>
			</header>

			{#if error || notice}
				<div class:error={Boolean(error)} class="room-message" role="status" aria-live="polite">
					{error || notice}
				</div>
			{/if}

			<section class="lobby-grid">
				<div class="roster panel">
					<div class="panel-heading">
						<div>
							<h2>Fellow travelers</h2>
						</div>
						<span>{activePlayers.filter(player => player.ready).length} ready</span>
					</div>

					<div class="player-list">
						{#each room.players as player (player.id)}
							<article
								class:inactive={player.status !== 'active'}
								class="room-player"
								style:--traveler-color={playerColor(player)}
							>
								<img class="player-portrait" src={playerPortraitAssets[player.color]} alt="" draggable="false" />
								<div>
									<strong>{player.name}</strong>
									<span
										>{player.id === identity?.clientId ? 'You' : ''}{player.id === room.hostId
											? player.id === identity?.clientId
												? ' · Host'
												: 'Host'
											: ''}</span
									>
								</div>
								<span class:ready={player.ready} class:inactive-badge={player.status !== 'active'} class="ready-badge">
									{player.status !== 'active' ? player.status : player.ready ? 'Ready' : 'Waiting'}
								</span>
							</article>
						{/each}
						{#each Array(Math.max(0, room.settings.maxPlayers - activePlayers.length)) as _, index}
							<div class="empty-seat"><span>{activePlayers.length + index + 1}</span> An open seat</div>
						{/each}
					</div>

					<div class="ready-actions">
						<button
							type="button"
							class:ready={viewer?.ready}
							disabled={!viewer || Boolean(pending)}
							onclick={toggleReady}
						>
							{pending === 'ready' ? 'Updating…' : viewer?.ready ? 'Not ready' : 'Ready up'}
						</button>
						{#if isHost}
							<button type="button" class="start" disabled={!canStart} onclick={startGame}>
								{pending === 'start' ? 'Starting…' : 'Start game'}
							</button>
						{/if}
					</div>
					{#if isHost && !allReady}
						<p class="start-help">
							{activePlayers.length < 2 ? 'At least two players are required.' : 'Every player must be ready to start.'}
						</p>
					{/if}
				</div>

				<aside class="settings panel">
					<div class="panel-heading">
						<div>
							<h2>Classic USA</h2>
						</div>
					</div>

					{#if isHost}
						<form onsubmit={saveSettings}>
							<label>
								<span>Seats at the table</span>
								<select bind:value={settingsMaxPlayers} disabled={Boolean(pending)}>
									<option value={2}>2 players</option>
									<option value={3}>3 players</option>
									<option value={4}>4 players</option>
									<option value={5}>5 players</option>
								</select>
							</label>
							<details class="advanced-settings">
								<summary>Advanced</summary><label>
									<span>Game seed</span><input
										bind:value={settingsSeed}
										maxlength="80"
										required
										disabled={Boolean(pending)}
									/>
								</label>
							</details>
							<button type="submit" disabled={Boolean(pending) || settingsSeed.trim().length === 0}>
								{pending === 'settings' ? 'Saving…' : 'Save settings'}
							</button>
						</form>
					{:else}
						<dl>
							<div>
								<dt>Map</dt>
								<dd>Classic USA</dd>
							</div>
							<div>
								<dt>Player limit</dt>
								<dd>{room.settings.maxPlayers}</dd>
							</div>
						</dl>
						<p class="settings-help">Only the room host can change settings.</p>
					{/if}
				</aside>
			</section>

			<footer class="room-footer">
				<span>45 trains · A continent to explore</span>
				<button type="button" class="leave" disabled={Boolean(pending)} onclick={leaveRoom}>
					{pending === 'leave' ? 'Leaving…' : 'Leave room'}
				</button>
			</footer>
		{:else}
			<section class="finished-card">
				<p>Room finished</p>
				<h1>{room.finishedReason === 'abandoned' ? 'The journey was abandoned.' : 'The final whistle has blown.'}</h1>
				<span>
					{room.finishedReason === 'abandoned'
						? 'A player abandoned the active game. The room is closed and no further moves can be submitted.'
						: 'Final standings are shown on the game board.'}
				</span>
				<div class="finished-actions">
					<button type="button" disabled={Boolean(pending)} onclick={leaveRoom}>Leave finished room</button>
					<a href={lobbyHref}>Back to lobby</a>
				</div>
			</section>
		{/if}
	</main>
{/if}

<style>
	:global(html) {
		--room-player-red: #c74c43;
		--room-player-blue: #4388c6;
		--room-player-green: #4c9a65;
		--room-player-yellow: #e4b934;
		--room-player-black: #484b50;
	}
	.room-page {
		min-height: 100svh;
		padding: 1.3rem clamp(1rem, 4vw, 4rem) 2rem;
		background: radial-gradient(ellipse at 45% 35%, #fffdf5, #eee8d9);
		color: #142d3e;
	}
	.room-page > nav,
	.room-heading,
	.room-message,
	.lobby-grid,
	.room-footer {
		width: min(100%, 74rem);
		margin-inline: auto;
	}
	nav,
	.connection,
	.room-heading,
	.panel-heading,
	.room-player,
	.ready-actions,
	.room-footer,
	.finished-actions,
	.loading-actions {
		display: flex;
		align-items: center;
	}
	nav {
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 1rem;
		border-bottom: 1px solid #dcd6c7;
		padding-bottom: 1.25rem;
		margin-bottom: 2.5rem;
	}
	.lobby-link {
		margin-left: auto;
		font-size: 0.78rem;
	}
	a {
		color: inherit;
		font-weight: 700;
		text-decoration: none;
	}
	.connection {
		gap: 0.45rem;
		border: 1px solid #d9d2c4;
		border-radius: 999px;
		padding: 0.4rem 0.65rem;
		background: #fffcf5;
		color: #617079;
		font-size: 0.7rem;
		font-weight: 700;
	}
	.connection i {
		width: 0.48rem;
		height: 0.48rem;
		border-radius: 50%;
		background: #c08a39;
	}
	.connection.live i {
		background: #418764;
	}
	.connection.warning i {
		animation: pulse 1.3s ease-in-out infinite;
	}
	.room-heading {
		position: relative;
		z-index: 1;
		width: min(440px, 100%);
		margin-left: max(0px, calc((100% - 74rem) / 2 + 22px));
		margin-right: auto;
		align-items: center;
		justify-content: space-between;
		margin-bottom: -6px;
		padding: 16px 24px;
		border: 1px solid #bca77b;
		background: #f8efd7;
		box-shadow:
			inset 0 0 0 4px #fff7e5,
			1px 3px #b6a07a,
			2px 8px 13px #43311f1c;
		transform: rotate(-0.3deg);
		animation: paper-arrive 400ms ease both;
	}
	.room-heading p,
	.finished-card > p,
	.loading-card > p {
		margin: 0 0 0.6rem;
		color: #a34a3d;
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.13em;
		text-transform: uppercase;
	}
	.room-heading h1 {
		margin: 0;
		font-family: Georgia, serif;
		font-size: clamp(2.3rem, 4vw, 3.4rem);
		font-weight: 400;
		letter-spacing: 0.06em;
		line-height: 1;
	}
	.room-heading > div > span,
	.finished-card > span,
	.loading-card > span {
		display: block;
		margin-top: 0.75rem;
		color: #647077;
		line-height: 1.6;
	}
	.occupancy {
		text-align: center;
		border-left: 1px dashed #bfa779;
		padding: 20px 0 20px 24px;
	}
	.occupancy strong,
	.occupancy span {
		display: block;
	}
	.occupancy strong {
		font-family: Georgia, serif;
		font-size: 2rem;
	}
	.occupancy span {
		color: #647077;
		font-size: 0.68rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}
	.room-message,
	.game-message {
		border: 1px solid #bfcebf;
		border-radius: 0.5rem;
		padding: 0.7rem 0.9rem;
		background: #edf3e9;
		color: #3e654d;
		font-size: 0.75rem;
	}
	.room-message {
		margin-bottom: 1rem;
	}
	.room-message.error,
	.game-message.error {
		border-color: #d9b2a7;
		background: #fff1e9;
		color: #a13f31;
	}
	.lobby-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.35fr) minmax(16rem, 0.65fr);
		align-items: start;
		gap: 12px;
	}
	.panel {
		border: 1px solid #b49b72;
		border-radius: 4px 8px 3px 6px;
		padding: clamp(1rem, 3vw, 1.6rem);
		background: #f6edda;
		box-shadow:
			inset 0 0 0 3px #fff7e7,
			0 3px #b8a17b,
			4px 12px 18px #47372526;
		animation: paper-arrive 440ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
	}
	.panel-heading {
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.2rem;
	}
	.panel-heading h2 {
		margin: 0;
		font-family: Georgia, serif;
		font-size: 1.5rem;
		font-weight: 400;
	}
	.panel-heading > span {
		border-radius: 999px;
		padding: 0.35rem 0.65rem;
		background: #ede8dc;
		color: #637176;
		font-size: 0.65rem;
		font-weight: 700;
	}
	.player-list {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.7rem;
	}
	.room-player,
	.empty-seat {
		min-height: 4.2rem;
		border: 1px solid #e1dacb;
		border-radius: 0.5rem;
		padding: 0.75rem;
		background: #f8f5ed;
	}
	.room-player {
		gap: 0.7rem;
		padding: 7px 13px 7px 7px;
		border: 1px solid #9f8253;
		border-radius: 7px 3px 7px 4px;
		background: color-mix(in srgb, var(--traveler-color) 74%, #302922);
		color: #fff0d1;
		box-shadow:
			inset 0 0 0 2px #e1c99a,
			1px 3px #a68f69,
			2px 6px 9px #36291d22;
		transition: filter 200ms;
	}
	.player-portrait {
		width: 58px;
		height: 76px;
		object-fit: cover;
		border: 1px solid #ceb584;
		border-radius: 3px;
	}
	.room-player strong {
		font:
			700 22px/1.2 Georgia,
			serif;
	}
	.roster {
		transform: rotate(-0.45deg);
	}
	.settings {
		transform: rotate(0.6deg);
		margin-top: 14px;
	}
	.copy-code {
		margin-top: 10px;
		border: 0;
		border-bottom: 1px solid #a88d63;
		padding: 2px 0;
		background: none;
		color: #625e4f;
		font-size: 12px;
	}
	.advanced-settings {
		font-size: 12px;
		color: #726b5b;
	}
	.advanced-settings summary {
		cursor: pointer;
	}
	.advanced-settings label {
		margin-top: 12px;
	}
	@keyframes paper-arrive {
		from {
			opacity: 0;
			translate: 0 22px;
		}
		to {
			opacity: 1;
			translate: 0 0;
		}
	}
	.room-player.inactive {
		opacity: 0.55;
	}
	.room-player > div {
		min-width: 0;
		flex: 1;
	}
	.room-player strong,
	.room-player > div span {
		display: block;
		overflow-wrap: anywhere;
	}
	.room-player > div span {
		margin-top: 0.2rem;
		color: #efe0bb;
		font-size: 0.67rem;
	}
	.ready-badge {
		border-radius: 999px;
		padding: 0.3rem 0.5rem;
		font-size: 0.6rem;
		font-weight: 800;
		text-transform: uppercase;
	}
	.ready-badge {
		background: #f5e8c51c;
		color: #f4e6c4;
		border: 1px solid #e4cea55c;
	}
	.ready-badge.ready {
		background: #f1e7c5;
		color: #3b6444;
		transform: rotate(-4deg);
	}
	.ready-badge.inactive-badge {
		color: #976453;
	}
	.empty-seat {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		border-style: dashed;
		color: #7b827f;
		font-size: 0.75rem;
		background: transparent;
	}
	.empty-seat span {
		display: grid;
		width: 2.3rem;
		height: 2.3rem;
		place-items: center;
		border: 1px dashed #c0b9aa;
		border-radius: 50%;
	}
	.ready-actions {
		gap: 0.6rem;
		margin-top: 1.2rem;
	}
	button,
	select,
	input {
		font: inherit;
	}
	button {
		cursor: pointer;
		transition:
			transform 180ms ease,
			box-shadow 180ms ease;
	}
	button:not(:disabled):hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 10px #75613f18;
	}
	button:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}
	.ready-actions button,
	.settings button,
	.loading-actions button,
	.finished-actions button {
		min-height: 44px;
		border: 1px solid #cfc7b6;
		border-radius: 0.4rem;
		padding: 0.75rem 1rem;
		background: #f0eadd;
		color: #233d4b;
		font-weight: 750;
	}
	.ready-actions button.ready {
		border-color: #b4c9ae;
		background: #dfebd9;
		color: #3d6542;
	}
	.ready-actions button.start {
		margin-left: auto;
		border-color: #b6493d;
		background: #b6493d;
		color: white;
	}
	.start-help,
	.settings-help {
		margin: 0.75rem 0 0;
		color: #647077;
		font-size: 0.7rem;
	}
	.settings form,
	.settings label {
		display: grid;
	}
	.settings form {
		gap: 1.2rem;
	}
	.settings label {
		gap: 0.5rem;
	}
	.settings label > span,
	.settings dt {
		color: #647077;
		font-size: 0.65rem;
		font-weight: 800;
		letter-spacing: 0.07em;
		text-transform: uppercase;
	}
	.settings input,
	.settings select {
		width: 100%;
		min-height: 44px;
		border: 1px solid #cfc7b6;
		border-radius: 0.35rem;
		padding: 0.75rem;
		background: #fffef9;
		color: #142d3e;
	}
	input:focus,
	select:focus {
		outline: 2px solid #698ba3;
		outline-offset: 2px;
	}
	.settings dl {
		display: grid;
		gap: 0;
		margin: 0;
	}
	.settings dl div {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		border-bottom: 1px solid #e1dacb;
		padding: 0.8rem 0;
	}
	.settings dd {
		margin: 0;
		font-size: 0.78rem;
		text-align: right;
		word-break: break-word;
	}
	.room-footer {
		justify-content: space-between;
		gap: 1rem;
		margin-top: 1.25rem;
		border-top: 1px solid #dcd6c7;
		padding-top: 1rem;
		color: #647077;
		font-size: 0.7rem;
	}
	.leave,
	.danger-link,
	.small-button {
		min-height: 36px;
		border: 1px solid #cfc7b6;
		border-radius: 0.35rem;
		padding: 0.5rem 0.7rem;
		background: #fffcf5;
		color: #455e6a;
	}
	.leave,
	.danger-link {
		border-color: #dab8ae;
		color: #a24739;
	}
	.loading-card,
	.finished-card {
		width: min(100%, 48rem);
		margin: 8vh auto 0;
		border: 1px solid #d8d0bf;
		border-radius: 0.6rem;
		padding: clamp(2rem, 6vw, 4rem);
		background: #fffcf5;
		box-shadow: 0 12px 35px #75613f12;
		text-align: center;
	}
	.loading-card h1,
	.finished-card h1 {
		margin: 0;
		font-family: Georgia, serif;
		font-size: clamp(2rem, 6vw, 4rem);
		font-weight: 400;
	}
	.signal {
		width: 0.8rem;
		height: 0.8rem;
		margin: 0 auto 1rem;
		border-radius: 50%;
		background: #c08a39;
		animation: pulse 1.3s ease-in-out infinite;
	}
	.signal.warning {
		background: #b6493d;
	}
	.loading-actions,
	.finished-actions {
		justify-content: center;
		flex-wrap: wrap;
		gap: 1rem;
		margin-top: 1.5rem;
	}
	.live-room {
		min-height: 100svh;
		background: radial-gradient(ellipse at 45% 35%, #fffdf5, #eee8d9);
	}
	.game-room-menu {
		position: fixed;
		top: 0.75rem;
		left: 50%;
		z-index: 30;
		transform: translateX(-50%);
	}
	.game-room-menu summary {
		display: flex;
		width: 2.25rem;
		height: 2.25rem;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		border: 1px solid #d6cebd;
		border-radius: 50%;
		background: #fffcf5;
		box-shadow: 0 3px 10px #75613f1a;
		color: #142d3e;
		font-size: 0.58rem;
		letter-spacing: 0.08em;
		cursor: pointer;
		list-style: none;
	}
	.game-room-menu summary::-webkit-details-marker {
		display: none;
	}
	.game-room-menu summary > i {
		position: absolute;
		top: 0.1rem;
		right: 0.1rem;
		width: 0.5rem;
		height: 0.5rem;
		border: 1px solid #fffcf5;
		border-radius: 50%;
		background: #c08a39;
	}
	.game-room-menu summary > i.live {
		background: #418764;
	}
	.game-room-menu summary > i.warning {
		animation: pulse 1.3s ease-in-out infinite;
	}
	.game-room-popover {
		position: absolute;
		top: calc(100% + 0.5rem);
		left: 50%;
		display: grid;
		width: 16.5rem;
		gap: 0.75rem;
		border: 1px solid #d6cebd;
		border-radius: 0.6rem;
		padding: 0.9rem;
		transform: translateX(-50%);
		background: #fffcf5;
		box-shadow: 0 10px 25px #75613f26;
		color: #142d3e;
		font-size: 0.68rem;
	}
	.room-title {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}
	.room-title span {
		color: #647077;
		text-transform: uppercase;
	}
	.room-title strong {
		letter-spacing: 0.08em;
	}
	.game-room-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		border-top: 1px solid #e1dacb;
		padding-top: 0.75rem;
	}
	.game-room-actions a {
		margin-right: auto;
	}
	.game-message {
		position: fixed;
		z-index: 12;
		top: 4rem;
		left: 50%;
		max-width: min(90vw, 32rem);
		transform: translateX(-50%);
		box-shadow: 0 5px 15px #75613f1a;
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.4;
		}
	}
	@media (max-width: 800px) {
		.room-page {
			padding-inline: 1rem;
		}
		.lobby-grid {
			grid-template-columns: 1fr;
		}
		.room-heading {
			margin-left: 10px;
		}
		.room-player {
			min-height: 94px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.panel,
		.room-heading {
			animation: none;
		}
		button {
			transition: none;
		}
		.connection.warning i,
		.game-room-menu summary > i.warning,
		.signal {
			animation: none;
		}
	}
</style>
