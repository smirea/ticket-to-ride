<script lang="ts">
	import { gameMap, playerStations, type GameState, type Player } from '@repo/shared';
	import { playerColors } from '$lib/game/board/layout';
	import StationIcon from './StationIcon.svelte';
	let { state: gameState, player }: { state: GameState; player: Player } = $props();
	const left = $derived(
		(gameMap(gameState).rules.mechanics.stations?.costs.length ?? 0) - playerStations(gameState, player.id).length,
	);
</script>

<span class="stations" aria-label={`${left} ${left === 1 ? 'station' : 'stations'} left`}>
	{#each Array(left) as _}<StationIcon color={playerColors[player.color]} size={11} />{/each}
</span>

<style>
	.stations {
		display: inline-flex;
		gap: 1px;
	}
</style>
