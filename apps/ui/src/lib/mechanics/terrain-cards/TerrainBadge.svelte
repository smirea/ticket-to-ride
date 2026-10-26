<script lang="ts">
	import type { GameState, Player } from '@repo/shared';
	import { TERRAIN_NAMES, TERRAINS, terrainHand } from '@repo/shared/mechanics/terrain-cards';

	let { state, player }: { state: GameState; player: Player } = $props();
	const hand = $derived(terrainHand(state, player.id));
	const leads = $derived(
		Object.fromEntries(
			TERRAINS.map(terrain => [
				terrain,
				hand[terrain] > 0 && state.players.every(other => terrainHand(state, other.id)[terrain] <= hand[terrain]),
			]),
		),
	);
</script>

<span
	class="terrain-badge"
	aria-label={TERRAINS.map(terrain => `${hand[terrain]} ${TERRAIN_NAMES[terrain]}`).join(', ')}
>
	{#each TERRAINS as terrain (terrain)}
		<span class="chip" class:leads={leads[terrain]} title={TERRAIN_NAMES[terrain]}
			><i style:background-image={`url(/game-assets/maps/the-heart-of-africa/terrain-${terrain}.webp)`}></i>{hand[
				terrain
			]}</span
		>
	{/each}
</span>

<style>
	.terrain-badge {
		display: flex;
		gap: 5px;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		font-weight: 700;
		opacity: 0.72;
	}
	.chip.leads {
		opacity: 1;
	}
	i {
		width: 9px;
		height: 13px;
		border: 1px solid #fff3d6aa;
		border-radius: 2px;
		background-size: cover;
	}
	.leads i {
		border-color: #f2cd78;
		box-shadow: 0 0 0 1px #f2cd78;
	}
</style>
