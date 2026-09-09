<script lang="ts">
	import PointsSeal from './PointsSeal.svelte';
	import TrainPieceIcon from './TrainPieceIcon.svelte';
	let { text }: { text: string } = $props();
	const parts = $derived(text.split(/\b(points?|locomotives?|cars?|trains?)\b/gi));
</script>

<span aria-label={text}>
	{#each parts as part, index}
		{#if index % 2 === 0}{part}{:else}<span class="unit" aria-hidden="true">
				{#if /^point/i.test(part)}<PointsSeal />{:else}<TrainPieceIcon
						locomotive={/^locomotive/i.test(part)}
						width={22}
						height={17}
					/>{/if}
			</span>{/if}
	{/each}
</span>

<style>
	.unit {
		display: inline-flex;
		width: 22px;
		height: 19px;
		align-items: center;
		justify-content: center;
		vertical-align: -4px;
	}
</style>
