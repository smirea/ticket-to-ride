<script lang="ts">
	import Brand from '$lib/game/Brand.svelte';
	import { getCurrentRoom, preserveDebugId, roomPageUrl } from '$lib/multiplayer-client';
	import { onMount } from 'svelte';

	let hasSavedGame = $state(false);
	let currentRoomCode = $state('');

	onMount(async () => {
		hasSavedGame = Boolean(localStorage.getItem('ticket-to-ride:single-player:v1'));
		try {
			currentRoomCode = (await getCurrentRoom())?.code ?? '';
		} catch {
			currentRoomCode = '';
		}
	});
</script>

<svelte:head>
	<title>Ticket to Travel — A railway adventure</title>
	<meta name="description" content="Build a railway across North America in a local Ticket to Ride game." />
</svelte:head>

<main class="home">
	<nav aria-label="Main navigation">
		<Brand href={preserveDebugId('/')} />
		<a class="small-link" href={preserveDebugId('/debug/game')}>Debug game</a>
	</nav>

	<div class="hero-layout">
		<section class="hero">
			<p class="eyebrow">A cross-country railway adventure</p>
			<h1>Claim the rails.<br />Connect the continent.</h1>
			<p class="lede">
				Collect train cards, complete destination tickets, and race your fellow travelers across the classic USA map.
			</p>
			<div class="actions">
				<a class="primary" href={preserveDebugId('/setup')}>Start single player <span aria-hidden="true">→</span></a>
				<a class="multiplayer" href={currentRoomCode ? roomPageUrl(currentRoomCode) : preserveDebugId('/lobby')}>
					{currentRoomCode ? `Resume room ${currentRoomCode}` : 'Play multiplayer'}
				</a>
				{#if hasSavedGame}<a class="continue" href={preserveDebugId('/game')}>Continue solo</a>{/if}
			</div>
		</section>
		<figure class="travel-print">
			<img
				src="/game-assets/atlas/tickets/chicago-santa-fe.webp"
				alt="An illustrated journey from Chicago to Santa Fe"
				width="768"
				height="512"
			/>
			<figcaption><span>Across America</span><span>The art of the journey</span></figcaption>
		</figure>
	</div>

	<footer>
		<span>45 trains. One continent.</span>
		<span>Classic USA</span>
	</footer>
</main>

<style>
	:global(html) {
		color-scheme: light;
	}
	.home {
		display: grid;
		grid-template-rows: auto 1fr auto;
		min-height: 100svh;
		background: #f7f3e9;
		color: #142d3e;
	}
	nav,
	footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.4rem clamp(1.25rem, 5vw, 5rem);
	}
	nav {
		border-bottom: 1px solid #dcd6c7;
	}
	a {
		color: inherit;
		text-decoration: none;
	}
	.small-link {
		font-size: 0.75rem;
		color: #667076;
		border-bottom: 1px solid #bcb8aa;
	}
	.hero-layout {
		display: grid;
		grid-template-columns: 1.1fr 1fr;
		align-items: center;
		gap: clamp(2rem, 5vw, 6rem);
		width: min(1400px, 100%);
		margin: auto;
		padding: clamp(3rem, 7vw, 7rem) clamp(1.25rem, 5vw, 5rem);
	}
	.eyebrow {
		margin: 0 0 1.7rem;
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
		line-height: 1.03;
		text-wrap: balance;
	}
	.lede {
		max-width: 32rem;
		margin: 1.8rem 0;
		color: #647077;
		font-size: 1rem;
		line-height: 1.75;
	}
	.actions {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.75rem;
		font-size: 0.78rem;
	}
	.primary,
	.multiplayer {
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
		min-height: 48px;
		padding: 0.95rem 1.2rem;
		border-radius: 0.4rem;
		font-weight: 750;
		transition:
			transform 180ms ease,
			box-shadow 180ms ease;
	}
	.primary {
		background: #b6493d;
		color: white;
		box-shadow: 0 4px 10px #7a39211c;
	}
	.multiplayer {
		border: 1px solid #c8c1b1;
		background: #fffcf5;
	}
	.primary:hover,
	.multiplayer:hover {
		transform: translateY(-2px);
		box-shadow: 0 7px 16px #64523b20;
	}
	.continue {
		margin: 0.5rem;
		text-decoration: underline;
		text-underline-offset: 4px;
	}
	.travel-print {
		margin: 0;
		padding: 0.7rem;
		background: #fffcf4;
		border: 1px solid #d5cbb7;
		box-shadow: 0 12px 30px #75613f1a;
		transform: rotate(2deg);
	}
	.travel-print img {
		display: block;
		width: 100%;
		height: clamp(320px, 38vw, 530px);
		object-fit: cover;
	}
	figcaption {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 0.4rem 0.5rem;
		color: #69716b;
		font-size: 0.62rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}
	footer {
		border-top: 1px solid #dcd6c7;
		color: #717b7d;
		font-size: 0.65rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}
	@media (max-width: 820px) {
		.hero-layout {
			grid-template-columns: 1fr;
			max-width: 650px;
		}
		.travel-print {
			transform: none;
		}
		.travel-print img {
			height: 300px;
		}
	}
	@media (max-width: 420px) {
		.small-link {
			font-size: 0.65rem;
		}
		.primary,
		.multiplayer {
			width: 100%;
		}
		footer {
			letter-spacing: 0.04em;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.primary,
		.multiplayer {
			transition: none;
		}
	}
</style>
