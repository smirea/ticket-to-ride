<script lang="ts">
	import type { DestinationTicket, GameState } from '@repo/shared';
	import { mandalaTicketIds } from '@repo/shared/mechanics/mandalas';

	let { state, viewerId, ticket }: { state: GameState; viewerId: string; ticket: DestinationTicket } = $props();
	const earned = $derived(mandalaTicketIds(state, viewerId).includes(ticket.id));
	const petals = Array.from({ length: 8 }, (_, index) => index * 45);
</script>

{#if earned}
	<span class="mandala-stamp" role="img" aria-label="Mandala: joined by two separate paths" title="Mandala">
		<svg viewBox="-20 -20 40 40" aria-hidden="true">
			<circle r="18" class="stamp-ring" />
			<circle r="15" class="stamp-ring thin" />
			{#each petals as angle (angle)}
				<path d="M0 -4 C 4 -7, 4 -11, 0 -13.5 C -4 -11, -4 -7, 0 -4 Z" transform={`rotate(${angle})`} />
			{/each}
			<circle r="2.6" />
		</svg>
	</span>
{/if}

<style>
	.mandala-stamp {
		position: absolute;
		bottom: 9px;
		right: 62px;
		width: 38px;
		height: 38px;
		color: #a2264f;
		opacity: 0.86;
		transform: rotate(-12deg);
		mix-blend-mode: multiply;
		pointer-events: none;
	}
	svg {
		display: block;
		width: 100%;
		height: 100%;
		fill: currentColor;
	}
	.stamp-ring {
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
	}
	.stamp-ring.thin {
		stroke-width: 0.8;
	}
</style>
