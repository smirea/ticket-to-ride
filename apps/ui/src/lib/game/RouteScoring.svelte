<script lang="ts">
	import { ROUTE_SCORES } from '@repo/shared';
	import PointsSeal from './PointsSeal.svelte';
</script>

<div
	class="route-scoring"
	role="img"
	aria-label="Route scoring: 1 train earns 1 point; 2 trains earn 2; 3 earn 4; 4 earn 7; 5 earn 10; 6 earn 15 points."
>
	{#each [1, 2, 3, 4, 5, 6] as length}
		<div class="row" aria-hidden="true">
			<span class="length">{length}</span>
			<div class="carriages">
				{#each Array(length) as _}
					<svg viewBox="0 0 26 20"
						><path d="M3 5h20v10H3zM5 2h16l2 3H3zM1 15h24M7 7v5m6-5v5m6-5v5" /><circle cx="6" cy="17" r="2" /><circle
							cx="20"
							cy="17"
							r="2"
						/></svg
					>
				{/each}
			</div>
			<span class="arrow">›</span>
			<span class="seal"><PointsSeal value={ROUTE_SCORES[length]} /></span>
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
	svg {
		width: 16px;
		height: 16px;
		fill: #a38a5d22;
		stroke: currentColor;
		stroke-width: 1.3;
		stroke-linejoin: round;
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
