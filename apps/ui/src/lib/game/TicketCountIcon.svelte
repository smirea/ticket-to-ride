<script lang="ts">
	let { complete = false, width = 20, height = 16 }: { complete?: boolean; width?: number; height?: number } = $props();
</script>

<svg {width} {height} viewBox="0 0 24 18" aria-hidden="true">
	<path d="M2 2h20v4a3 3 0 0 0 0 6v4H2v-4a3 3 0 0 0 0-6Z" fill="none" stroke="currentColor" stroke-width="1.5" />
	{#if complete}<path d="m8 9 3 3 5-6" fill="none" stroke="currentColor" stroke-width="2" />
	{:else}<path
			d="M9 5v8M14 6h4M14 10h4"
			fill="none"
			stroke="currentColor"
			stroke-width="1.2"
			stroke-dasharray="2 1"
		/>{/if}
</svg>
