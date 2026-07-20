<script lang="ts">
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
	<title>Multiplayer lobby — Railbound</title>
	<meta name="description" content="Create a private Ticket to Ride room or join friends with a six-character code." />
</svelte:head>

<main class="lobby-page">
	<div class="topography" aria-hidden="true"></div>
	<div class="rail-line" aria-hidden="true"></div>

	<header>
		<a class="brand" href={preserveDebugId('/')}>Railbound</a>
		<a class="back" href={preserveDebugId('/')} aria-label="Back to home">← Home</a>
	</header>

	<section class="intro" aria-labelledby="lobby-title">
		<p class="eyebrow">Private multiplayer</p>
		<h1 id="lobby-title">Meet at the station.</h1>
		<p class="intro-copy">
			Start a private room, send the code to your friends, and race across the same classic USA board together.
		</p>
		<ul aria-label="Multiplayer features">
			<li><strong>2–5</strong><span>players</span></li>
			<li><strong>Live</strong><span>turns</span></li>
			<li><strong>Private</strong><span>room code</span></li>
		</ul>
	</section>

	<section class="entry" aria-label="Multiplayer room entry">
		{#if checkingRoom}
			<div class="resume skeleton" aria-label="Checking for an active room"></div>
		{:else if currentRoom}
			<div class="resume">
				<div>
					<span>Your current journey</span>
					<strong>Room {currentRoom.code}</strong>
					<small>{currentRoom.players.length} players · {currentRoom.phase}</small>
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
					<label class="field code-field">
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
					<legend>Train color</legend>
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
					<label class="field">
						<span>Table size</span>
						<select bind:value={maxPlayers} name="max-players">
							<option value={2}>2 players</option>
							<option value={3}>3 players</option>
							<option value={4}>4 players</option>
							<option value={5}>5 players</option>
						</select>
					</label>
				{/if}

				{#if error}<p class="error" role="alert">{error}</p>{/if}

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
		color-scheme: dark;
	}

	.lobby-page {
		position: relative;
		display: grid;
		grid-template: auto 1fr / minmax(20rem, 0.86fr) minmax(28rem, 1.14fr);
		min-height: 100vh;
		overflow: hidden;
		background:
			linear-gradient(115deg, rgb(7 24 30 / 0.97) 0 43%, rgb(7 24 30 / 0.82) 60%, rgb(7 24 30 / 0.5) 100%),
			linear-gradient(145deg, #203f42, #0b1a24 65%);
		color: #f8f0dd;
	}

	header {
		position: relative;
		z-index: 3;
		grid-column: 1 / -1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.8rem clamp(1.25rem, 5vw, 5rem);
	}

	a {
		color: inherit;
		text-decoration: none;
	}

	.brand {
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 1.45rem;
		font-weight: 700;
		letter-spacing: -0.03em;
	}

	.brand::before {
		display: inline-block;
		width: 0.65rem;
		height: 0.65rem;
		margin-right: 0.6rem;
		border: 3px solid #e7a548;
		border-radius: 50%;
		content: '';
	}

	.back {
		color: #b9c6c2;
		font-size: 0.78rem;
		font-weight: 750;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.intro {
		position: relative;
		z-index: 2;
		align-self: center;
		padding: 4rem clamp(2rem, 7vw, 8rem);
	}

	.eyebrow,
	.heading p {
		margin: 0 0 1rem;
		color: #e7a548;
		font-size: 0.72rem;
		font-weight: 850;
		letter-spacing: 0.18em;
		text-transform: uppercase;
	}

	h1 {
		max-width: 8ch;
		margin: 0;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: clamp(3.8rem, 7vw, 7.4rem);
		font-weight: 500;
		letter-spacing: -0.065em;
		line-height: 0.86;
	}

	.intro-copy {
		max-width: 35rem;
		margin: 2rem 0 2.5rem;
		color: #b8c2bd;
		font-size: 1rem;
		line-height: 1.75;
	}

	.intro ul {
		display: flex;
		gap: clamp(1.5rem, 4vw, 3.5rem);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.intro li {
		display: grid;
		gap: 0.2rem;
	}

	.intro li strong {
		color: #f8f0dd;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 1.1rem;
	}

	.intro li span {
		color: #82928e;
		font-size: 0.63rem;
		font-weight: 750;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.entry {
		position: relative;
		z-index: 2;
		align-self: center;
		width: min(36rem, calc(100% - 2.5rem));
		margin: 1.5rem auto 4rem;
	}

	.resume {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 5.4rem;
		margin-bottom: 0.85rem;
		border: 1px solid rgb(231 165 72 / 0.36);
		border-radius: 0.6rem;
		padding: 1rem 1.15rem;
		background: rgb(24 45 46 / 0.88);
		box-shadow: 0 16px 35px rgb(0 0 0 / 0.18);
	}

	.resume div {
		display: grid;
		gap: 0.18rem;
	}

	.resume span,
	.resume small {
		color: #8fa39f;
		font-size: 0.68rem;
		font-weight: 750;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.resume strong {
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 1.15rem;
	}

	.resume a {
		display: flex;
		gap: 1rem;
		border-radius: 0.3rem;
		padding: 0.65rem 0.8rem;
		background: #e7a548;
		color: #172019;
		font-size: 0.75rem;
		font-weight: 850;
	}

	.skeleton {
		border-color: rgb(255 255 255 / 0.08);
		background: linear-gradient(
			100deg,
			rgb(255 255 255 / 0.04) 25%,
			rgb(255 255 255 / 0.09) 40%,
			rgb(255 255 255 / 0.04) 55%
		);
		background-size: 300% 100%;
		animation: shimmer 1.5s infinite linear;
	}

	.entry-card {
		border: 1px solid rgb(255 255 255 / 0.11);
		border-radius: 0.75rem;
		background: rgb(8 21 27 / 0.92);
		box-shadow: 0 30px 70px rgb(0 0 0 / 0.38);
		backdrop-filter: blur(18px);
	}

	.mode-tabs {
		display: grid;
		grid-template-columns: 1fr 1fr;
		border-bottom: 1px solid rgb(255 255 255 / 0.09);
		padding: 0.45rem;
	}

	.mode-tabs button {
		border: 0;
		border-radius: 0.35rem;
		padding: 0.75rem 1rem;
		background: transparent;
		color: #83948f;
		font-size: 0.74rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		cursor: pointer;
	}

	.mode-tabs button.active {
		background: #203638;
		color: #f8f0dd;
	}

	form {
		display: grid;
		gap: 1.15rem;
		padding: clamp(1.35rem, 4vw, 2.15rem);
	}

	.heading {
		margin-bottom: 0.25rem;
	}

	.heading p {
		margin-bottom: 0.45rem;
		font-size: 0.62rem;
	}

	h2 {
		margin: 0;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 2rem;
		font-weight: 500;
		letter-spacing: -0.04em;
	}

	.heading > span {
		display: block;
		margin-top: 0.45rem;
		color: #83938f;
		font-size: 0.76rem;
		line-height: 1.55;
	}

	.field {
		display: grid;
		gap: 0.5rem;
	}

	.field > span,
	legend {
		color: #c6d0cb;
		font-size: 0.69rem;
		font-weight: 800;
		letter-spacing: 0.07em;
		text-transform: uppercase;
	}

	input,
	select {
		width: 100%;
		border: 1px solid #304346;
		border-radius: 0.36rem;
		outline: none;
		padding: 0.82rem 0.9rem;
		background: #10262c;
		color: #f8f0dd;
		font-size: 0.92rem;
		transition:
			border-color 140ms ease,
			box-shadow 140ms ease;
	}

	input:focus,
	select:focus {
		border-color: #d89b45;
		box-shadow: 0 0 0 3px rgb(231 165 72 / 0.14);
	}

	.code-field input {
		font-family: 'SFMono-Regular', ui-monospace, monospace;
		font-size: 1.35rem;
		font-weight: 800;
		letter-spacing: 0.2em;
		text-transform: uppercase;
	}

	.field small {
		color: #71847f;
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
		border: 1px solid #2d4042;
		border-radius: 0.35rem;
		padding: 0.55rem 0.2rem 0.45rem;
		background: #102329;
		cursor: pointer;
	}

	.colors input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.colors label:has(input:checked) {
		border-color: #e7a548;
		box-shadow: 0 0 0 2px rgb(231 165 72 / 0.14);
	}

	.swatch {
		width: 1.25rem;
		height: 1.25rem;
		border: 2px solid rgb(255 255 255 / 0.45);
		border-radius: 50%;
		box-shadow: 0 2px 7px rgb(0 0 0 / 0.45);
	}

	.swatch.red {
		background: #d14b39;
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
		overflow: hidden;
		max-width: 100%;
		color: #81928e;
		font-size: 0.55rem;
		font-weight: 750;
		text-overflow: ellipsis;
		text-transform: capitalize;
	}

	.submit {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		margin-top: 0.15rem;
		border: 0;
		border-radius: 0.38rem;
		padding: 0.95rem 1rem;
		background: #c94632;
		box-shadow: 0 12px 28px rgb(0 0 0 / 0.24);
		color: white;
		font-size: 0.78rem;
		font-weight: 850;
		letter-spacing: 0.04em;
		cursor: pointer;
		transition:
			transform 140ms ease,
			background 140ms ease;
	}

	.submit:not(:disabled):hover {
		transform: translateY(-1px);
		background: #df563e;
	}

	.submit:disabled {
		cursor: not-allowed;
		opacity: 0.48;
	}

	.error,
	.active-note {
		margin: -0.25rem 0 0;
		font-size: 0.72rem;
		line-height: 1.45;
	}

	.error {
		color: #ff9d8c;
	}
	.active-note {
		color: #859792;
		text-align: center;
	}

	.topography {
		position: absolute;
		inset: 0;
		background:
			repeating-radial-gradient(ellipse at 18% 78%, transparent 0 34px, rgb(255 255 255 / 0.025) 35px 36px),
			radial-gradient(circle at 87% 12%, rgb(226 164 73 / 0.2), transparent 30%);
		mask-image: linear-gradient(to right, black, transparent 80%);
	}

	.rail-line {
		position: absolute;
		right: -12%;
		bottom: 8%;
		width: 70%;
		height: 0.55rem;
		transform: rotate(-8deg);
		border-top: 2px solid rgb(214 171 98 / 0.28);
		border-bottom: 2px solid rgb(214 171 98 / 0.28);
		background: repeating-linear-gradient(90deg, transparent 0 1.8rem, rgb(214 171 98 / 0.3) 1.8rem 2rem);
	}

	@keyframes shimmer {
		to {
			background-position: -150% 0;
		}
	}

	@media (max-width: 900px) {
		.lobby-page {
			display: block;
			overflow: auto;
		}

		.intro {
			padding: 3rem clamp(1.25rem, 7vw, 4rem) 2rem;
		}

		h1 {
			max-width: none;
			font-size: clamp(3.6rem, 13vw, 6rem);
		}

		.intro-copy {
			max-width: 42rem;
		}

		.entry {
			margin-bottom: 4rem;
		}
	}

	@media (max-width: 520px) {
		header {
			padding: 1.35rem 1.2rem;
		}

		.intro {
			padding-top: 2.5rem;
		}

		.intro ul {
			justify-content: space-between;
			gap: 1rem;
		}

		.entry {
			width: calc(100% - 1.5rem);
		}

		.resume {
			align-items: flex-start;
			gap: 1rem;
		}

		form {
			padding: 1.3rem 1rem 1.5rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.skeleton {
			animation: none;
		}
		.submit {
			transition: none;
		}
	}
</style>
