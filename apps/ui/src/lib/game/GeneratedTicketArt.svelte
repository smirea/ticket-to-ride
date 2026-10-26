<script lang="ts">
	import type { DestinationTicket } from '@repo/shared';
	import { boardLayout } from './board/layout';

	let { ticket, mapId }: { ticket: DestinationTicket; mapId: string } = $props();
	const ASPECT = 2.65;
	const layout = $derived(boardLayout(mapId));
	const ends = $derived.by(() => {
		const city = (id: string) => layout.map.city(id)!;
		const a = city(ticket.cityA),
			b = city(ticket.cityB);
		return a.positions
			.flatMap((_, i) => b.positions.map((_, j) => [layout.cityPoint(a, i), layout.cityPoint(b, j)] as const))
			.sort(([p, q], [r, s]) => Math.hypot(p.x - q.x, p.y - q.y) - Math.hypot(r.x - s.x, r.y - s.y))[0]!;
	});
	// Frames both cities with room for the title band, then widens to the ticket's shape inside the board.
	const view = $derived.by(() => {
		const [a, b] = ends;
		let width = Math.max(Math.abs(a.x - b.x) + 120, 260);
		let height = Math.max(Math.abs(a.y - b.y) + 150, width / ASPECT);
		width = Math.max(width, height * ASPECT);
		height = width / ASPECT;
		const scale = Math.min(1, layout.width / width, layout.height / height);
		width *= scale;
		height *= scale;
		const cx = (a.x + b.x) / 2,
			cy = (a.y + b.y) / 2 - height * 0.08;
		const x = Math.max(0, Math.min(layout.width - width, cx - width / 2));
		const y = Math.max(0, Math.min(layout.height - height, cy - height / 2));
		return { x, y, width, height, unit: width / 800 };
	});
	const names = $derived([layout.map.city(ticket.cityA)!.name, layout.map.city(ticket.cityB)!.name]);
	const arc = $derived.by(() => {
		const [a, b] = ends;
		const lift = Math.min(60, Math.hypot(a.x - b.x, a.y - b.y) * 0.18);
		return `M${a.x},${a.y} Q${(a.x + b.x) / 2},${(a.y + b.y) / 2 - lift} ${b.x},${b.y}`;
	});
</script>

<svg
	class="generated-ticket"
	class:long={ticket.long}
	viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
	preserveAspectRatio="xMidYMin slice"
	aria-hidden="true"
>
	<image href={layout.art.terrain} width={layout.width} height={layout.height} preserveAspectRatio="none" />
	<rect x={view.x} y={view.y} width={view.width} height={view.height * 0.3} fill="url(#ticket-band)" />
	<defs>
		<linearGradient id="ticket-band" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#fbf1d6" stop-opacity="0.95" />
			<stop offset="0.7" stop-color="#fbf1d6" stop-opacity="0.75" />
			<stop offset="1" stop-color="#fbf1d6" stop-opacity="0" />
		</linearGradient>
	</defs>
	<path class="arc-under" d={arc} stroke-width={9 * view.unit} />
	<path class="arc" d={arc} stroke-width={4 * view.unit} stroke-dasharray={`${10 * view.unit} ${7 * view.unit}`} />
	{#each ends as point}
		<circle cx={point.x} cy={point.y} r={15 * view.unit} class="hub" stroke-width={3 * view.unit} />
		<circle cx={point.x} cy={point.y} r={7 * view.unit} class="center" />
	{/each}
	<text
		x={view.x + view.width * 0.47}
		y={view.y + view.height * 0.19}
		font-size={Math.min(64, 1100 / Math.max(14, names.join(' — ').length)) * view.unit}
		stroke-width={8 * view.unit}>{names[0]} — {names[1]}</text
	>
</svg>

<style>
	.generated-ticket {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		transition: filter 500ms ease;
	}
	.arc-under {
		fill: none;
		stroke: #fff7da;
		opacity: 0.9;
	}
	.arc {
		fill: none;
		stroke: #b04a2f;
	}
	.hub {
		fill: #fffae7;
		stroke: #8b5b33;
	}
	.center {
		fill: #7e5b39;
	}
	text {
		fill: #142d4a;
		font-family: Georgia, 'Times New Roman', serif;
		font-weight: 700;
		text-anchor: middle;
		dominant-baseline: middle;
		paint-order: stroke;
		stroke: #fbf1d6;
		stroke-linejoin: round;
		letter-spacing: -0.02em;
	}
</style>
