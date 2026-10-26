<script lang="ts">
	import { useGameMap } from './map-context';
	import PointsSeal from './PointsSeal.svelte';
	import TrainPieceIcon from './TrainPieceIcon.svelte';

	const game = useGameMap();
	const lengths = $derived([...new Set(game.map.routes.map(route => route.length))].sort((a, b) => a - b));
	const scores = $derived(game.map.rules.routeScores);
	const icon = $derived(lengths.at(-1)! > 6 ? 11 : 16);
</script>

<div
	class="route-scoring"
	role="img"
	aria-label={`Route scoring: ${lengths.map(length => `${length} trains earn ${scores[length]}`).join('; ')} points.`}
>
	{#each lengths as length}
		<div class="row" aria-hidden="true">
			<span class="length">{length}</span>
			<div class="carriages">
				{#each Array(length) as _}
					<TrainPieceIcon width={icon} height={icon} />
				{/each}
			</div>
			<span class="arrow">›</span>
			<span class="seal"><PointsSeal value={scores[length] ?? length} /></span>
		</div>
	{/each}
</div>

<style>
	.route-scoring {
		padding: 8px 12px;
		border: 1px solid #9e875c;
		border-radius: 3px 7px 3px 6px;
		background: linear-gradient(115deg, #f8f0d8, #e8d9b8);
		color: #74603b;
		box-shadow:
			inset 0 0 0 3px #f1e5c9,
			inset 0 0 0 4px #b4a07888,
			1px 3px #b6a17c,
			3px 7px 8px #43332026;
		transform: rotate(-0.7deg);
	}
	.row {
		display: grid;
		grid-template-columns: 11px minmax(0, 1fr) 7px 25px;
		align-items: center;
		gap: 3px;
		height: 24px;
	}
	.row + .row {
		border-top: 1px solid #a7957028;
	}
	.length {
		font:
			600 11px/1 Georgia,
			serif;
	}
	.carriages {
		display: flex;
		gap: 1px;
	}
	.arrow {
		font:
			18px/1 Georgia,
			serif;
		opacity: 0.65;
	}
	.seal {
		width: 25px;
		height: 25px;
		--seal-number-size: 13px;
	}
</style>
