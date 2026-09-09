<script lang="ts">
	import Brand from '$lib/game/Brand.svelte';
	import { goto } from '$app/navigation';
	import {
		PLAYER_COLORS,
		type PlayerColor,
		type RoomPlayerProfile,
		type RoomSettings,
		type RoomState,
	} from '@repo/shared';
	import {
		createRoom,
		getCurrentRoom,
		joinRoom,
		loadPlayerProfile,
		normalizeRoomCode,
		preserveDebugId,
		roomPageUrl,
		savePlayerProfile,
	} from '$lib/multiplayer-client';
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	let reduceMotion = $state(false);

	type Mode = 'create' | 'join';

	const colorNames: Record<PlayerColor, string> = {
		red: 'Signal red',
		blue: 'Lake blue',
		green: 'Pine green',
		yellow: 'Golden yellow',
		black: 'Night black',
	};

	let mode = $state<Mode>('create');
	let name = $state('');
	let color = $state<PlayerColor>('red');
	let maxPlayers = $state<RoomSettings['maxPlayers']>(4);
	let roomCode = $state('');
	let currentRoom = $state<RoomState | null>(null);
	let checkingRoom = $state(true);
	let busy = $state(false);
	let error = $state('');

	onMount(async () => {
		reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const profile = loadPlayerProfile();
		if (profile) {
			name = profile.name;
			color = profile.color;
		}
		try {
			currentRoom = await getCurrentRoom();
		} catch {
			currentRoom = null;
		} finally {
			checkingRoom = false;
		}
	});

	function setMode(nextMode: Mode) {
		mode = nextMode;
		error = '';
	}

	function updateCode(event: Event) {
		roomCode = normalizeRoomCode((event.currentTarget as HTMLInputElement).value);
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		const profile: RoomPlayerProfile = { name: name.trim(), color };
		if (!profile.name) {
			error = 'Enter the name other players will see.';
			return;
		}
		if (profile.name.length > 32) {
			error = 'Keep your name to 32 characters.';
			return;
		}
		if (mode === 'join' && roomCode.length !== 6) {
			error = 'Enter the six-character room code.';
			return;
		}

		busy = true;
		try {
			savePlayerProfile(profile);
			const room =
				mode === 'create'
					? await createRoom({ ...profile, settings: { maxPlayers } })
					: await joinRoom(roomCode, profile);
			await goto(roomPageUrl(room.code));
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not enter the room.';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Multiplayer lobby — Ticket to Travel</title>
	<meta name="description" content="Create a private Ticket to Ride room or join friends with a six-character code." />
</svelte:head>

<main class="lobby-page">
	<header>
		<Brand href={preserveDebugId('/')} />
		<a class="back" href={preserveDebugId('/')} aria-label="Back to home">← Home</a>
	</header>

	<section class="intro" aria-labelledby="lobby-title">
		<p class="eyebrow">Private multiplayer</p>
		<h1 id="lobby-title">Meet at the station.</h1>
		<p class="intro-copy">A private table for 2–5 travelers. Share the code and set off together.</p>
		<img
			class="travel-art"
			src="/game-assets/atlas/tickets/chicago-santa-fe.webp"
			alt="Illustrated Chicago and Santa Fe destinations"
			width="768"
			height="512"
		/>
	</section>

	<section class="entry" aria-label="Multiplayer room entry">
		{#if checkingRoom}
			<div class="resume skeleton" aria-label="Checking for an active room"></div>
		{:else if currentRoom}
			<div class="resume">
				<div>
					<span>Your current journey</span>
					<strong>Room {currentRoom.code}</strong>
					<small>{currentRoom.players.length} {currentRoom.players.length === 1 ? 'player' : 'players'}</small>
				</div>
				<a href={roomPageUrl(currentRoom.code)}>Resume <span aria-hidden="true">→</span></a>
			</div>
		{/if}

		<div class="entry-card">
			<div class="mode-tabs" aria-label="Room action">
				<button
					type="button"
					class:active={mode === 'create'}
					aria-pressed={mode === 'create'}
					onclick={() => setMode('create')}
				>
					Create room
				</button>
				<button
					type="button"
					class:active={mode === 'join'}
					aria-pressed={mode === 'join'}
					onclick={() => setMode('join')}
				>
					Join room
				</button>
			</div>

			<form onsubmit={submit}>
				<div class="heading">
					<p>{mode === 'create' ? 'New table' : 'Boarding pass'}</p>
					<h2>{mode === 'create' ? 'Host a game' : 'Join your friends'}</h2>
					<span>
						{mode === 'create'
							? 'You’ll get a room code to share after creating the table.'
							: 'Ask the host for the six-character code shown in their room.'}
					</span>
				</div>

				{#if mode === 'join'}
					<label class="field code-field" transition:slide={{ duration: reduceMotion ? 0 : 220 }}>
						<span>Room code</span>
						<input
							type="text"
							name="room-code"
							value={roomCode}
							oninput={updateCode}
							placeholder="ABC234"
							maxlength="6"
							autocomplete="off"
							spellcheck="false"
							aria-describedby="code-help"
						/>
						<small id="code-help">Codes ignore lowercase and spaces.</small>
					</label>
				{/if}

				<label class="field">
					<span>Your name</span>
					<input
						bind:value={name}
						type="text"
						name="name"
						maxlength="32"
						autocomplete="nickname"
						placeholder="Conductor name"
					/>
				</label>

				<fieldset>
					<legend>Color</legend>
					<div class="colors">
						{#each PLAYER_COLORS as playerColor}
							<label title={colorNames[playerColor]}>
								<input bind:group={color} type="radio" name="color" value={playerColor} />
								<span class="swatch {playerColor}" aria-hidden="true"></span>
								<small>{playerColor}</small>
							</label>
						{/each}
					</div>
				</fieldset>

				{#if mode === 'create'}
					<label class="field" transition:slide={{ duration: reduceMotion ? 0 : 220 }}>
						<span>Table size</span>
						<select bind:value={maxPlayers} name="max-players">
							<option value={2}>2 players</option>
							<option value={3}>3 players</option>
							<option value={4}>4 players</option>
							<option value={5}>5 players</option>
						</select>
					</label>
				{/if}

				{#if error}<p class="error" role="alert" transition:slide={{ duration: reduceMotion ? 0 : 160 }}>
						{error}
					</p>{/if}

				<button class="submit" type="submit" disabled={busy || Boolean(currentRoom)}>
					{busy ? 'Contacting station…' : mode === 'create' ? 'Create private room' : 'Join room'}
					<span aria-hidden="true">→</span>
				</button>
				{#if currentRoom}<p class="active-note">Resume or leave your current room before starting another.</p>{/if}
			</form>
		</div>
	</section>
</main>

<style>
	:global(html) {
		color-scheme: light;
	}
	.lobby-page {
		display: grid;
		grid-template: auto 1fr / minmax(0, 1fr) minmax(0, 1fr);
		min-height: 100svh;
		background: radial-gradient(ellipse at 45% 35%, #fffdf5, #eee8d9);
		color: #142d3e;
	}
	header {
		grid-column: 1 / -1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		border-bottom: 1px solid #dcd6c7;
		padding: 1.4rem clamp(1.25rem, 5vw, 5rem);
	}
	a {
		color: inherit;
		text-decoration: none;
	}
	.back {
		color: #667076;
		font-size: 0.78rem;
		font-weight: 700;
	}
	.intro {
		align-self: center;
		justify-self: end;
		width: min(100%, 42rem);
		padding: 3rem clamp(1.5rem, 5vw, 5rem);
	}
	.eyebrow,
	.heading p {
		margin: 0 0 1.25rem;
		color: #a34a3d;
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.15em;
		text-transform: uppercase;
	}
	h1 {
		margin: 0;
		font-family: Georgia, serif;
		font-size: clamp(3rem, 5vw, 5.2rem);
		font-weight: 400;
		letter-spacing: -0.045em;
		line-height: 1.02;
		text-wrap: balance;
	}
	.intro-copy {
		margin: 1.7rem 0;
		color: #647077;
		font-size: 0.93rem;
		line-height: 1.75;
	}
	.travel-art {
		display: block;
		width: 100%;
		height: 200px;
		object-fit: cover;
		margin-top: 2rem;
		border: 6px solid #fffdf7;
		transform: rotate(-2deg);
		box-shadow:
			0 2px 0 #c4b28e,
			0 7px 9px #57401f24,
			0 20px 28px #57401f12;
		animation: paper-arrive 600ms ease-out both;
	}
	.entry {
		align-self: center;
		justify-self: start;
		width: min(36rem, calc(100% - 3rem));
		margin: 2rem 0 3rem;
	}
	.resume {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		min-height: 5.4rem;
		margin-bottom: 1rem;
		border: 1px solid #bca67c;
		border-radius: 0.5rem;
		padding: 1rem;
		background: #f5edcf;
		transform: rotate(-0.7deg);
		box-shadow:
			inset 0 0 0 3px #fff9e780,
			0 3px 0 #b7a17b,
			0 8px 12px #57401f20;
	}
	.resume div {
		display: grid;
		gap: 0.2rem;
	}
	.resume span,
	.resume small {
		color: #64716a;
		font-size: 0.65rem;
	}
	.resume strong {
		font-family: Georgia, serif;
		font-size: 1.15rem;
	}
	.resume a {
		border-radius: 0.3rem;
		padding: 0.7rem;
		background: #dce7d7;
		color: #294f3c;
		font-size: 0.75rem;
		font-weight: 750;
	}
	.skeleton {
		background: #eee8dc;
	}
	.entry-card {
		border: 1px solid #bca67c;
		border-radius: 4px 7px 5px 3px;
		background: #f7eed9;
		box-shadow:
			inset 0 0 0 3px #fff9e780,
			0 3px 0 #b7a17b,
			0 9px 13px #57401f20,
			0 25px 35px #57401f0d;
		animation: paper-arrive 550ms ease-out both;
	}
	.mode-tabs {
		display: grid;
		grid-template-columns: 1fr 1fr;
		border-bottom: 1px solid #ded7c8;
		padding: 0.45rem;
	}
	.mode-tabs button {
		min-height: 44px;
		border: 0;
		border-radius: 0.35rem;
		padding: 0.75rem;
		background: transparent;
		color: #647077;
		font-size: 0.75rem;
		font-weight: 750;
		cursor: pointer;
	}
	.mode-tabs button.active {
		background: #eae5d9;
		color: #142d3e;
	}
	form {
		display: grid;
		gap: 1.15rem;
		padding: clamp(1.3rem, 3vw, 2rem);
	}
	.heading p {
		margin-bottom: 0.5rem;
		font-size: 0.62rem;
	}
	h2 {
		margin: 0;
		font-family: Georgia, serif;
		font-size: 2rem;
		font-weight: 400;
		letter-spacing: -0.03em;
	}
	.heading > span {
		display: block;
		margin-top: 0.5rem;
		color: #647077;
		font-size: 0.76rem;
		line-height: 1.6;
	}
	.field {
		display: grid;
		gap: 0.5rem;
	}
	.field > span,
	legend {
		color: #53636a;
		font-size: 0.68rem;
		font-weight: 750;
		letter-spacing: 0.07em;
		text-transform: uppercase;
	}
	input,
	select {
		width: 100%;
		min-height: 46px;
		border: 1px solid #cfc7b6;
		border-radius: 0.35rem;
		padding: 0.8rem 0.9rem;
		background: #fffef9;
		color: #142d3e;
		font: inherit;
	}
	input:focus,
	select:focus {
		outline: 2px solid #698ba3;
		outline-offset: 2px;
	}
	.code-field input {
		font-family: ui-monospace, monospace;
		font-size: 1.3rem;
		font-weight: 750;
		letter-spacing: 0.2em;
		text-transform: uppercase;
	}
	.field small {
		color: #697579;
		font-size: 0.66rem;
	}
	fieldset {
		margin: 0;
		border: 0;
		padding: 0;
	}
	legend {
		margin-bottom: 0.65rem;
	}
	.colors {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 0.5rem;
	}
	.colors label {
		position: relative;
		display: grid;
		place-items: center;
		gap: 0.3rem;
		min-width: 0;
		border: 1px solid #d6cebd;
		border-radius: 0.35rem;
		padding: 0.55rem 0.2rem;
		background: #f7f3e9;
		cursor: pointer;
	}
	.colors input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	.colors label:has(input:checked) {
		border-color: #476c81;
		box-shadow: 0 0 0 1px #476c81;
	}
	.colors label:has(input:focus-visible) {
		outline: 2px solid #476c81;
		outline-offset: 3px;
	}
	.swatch {
		width: 1.25rem;
		height: 1.25rem;
		border: 2px solid #fffdf7;
		border-radius: 50%;
		box-shadow: 0 1px 4px #4d443833;
	}
	.swatch.red {
		background: #c6493d;
	}
	.swatch.blue {
		background: #3e7da6;
	}
	.swatch.green {
		background: #3e7f62;
	}
	.swatch.yellow {
		background: #d9a83b;
	}
	.swatch.black {
		background: #252b2d;
	}
	.colors small {
		color: #58686d;
		font-size: 0.6rem;
		text-transform: capitalize;
	}
	.submit {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		min-height: 48px;
		border: 0;
		border-radius: 0.4rem;
		padding: 1rem;
		background: #b6493d;
		color: white;
		font-size: 0.78rem;
		font-weight: 750;
		cursor: pointer;
		transition:
			transform 180ms ease,
			box-shadow 180ms ease;
	}
	.submit:not(:disabled):hover {
		transform: translateY(-2px);
		box-shadow: 0 7px 16px #64523b20;
	}
	.submit:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}
	.error,
	.active-note {
		margin: 0;
		font-size: 0.72rem;
		line-height: 1.5;
	}
	.error {
		color: #a73f32;
	}
	.active-note {
		color: #647077;
		text-align: center;
	}
	@keyframes paper-arrive {
		from {
			opacity: 0;
			translate: 0 28px;
		}
		to {
			opacity: 1;
			translate: 0 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.entry-card,
		.travel-art {
			animation: none;
		}
		.submit {
			transition: none;
		}
	}
</style>
