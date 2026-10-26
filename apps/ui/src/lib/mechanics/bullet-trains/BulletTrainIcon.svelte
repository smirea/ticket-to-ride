<script lang="ts">
	// A top-down white Shinkansen pointing along +x, centred on the origin.
	let { length, outline = false }: { length: number; outline?: boolean } = $props();
	const scale = $derived(length / 40);
</script>

<g transform={`scale(${scale})`} class="bullet-train">
	<path class="body" class:hollow={outline} d="M-20 -4.6 H8 C14 -4.6 20 -2.2 20 0 C20 2.2 14 4.6 8 4.6 H-20 Z" />
	{#if !outline}
		<path class="stripe" d="M-20 -1.4 H10 C13 -1.4 15.5 -0.8 17 0 C15.5 0.8 13 1.4 10 1.4 H-20 Z" />
		<path class="window" d="M9.5 -3 C12.5 -2.6 14.8 -1.6 16 -0.6 H10.5 Z M9.5 3 C12.5 2.6 14.8 1.6 16 0.6 H10.5 Z" />
		<path class="joint" d="M-6 -4.6 V4.6" />
	{/if}
</g>

<style>
	.body {
		fill: #fbfbf7;
		stroke: #4f5a60;
		stroke-width: 0.9;
		filter: drop-shadow(0 1px 0.6px #1f2a3066);
	}
	.body.hollow {
		fill: none;
		stroke: #f6f3ea;
		stroke-width: 1.6;
		filter: none;
	}
	.stripe {
		fill: #2b5fa8;
	}
	.window {
		fill: #26343d;
	}
	.joint {
		stroke: #7c868b;
		stroke-width: 0.7;
	}
</style>
