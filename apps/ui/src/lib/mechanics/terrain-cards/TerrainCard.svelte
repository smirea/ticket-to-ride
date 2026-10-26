<script lang="ts">
	import type { Terrain } from '@repo/shared/mechanics/terrain-cards';

	let { terrain, count }: { terrain?: Terrain; count?: number } = $props();
	const stripes: Record<Terrain, string[]> = {
		desert: ['#e1ba35', '#db852b', '#c13f36'],
		jungle: ['#895699', '#347ba7', '#437550'],
		mountain: ['#eee5cc', '#9a968c', '#424340'],
	};
</script>

<span
	class="terrain-card"
	class:back={!terrain}
	style:background-image={terrain ? `url(/game-assets/maps/the-heart-of-africa/terrain-${terrain}.webp)` : undefined}
>
	{#if terrain}
		<span class="stripes"
			>{#each stripes[terrain] as color (color)}<i style:background={color}></i>{/each}</span
		>
	{:else}
		<img src="/game-assets/maps/the-heart-of-africa/flag.svg" alt="" draggable="false" />
	{/if}
	{#if count !== undefined}<strong>{count}</strong>{/if}
</span>

<style>
	.terrain-card {
		position: relative;
		display: block;
		width: 100%;
		aspect-ratio: 5 / 7;
		overflow: hidden;
		border: 2px solid #fff6df;
		border-radius: 5px;
		background-color: #5b3a22;
		background-size: cover;
		background-position: center;
		outline: 1px solid #ab99736b;
		box-shadow:
			0 2px 1px #ad9a74,
			0 3px 6px #30231833;
	}
	.back {
		background: radial-gradient(circle at 50% 50%, #7b3b23, #3f2414);
	}
	.back img {
		position: absolute;
		inset: 30% 10%;
		width: 80%;
		height: 40%;
		object-fit: cover;
		border-radius: 50%;
		opacity: 0.9;
	}
	.stripes {
		position: absolute;
		top: 9%;
		left: 50%;
		display: flex;
		gap: 2px;
		height: 42%;
		translate: -50% 0;
	}
	.stripes i {
		width: 7px;
		border: 1px solid #fff6dfcc;
		border-radius: 2px;
		box-shadow: 0 1px 2px #0005;
	}
	strong {
		position: absolute;
		right: 3px;
		bottom: 2px;
		min-width: 17px;
		padding: 0 4px;
		border-radius: 9px;
		background: #2c241c;
		color: #fff3d6;
		font-size: 11px;
		line-height: 17px;
		text-align: center;
	}
</style>
