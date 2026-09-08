<script lang="ts">
	let { value }: { value?: number } = $props();
</script>

<span
	class="points-seal"
	aria-label={value === undefined ? undefined : `${value} points`}
	aria-hidden={value === undefined ? 'true' : undefined}
>
	<img src="/game-assets/atlas/points-clay-seal.webp" alt="" draggable="false" />
	{#if value !== undefined}<strong>{value}</strong>{/if}
</span>

<style>
	.points-seal {
		position: relative;
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
		isolation: isolate;
		filter: drop-shadow(1px 2px 1px #34201855);
	}
	img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: contain;
		pointer-events: none;
	}
	strong {
		position: relative;
		padding-bottom: 2%;
		color: #fff3d8;
		font:
			600 var(--seal-number-size, 24px)/1 Georgia,
			serif;
		font-variant-numeric: lining-nums;
		text-shadow:
			0 1px 1px #481411,
			0 -1px #ffd39a44;
	}
</style>
