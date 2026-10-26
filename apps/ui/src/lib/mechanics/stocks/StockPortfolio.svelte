<script lang="ts">
	import type { GameState } from '@repo/shared';
	import { RAILROADS, dummyShareCount, railroad, stocksState } from '@repo/shared/mechanics/stocks';
	import ShareCertificate from './ShareCertificate.svelte';

	let { state, viewerId }: { state: GameState; viewerId: string } = $props();
	const shares = $derived(stocksState(state).holdings[viewerId] ?? []);
	const owned = $derived(
		Object.keys(RAILROADS)
			.map(company => ({
				company,
				numbers: shares.filter(share => share.company === company).map(share => share.number),
			}))
			.filter(entry => entry.numbers.length > 0),
	);
	const dummy = $derived(dummyShareCount(state));
	const revealed = $derived(stocksState(state).dummy?.revealed);
</script>

{#if owned.length || dummy}
	<section class="portfolio" aria-label="Your stock shares">
		{#each owned as entry, index (entry.company)}
			<span
				class="held"
				style:--tilt={`${[-3, 2, -1.5, 3, -2.5][index % 5]}deg`}
				title={`${railroad(entry.company).short}: shares ${entry.numbers.join(', ')} · pays ${railroad(entry.company).points.join(' / ')}`}
			>
				<ShareCertificate
					company={entry.company}
					value={`×${entry.numbers.length}`}
					detail={`#${entry.numbers.join(' #')}`}
				/>
			</span>
		{/each}
		{#if dummy}
			<span class="dummy" title="The dummy shareholder’s face-down shares; half are revealed at the end">
				<strong>{revealed ? `${revealed.length}/${dummy}` : dummy}</strong><span>Dummy</span>
			</span>
		{/if}
	</section>
{/if}

<style>
	.portfolio {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 0;
		margin: 16px 12px 0 22px;
		padding-right: 10px;
	}
	.held {
		margin-right: -18px;
		transform: rotate(var(--tilt));
		transition: transform 160ms;
	}
	.held:hover {
		z-index: 1;
		transform: translateY(-4px) rotate(0deg);
	}
	.dummy {
		display: grid;
		place-items: center;
		width: 54px;
		height: 62px;
		margin-left: 26px;
		border: 1px dashed #9c8257;
		border-radius: 3px;
		background: #e9dcc0;
		color: #5c4a31;
		font:
			700 9px/1.2 Georgia,
			serif;
		transform: rotate(2deg);
	}
	.dummy strong {
		font-size: 17px;
	}
</style>
