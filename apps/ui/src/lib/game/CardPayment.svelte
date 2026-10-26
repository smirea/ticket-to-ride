<script lang="ts">
	import type { TrainColor } from '@repo/shared';
	import TrainCard from './TrainCard.svelte';

	// A small overlapping row of the cards a payment spends, for payment buttons in mechanic panels.
	let { color, cars, locomotives }: { color: TrainColor; cars: number; locomotives: number } = $props();
</script>

<span class="card-payment" aria-hidden="true">
	{#each Array(cars) as _}<span class="card"><TrainCard {color} /></span>{/each}
	{#each Array(locomotives) as _}<span class="card"><TrainCard color="locomotive" /></span>{/each}
</span>

<style>
	.card-payment {
		display: flex;
	}
	.card {
		display: block;
		width: 25px;
		height: 37px;
		margin-right: -8px;
	}
	.card:last-child {
		margin-right: 0;
	}
</style>
