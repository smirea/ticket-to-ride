<script lang="ts">
	let {
		color = 'currentColor',
		locomotive = false,
		width = 28,
		height = 23,
	}: { color?: string; locomotive?: boolean; width?: number; height?: number } = $props();
</script>

<svg viewBox="0 0 32 24" aria-hidden="true" style:color style:width={`${width}px`} style:height={`${height}px`}>
	{#if locomotive}
		<path d="M3 17V8h8v5h3V9h3V4h4v9h4l3 6H3Z" />
		<path class="window" d="M5 10h4v5H5Z" />
		<path class="smoke" d="M20 2c-4-3-7 2-11-1" />
	{:else}
		<path d="M3 7h26v12H3ZM2 7l3-3h22l3 3Z" />
		<path class="window" d="M6 9h4v5H6Zm8 0h4v5h-4Zm8 0h4v5h-4Z" />
	{/if}
	<path class="underframe" d="M1 19h30" />
	<circle cx="8" cy="20" r="2.5" /><circle cx="24" cy="20" r="2.5" />
</svg>

<style>
	svg {
		width: 28px;
		height: 23px;
		overflow: visible;
		fill: currentColor;
		stroke: #3c3938;
		stroke-width: 1;
		stroke-linejoin: round;
	}
	.window {
		fill: #fff5dc;
		stroke-width: 0.65;
	}
	.smoke {
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
	}
	.underframe {
		stroke-width: 1.6;
	}
</style>
