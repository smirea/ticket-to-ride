<script lang="ts">
	import { getGameMap } from '@repo/shared';
	import { boardArt } from '.';
	import BoardPreview from './BoardPreview.svelte';

	let { mapId }: { mapId: string } = $props();
	const map = $derived(getGameMap(mapId));
	const art = $derived(boardArt(mapId));
	const players = $derived(
		Math.min(...map.players) === Math.max(...map.players)
			? `${map.players[0]}`
			: `${Math.min(...map.players)}–${Math.max(...map.players)}`,
	);
	const facts = $derived([
		{ label: 'Players', value: players },
		{ label: 'Trains each', value: String(map.rules.trainsPerPlayer) },
		{ label: 'Cities', value: String(map.cities.filter(city => city.type !== 'junction').length) },
		{ label: 'Routes', value: String(map.routes.length) },
		{ label: 'Tickets', value: String(map.tickets.length) },
	]);
</script>

<article class="map-details" aria-labelledby="map-details-title">
	<header>
		<img class="flag" src={art.flag} alt="" />
		<div>
			<h2 id="map-details-title">{map.name}</h2>
			<p>{map.info.tagline}</p>
		</div>
	</header>
	<figure class="preview" style:aspect-ratio={art.aspect} style:width={`min(100%, ${340 * art.aspect}px)`}>
		<BoardPreview {mapId} />
	</figure>
	<dl class="facts">
		{#each facts as fact}<div>
				<dt>{fact.label}</dt>
				<dd>{fact.value}</dd>
			</div>{/each}
	</dl>
	<p class="description">{map.info.description}</p>
	{#if map.info.gimmicks.length}
		<ul class="gimmicks" aria-label="What makes this map different">
			{#each map.info.gimmicks as gimmick}<li><strong>{gimmick.title}</strong> {gimmick.text}</li>{/each}
		</ul>
	{/if}
</article>

<style>
	.map-details {
		display: grid;
		gap: 1rem;
		color: #142d3e;
	}
	header {
		display: flex;
		align-items: center;
		gap: 0.85rem;
	}
	.flag {
		width: 54px;
		height: 36px;
		object-fit: cover;
		border: 3px solid #fffcf5;
		border-radius: 3px;
		box-shadow: 0 2px 6px #4f40263b;
	}
	h2 {
		margin: 0;
		font:
			400 clamp(1.7rem, 2.6vw, 2.3rem) / 1.05 Georgia,
			serif;
		letter-spacing: -0.03em;
	}
	header p {
		margin: 0.25rem 0 0;
		color: #a34a3d;
		font-size: 0.8rem;
		font-weight: 700;
	}
	.preview {
		margin: 0;
		justify-self: center;
		border: 5px solid #fffcf5;
		border-radius: 4px;
		overflow: hidden;
		box-shadow: 0 4px 14px #75613f29;
	}
	.facts {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 0.4rem;
		margin: 0;
	}
	.facts div {
		display: grid;
		gap: 0.15rem;
	}
	dt {
		color: #637076;
		font-size: 0.62rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	dd {
		margin: 0;
		font:
			700 1.15rem Georgia,
			serif;
	}
	.description {
		margin: 0;
		color: #4f5d64;
		font-size: 0.86rem;
		line-height: 1.6;
	}
	.gimmicks {
		display: grid;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.gimmicks li {
		padding: 0.55rem 0.75rem;
		border-left: 3px solid #b6493d;
		border-radius: 0 0.3rem 0.3rem 0;
		background: #f1ebdd;
		color: #4f5d64;
		font-size: 0.8rem;
		line-height: 1.5;
	}
	.gimmicks strong {
		color: #142d3e;
	}
</style>
