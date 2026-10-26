<script lang="ts">
	import type { GameAction, GameState } from '@repo/shared';
	import { TERRAIN_NAMES } from '@repo/shared/mechanics/terrain-cards';
	import TerrainCard from './TerrainCard.svelte';

	let {
		state,
		send,
		disabled,
	}: {
		state: GameState;
		viewerId: string;
		send: (action: GameAction) => unknown;
		disabled: boolean;
	} = $props();
	const terrain = $derived(state.mechanics['terrain-cards']);
	const blocked = $derived(disabled || state.phase.type !== 'turn');
	const remaining = $derived((terrain?.deck.length ?? 0) + (terrain?.discard.length ?? 0));
</script>

{#if terrain}
	<section class="terrain-supply" aria-label="Terrain cards">
		{#each terrain.faceUp as card, index (`${index}-${card}`)}
			<button
				disabled={blocked}
				onclick={() => send({ type: 'draw-terrain-card', index })}
				aria-label={`Draw ${TERRAIN_NAMES[card]} terrain card`}
				title={TERRAIN_NAMES[card]}><TerrainCard terrain={card} /></button
			>
		{/each}
		<button
			class="deck"
			disabled={blocked || remaining === 0}
			onclick={() => send({ type: 'draw-terrain-card' })}
			aria-label={`Draw a blind terrain card. ${remaining} remain.`}><TerrainCard count={remaining} /></button
		>
	</section>
{/if}

<style>
	.terrain-supply {
		display: flex;
		align-items: end;
		gap: 7px;
		width: fit-content;
		margin: 16px 0 0 25px;
		padding: 8px 10px 9px;
		border: 1px solid #c6b994;
		border-radius: 4px;
		background: #f3e7c8;
		box-shadow: 2px 7px 10px #54422626;
		transform: rotate(1.2deg);
	}
	button {
		width: 46px;
		padding: 0;
		border: 0;
		background: none;
		transition: transform 160ms ease;
	}
	button:hover:not(:disabled) {
		transform: translateY(-4px) rotate(-2deg);
	}
	button:disabled {
		cursor: default;
	}
	.deck {
		margin-left: 4px;
	}
</style>
