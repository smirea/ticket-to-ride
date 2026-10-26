<script lang="ts">
	import type { GameState, Player } from '@repo/shared';
	import { bulletTrains } from '@repo/shared/mechanics/bullet-trains';
	import BulletTrainIcon from './BulletTrainIcon.svelte';

	let { state, player }: { state: GameState; player: Player } = $props();
	const progress = $derived(bulletTrains(state).progress[player.id] ?? 0);
</script>

<span class="bullet-track" aria-label={`${progress} on the bullet track`} title="Bullet track">
	<strong>{progress}</strong>
	<svg width="22" height="10" viewBox="-21 -6 42 12" aria-hidden="true"><BulletTrainIcon length={40} /></svg>
</span>

<style>
	.bullet-track {
		display: flex;
		align-items: center;
		gap: 3px;
		white-space: nowrap;
	}
	strong {
		font:
			600 15px/1 Georgia,
			serif;
	}
	svg {
		flex-shrink: 0;
	}
</style>
