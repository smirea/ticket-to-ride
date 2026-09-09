<script lang="ts">
	import TicketIcon from 'phosphor-svelte/lib/TicketIcon';
	let { complete = false, width = 20, height = 16 }: { complete?: boolean; width?: number; height?: number } = $props();
</script>

<span class="ticket-icon" class:complete style:width={`${width}px`} style:height={`${height}px`} aria-hidden="true">
	{#if complete}
		<svg {width} {height} viewBox="0 0 24 18">
			<path d="M2 2h20v4a3 3 0 0 0 0 6v4H2v-4a3 3 0 0 0 0-6Z" fill="#f4f0d9" stroke="currentColor" stroke-width="1.5" />
			<path d="m8 9 3 3 5-6" fill="none" stroke="currentColor" stroke-width="2" />
		</svg>
	{:else}
		<TicketIcon size={width} weight="regular" />
	{/if}
</span>

<style>
	.ticket-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: none;
		vertical-align: middle;
		line-height: 0;
	}
	.ticket-icon :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
	}
	.complete {
		color: #397b50;
	}
</style>
