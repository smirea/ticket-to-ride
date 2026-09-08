<script lang="ts">
	let { compact = false, href = '/' }: { compact?: boolean; href?: string } = $props();
</script>

<a class:compact class="brand" {href} aria-label="Ticket to Travel — home">
	<img src="/game-assets/atlas/logo.webp" alt="Ticket to Travel" width="434" height="145" />
</a>

<style>
	.brand {
		display: block;
		width: 300px;
		height: 70px;
		overflow: hidden;
		flex-shrink: 0;
	}
	img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		mix-blend-mode: darken;
	}
	.compact {
		width: 238px;
		height: 57px;
	}
	@media (min-width: 1400px) {
		.compact {
			width: 305px;
			height: 70px;
		}
	}
	@media (max-width: 680px) {
		.brand,
		.compact {
			width: 215px;
			height: 52px;
		}
	}
</style>
