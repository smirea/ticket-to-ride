<script lang="ts">
	import { claimScore, type ClaimOptions, type GameState, type Route } from '@repo/shared';
	import { doublingTerms, TERRAIN_NAMES } from '@repo/shared/mechanics/terrain-cards';
	import { onMount } from 'svelte';
	import TerrainCard from './TerrainCard.svelte';
	import { canDouble } from './doubling';

	let {
		state,
		viewerId,
		route,
		value,
		onchange,
	}: {
		state: GameState;
		viewerId: string;
		route: Route;
		value: ClaimOptions;
		onchange: (value: ClaimOptions) => void;
	} = $props();
	const terms = $derived(doublingTerms(state, viewerId, route));
	const possible = $derived(canDouble(state, viewerId, route));
	const cards = $derived(Math.max(0, terms.required - terms.minLocomotives));
	const name = $derived(TERRAIN_NAMES[terms.terrain]);
	const reason = $derived(
		terms.held + (state.players.find(player => player.id === viewerId)?.hand.locomotive ?? 0) < terms.rivalMost
			? `A rival holds ${terms.rivalMost} ${name}`
			: `Needs ${Math.max(terms.required, terms.rivalMost)} ${name}`,
	);
	const on = $derived(Boolean(value.terrain));

	function toggle(next: boolean) {
		const { terrain: _, ...rest } = value;
		onchange(next ? { ...rest, terrain: { locomotives: terms.minLocomotives } } : rest);
	}
	// Doubling with terrain cards alone costs nothing else, so it starts chosen; locomotives are opt-in.
	onMount(() => {
		if (possible && terms.minLocomotives === 0) toggle(true);
	});
</script>

<div class="terrain-double" class:on class:unavailable={!possible}>
	<span class="card"><TerrainCard terrain={terms.terrain} count={terms.held} /></span>
	{#if possible}
		<label>
			<input type="checkbox" checked={on} onchange={event => toggle(event.currentTarget.checked)} />
			<span class="title">Double to {claimScore(state, route, { terrain: { locomotives: 0 } })} points</span>
			<small
				>{[
					cards ? `${cards} ${name}` : '',
					terms.minLocomotives
						? `${terms.minLocomotives} ${terms.minLocomotives === 1 ? 'locomotive' : 'locomotives'}`
						: '',
				]
					.filter(Boolean)
					.join(' + ')}</small
			>
		</label>
	{:else}
		<span class="label"><span class="title">No doubling</span><small>{reason}</small></span>
	{/if}
</div>

<style>
	.terrain-double {
		display: flex;
		align-items: center;
		gap: 11px;
		padding: 8px 16px 8px 10px;
		border: 1px solid #c6b994;
		border-radius: 4px;
		background: #f8f0da;
		box-shadow: 2px 9px 14px #54422640;
		color: #2d2a24;
		transform: rotate(-1deg);
	}
	.card {
		width: 34px;
		flex-shrink: 0;
	}
	label,
	.label {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: center;
		column-gap: 8px;
		cursor: pointer;
	}
	.label {
		grid-template-columns: 1fr;
		cursor: default;
	}
	input {
		grid-row: span 2;
		width: 18px;
		height: 18px;
		accent-color: #9a2f22;
	}
	.title {
		font-size: 14px;
		font-weight: 700;
	}
	small {
		font-size: 12px;
		color: #6b5d45;
	}
	.unavailable {
		opacity: 0.85;
	}
	.unavailable .card {
		filter: grayscale(0.7);
	}
</style>
