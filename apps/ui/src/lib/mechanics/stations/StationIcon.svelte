<script lang="ts">
	let { color, size = 14 }: { color: string; size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
	<path d="M2 9.5 10 2l8 7.5V18H2Z" fill={color} stroke="#2a2118" stroke-width="1.4" stroke-linejoin="round" />
	<path d="M8 18v-5h4v5" fill="#fff4dc" stroke="#2a2118" stroke-width="1.2" />
</svg>
