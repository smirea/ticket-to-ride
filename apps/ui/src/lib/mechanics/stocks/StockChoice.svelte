<script lang="ts">
	import type { ClaimOptions, GameState, Route } from '@repo/shared';
	import {
		availableCompanies,
		bestShareChoice,
		hasDummy,
		railroad,
		routeCompanies,
		stocksState,
	} from '@repo/shared/mechanics/stocks';
	import ShareCertificate from './ShareCertificate.svelte';

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

	const viewer = $derived(state.players.find(player => player.id === viewerId));
	const stocks = $derived(stocksState(state));
	const choice = $derived(viewer ? bestShareChoice(state, viewer, route, value) : {});
	const companies = $derived(routeCompanies(route));
	const open = $derived(availableCompanies(state, route));
	const afterOwn = $derived.by(() => {
		if (!choice.company) return {};
		return { ...stocks.taken, [choice.company]: (stocks.taken[choice.company] ?? 0) + 1 };
	});
	const dummyOpen = $derived(choice.company ? availableCompanies(state, route, afterOwn) : []);
	const held = (company: string) => stocks.holdings[viewerId]?.filter(share => share.company === company).length ?? 0;

	// The highlighted default comes from what this viewer can see, so send it rather than let the server pick.
	$effect(() => {
		if (choice.company && (value.stockCompany !== choice.company || value.dummyCompany !== choice.dummyCompany)) {
			onchange({ stockCompany: choice.company, ...(choice.dummyCompany ? { dummyCompany: choice.dummyCompany } : {}) });
		}
	});

	function pickOwn(company: string) {
		const taken = { ...stocks.taken, [company]: (stocks.taken[company] ?? 0) + 1 };
		const keepDummy = value.dummyCompany && availableCompanies(state, route, taken).includes(value.dummyCompany);
		onchange({ stockCompany: company, ...(keepDummy ? { dummyCompany: value.dummyCompany } : {}) });
	}
</script>

{#if companies.length}
	<div class="stock-choice" role="group" aria-label="Stock share">
		<div class="row" role="radiogroup" aria-label="Your share">
			{#if hasDummy(state)}<span class="who">You</span>{/if}
			{#each companies as company (company)}
				{@const next = (stocks.taken[company] ?? 0) + 1}
				<button
					role="radio"
					aria-checked={choice.company === company}
					disabled={!open.includes(company)}
					onclick={() => pickOwn(company)}
					aria-label={open.includes(company)
						? `${railroad(company).short} share ${next} of ${railroad(company).shares}`
						: `${railroad(company).short}: no shares left`}
				>
					<ShareCertificate
						{company}
						value={open.includes(company) ? `${next}/${railroad(company).shares}` : '—'}
						detail={railroad(company).points.join('·')}
						corner={held(company) ? `×${held(company)}` : undefined}
					/>
				</button>
			{/each}
		</div>
		{#if hasDummy(state) && dummyOpen.length}
			<div class="row dummy" role="radiogroup" aria-label="Dummy's share">
				<span class="who">Dummy</span>
				{#each dummyOpen as company (company)}
					<button
						role="radio"
						aria-checked={choice.dummyCompany === company}
						onclick={() => onchange({ stockCompany: choice.company, dummyCompany: company })}
						aria-label={`Give the dummy a ${railroad(company).short} share`}
					>
						<ShareCertificate {company} value={`${(afterOwn[company] ?? 0) + 1}/${railroad(company).shares}`} />
					</button>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style>
	.stock-choice {
		display: grid;
		gap: 8px;
		padding: 10px 12px;
		border: 1px solid #c6b994;
		border-radius: 4px;
		background: #f3e9cf;
		box-shadow:
			0 2px #d8c9a3,
			0 10px 22px #2c211540;
	}
	.row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}
	.who {
		width: 46px;
		text-align: right;
		font:
			700 12px/1 Georgia,
			serif;
		color: #5c4a31;
	}
	button {
		padding: 0;
		border: 0;
		background: none;
		cursor: pointer;
		transition:
			transform 160ms,
			opacity 160ms;
		opacity: 0.72;
	}
	button:hover:not(:disabled),
	button:focus-visible {
		opacity: 1;
		transform: translateY(-2px);
	}
	button[aria-checked='true'] {
		opacity: 1;
		transform: translateY(-4px) rotate(-1.5deg);
		filter: drop-shadow(0 0 0.5px #3a2d1f) drop-shadow(0 4px 4px #3a2d1f55);
	}
	button:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}
	.dummy button {
		transform: scale(0.86);
	}
	.dummy button[aria-checked='true'] {
		transform: scale(0.86) translateY(-4px) rotate(-1.5deg);
	}
</style>
