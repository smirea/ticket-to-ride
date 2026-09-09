<script lang="ts">
	import type { CarriageFrame } from './board/carriage-sprites';
	let { frame }: { frame: CarriageFrame } = $props();
</script>

<svg
	width={frame.width}
	height={frame.height}
	viewBox={`${frame.sourceX} ${frame.sourceY} ${frame.frameSize} ${frame.frameSize}`}
	preserveAspectRatio="none"
	overflow="hidden"
	aria-hidden="true"
>
	<image href={frame.src} width={frame.sheetWidth} height={frame.sheetHeight} />
</svg>
