<script lang="ts">
	import type { TrainCard } from '@repo/shared';
	let {
		color,
		x,
		y,
		size = '100%',
	}: { color: Exclude<TrainCard, 'locomotive'>; x?: number; y?: number; size?: number | string } = $props();
	const symbols = {
		red: 'M13 2c1 5-5 6-5 10-2-1-2-3-2-3-5 8 0 13 6 13 6 0 10-6 5-12 0 3-2 4-3 4 2-5 0-9-1-12Z',
		orange: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
		yellow: 'M4 3h16L4 21h16L4 3Z',
		green: 'M12 10C3-3-3 10 10 12-3 21 10 27 12 14c9 13 15 0 2-2C27 3 14-3 12 10Z',
		blue: 'M3 17c4 6 17 5 18-4 1-8-10-13-14-6-3 5 4 10 7 6 2-3-2-5-3-3M3 17c2-3 6-3 9-1',
		purple: 'M12 2C9 7 4 11 4 15a8 8 0 0 0 16 0c0-4-5-8-8-13Z',
		black: 'M12 2 22 12 12 22 2 12Z',
		white: 'M12 2v20M3.4 7l17.2 10M3.4 17 20.6 7',
	};
</script>

<svg {x} {y} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
	<path d={symbols[color]} />
</svg>

<style>
	svg {
		display: block;
		overflow: visible;
		fill: none;
		stroke: currentColor;
		stroke-width: 2.2;
		stroke-linecap: round;
		stroke-linejoin: round;
		pointer-events: none;
	}
</style>
