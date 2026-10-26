<script lang="ts">
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import Brand from '$lib/game/Brand.svelte';
	import MapAtlas from '$lib/maps/MapAtlas.svelte';
	import MapDetails from '$lib/maps/MapDetails.svelte';
	import { DEFAULT_MAP_ID, findGameMap, getGameMap } from '@repo/shared';
	import { onMount } from 'svelte';

	let hasSavedGame = $state(false);
	let mapId = $state(findGameMap(page.url.searchParams.get('map') ?? '')?.id ?? DEFAULT_MAP_ID);
	const map = $derived(getGameMap(mapId));
	const rivalCounts = $derived(map.players.map(players => players - 1));
	let rivals = $state(2);
	$effect(() => {
		if (!rivalCounts.includes(rivals)) rivals = Math.min(Math.max(rivals, rivalCounts[0]!), rivalCounts.at(-1)!);
	});

	function select(id: string) {
		mapId = id;
		const url = new URL(page.url);
		url.searchParams.set('map', id);
		replaceState(url, page.state);
	}

	onMount(() => {
		try {
			hasSavedGame = Boolean(localStorage.getItem('ticket-to-ride:single-player:v1'));
		} catch {}
	});
</script>

<svelte:head>
	<title>New Game — Ticket to Travel</title>
</svelte:head>

<main>
	<nav><Brand /><a class="back" href="/">← Home</a></nav>
	<div class="layout">
		<section class="atlas-panel" aria-labelledby="atlas-title">
			<p class="eyebrow">Single player</p>
			<h1 id="atlas-title">Choose your journey.</h1>
			<MapAtlas selectedId={mapId} onselect={select} />
			<form action="/game" method="get">
				<input type="hidden" name="new" value="1" />
				<input type="hidden" name="map" value={mapId} />
				<label>
					<span>Your name</span>
					<input name="name" value="You" maxlength="24" autocomplete="nickname" required />
				</label>
				<label>
					<span>Rival conductors</span>
					<select name="bots" bind:value={rivals}>
						{#each rivalCounts as count}
							<option value={count}>{count} {count === 1 ? 'rival' : 'rivals'}</option>
						{/each}
					</select>
				</label>
				<button type="submit">Deal the tickets <span aria-hidden="true">→</span></button>
				{#if hasSavedGame}
					<p class="saved">This replaces your saved journey. <a href="/game">Continue it instead</a></p>
				{/if}
			</form>
		</section>

		<section class="details-panel">
			<MapDetails {mapId} />
		</section>
	</div>
</main>

<style>
	main {
		min-height: 100svh;
		padding-bottom: 3rem;
		background: #f7f3e9;
		color: #142d3e;
	}
	nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.2rem clamp(1.25rem, 4vw, 3.5rem);
		border-bottom: 1px solid #dcd6c7;
	}
	.back {
		color: #667076;
		font-size: 0.78rem;
		font-weight: 700;
		text-decoration: none;
	}
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1.65fr) minmax(320px, 1fr);
		align-items: start;
		gap: clamp(1.25rem, 3vw, 2.5rem);
		width: min(96rem, calc(100% - 2.5rem));
		margin: clamp(1.25rem, 3vw, 2.5rem) auto 0;
	}
	.eyebrow {
		margin: 0 0 0.6rem;
		color: #a34a3d;
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.15em;
		text-transform: uppercase;
	}
	h1 {
		margin: 0 0 1.25rem;
		font:
			400 clamp(2.2rem, 3.6vw, 3.4rem) / 1.02 Georgia,
			serif;
		letter-spacing: -0.04em;
	}
	.details-panel {
		display: grid;
		padding: clamp(1.25rem, 2.4vw, 2rem);
		border: 1px solid #d8d0bf;
		border-radius: 0.6rem;
		background: #fffcf5;
		box-shadow: 0 12px 35px #75613f12;
	}
	form {
		display: grid;
		grid-template-columns: 1fr 1fr auto;
		align-items: end;
		gap: 1rem;
		margin-top: 1.5rem;
	}
	label {
		display: grid;
		gap: 0.45rem;
	}
	label > span {
		color: #637076;
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	input,
	select {
		width: 100%;
		min-height: 44px;
		border: 1px solid #cfc7b6;
		border-radius: 0.35rem;
		padding: 0.7rem 0.85rem;
		background: #fffef9;
		color: #142d3e;
		font: inherit;
	}
	input:focus,
	select:focus {
		outline: 2px solid #698ba3;
		outline-offset: 2px;
	}
	button {
		display: flex;
		gap: 2rem;
		align-items: center;
		justify-content: space-between;
		min-height: 48px;
		border: 0;
		border-radius: 0.4rem;
		padding: 1rem;
		background: #b6493d;
		color: white;
		font-weight: 750;
		cursor: pointer;
		transition:
			transform 180ms ease,
			box-shadow 180ms ease;
	}
	button:hover {
		transform: translateY(-2px);
		box-shadow: 0 7px 16px #64523b20;
	}
	.saved {
		grid-column: 1 / -1;
		margin: 0;
		color: #647077;
		font-size: 0.78rem;
		text-align: center;
	}
	.saved a {
		color: #a34a3d;
		font-weight: 700;
	}
	@media (max-width: 1100px) {
		.layout {
			grid-template-columns: 1fr;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		button {
			transition: none;
		}
	}
</style>
