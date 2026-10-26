<script lang="ts">
	import type { GameState, Player } from '@repo/shared';
	import { shareCount } from '@repo/shared/mechanics/stocks';

	let { state, player }: { state: GameState; player: Player } = $props();
	const count = $derived(shareCount(state, player.id));
</script>

{#if count}
	<span class="share-badge" aria-label={`${count} stock ${count === 1 ? 'share' : 'shares'}`}
		><strong>{count}</strong><svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true"
			><rect
				x="0.6"
				y="0.6"
				width="14.8"
				height="10.8"
				rx="1"
				fill="none"
				stroke="currentColor"
				stroke-width="1.2"
			/><path d="M3 3.5h10M4 6.5h4M4 8.5h3" stroke="currentColor" /><circle
				cx="11.2"
				cy="7.6"
				r="1.8"
				fill="none"
				stroke="currentColor"
			/></svg
		></span
	>
{/if}

<style>
	.share-badge {
		display: inline-flex;
		align-items: center;
		gap: 3px;
	}
</style>
