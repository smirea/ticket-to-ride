<script lang="ts">
	import { railroad } from '@repo/shared/mechanics/stocks';
	import { RAILROAD_COLORS } from './railroads';

	let { company, value, detail, corner }: { company: string; value: string; detail?: string; corner?: string } =
		$props();
	const colors = $derived(RAILROAD_COLORS[company] ?? { band: '#6b5a3e', ink: '#fff' });
</script>

<span class="certificate" style:--band={colors.band} style:--ink={colors.ink}>
	<span class="band">{railroad(company).short}</span>
	<strong class="value">{value}</strong>
	{#if detail}<span class="detail">{detail}</span>{/if}
	{#if corner}<span class="corner">{corner}</span>{/if}
</span>

<style>
	.certificate {
		position: relative;
		display: grid;
		grid-template-rows: auto 1fr auto;
		justify-items: center;
		width: 74px;
		height: 62px;
		padding: 3px;
		border: 1px solid #b59f74;
		border-radius: 3px;
		background:
			repeating-linear-gradient(135deg, #0000 0 5px, color-mix(in srgb, var(--band) 7%, #0000) 5px 6px), #f8f0da;
		box-shadow:
			inset 0 0 0 2px #f8f0da,
			inset 0 0 0 3px color-mix(in srgb, var(--band) 55%, #f8f0da),
			0 1px 3px #3b2b1a40;
		color: #3a2d1f;
		font-family: Georgia, serif;
	}
	.band {
		width: 100%;
		padding: 1px 0;
		border-radius: 1px;
		background: var(--band);
		color: var(--ink);
		font:
			700 11px/14px Georgia,
			serif;
		letter-spacing: 0.04em;
		text-align: center;
	}
	.value {
		align-self: center;
		font-size: 17px;
		line-height: 1;
	}
	.detail {
		white-space: nowrap;
		font-size: 9px;
		line-height: 11px;
		letter-spacing: 0.02em;
		color: #6a5638;
		font-variant-numeric: tabular-nums;
	}
	.corner {
		position: absolute;
		top: 4px;
		right: 6px;
		color: var(--ink);
		font:
			700 9px/14px Georgia,
			serif;
	}
</style>
