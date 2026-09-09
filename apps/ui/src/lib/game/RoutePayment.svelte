<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { scale } from 'svelte/transition';
	import XIcon from 'phosphor-svelte/lib/XIcon';
	import TrainPieceIcon from './TrainPieceIcon.svelte';
	import PointsSeal from './PointsSeal.svelte';
	import { routeColors } from './board/layout';
	import type { RoutePayment } from './route-payments';
	let {
		routeId,
		options,
		points,
		reduceMotion,
		onchoose,
		onclose,
		onpreview,
	}: {
		routeId: string;
		options: RoutePayment[];
		points: number;
		reduceMotion: boolean;
		onchoose: (payment: RoutePayment) => void;
		onclose: () => void;
		onpreview: (payment: RoutePayment | undefined) => void;
	} = $props();
	let container = $state<HTMLDivElement>();
	let x = $state(0),
		y = $state(0),
		placed = $state(false);
	let viewportWidth = $state(1600),
		viewportHeight = $state(1000);
	let active = $state<number>();
	const radius = 36;
	function pinPath(hx: number, hy: number, ox = 0, oy = 0) {
		const distance = Math.hypot(hx, hy);
		const ux = hx / distance,
			uy = hy / distance;
		const along = (radius * radius) / distance;
		const side = radius * Math.sqrt(1 - (radius / distance) ** 2);
		const ax = hx - ux * along - uy * side,
			ay = hy - uy * along + ux * side;
		const bx = hx - ux * along + uy * side,
			by = hy - uy * along - ux * side;
		return `M${ox} ${oy} L${ax + ox} ${ay + oy} A${radius} ${radius} 0 1 0 ${bx + ox} ${by + oy} Z`;
	}
	function position() {
		const path = document.querySelector<SVGPathElement>(`#route-${routeId} .route-hitbox`);
		const matrix = path?.getScreenCTM();
		if (!path || !matrix || !container) return;
		const midpoint = path.getPointAtLength(path.getTotalLength() / 2);
		const anchor = new DOMPoint(midpoint.x, midpoint.y).matrixTransform(matrix);
		x = anchor.x;
		y = anchor.y;
		viewportWidth = innerWidth;
		viewportHeight = innerHeight;
		placed = true;
	}
	const heads = $derived.by(() => {
		if (!placed) return [];
		const spread = (Math.min(154, Math.max(44, (options.length - 1) * 32)) * Math.PI) / 180;
		const reach = Math.max(100, 82 / (2 * Math.sin(spread / (2 * Math.max(1, options.length - 1)))));
		const below = y < reach + radius + 18 && viewportHeight - y > y;
		const centers = options.map((_, i) => {
			const angle = (below ? Math.PI / 2 : -Math.PI / 2) + (i / Math.max(1, options.length - 1) - 0.5) * spread;
			return { x: Math.cos(angle) * reach, y: Math.sin(angle) * reach };
		});
		const minX = Math.min(...centers.map(p => x + p.x - radius));
		const maxX = Math.max(...centers.map(p => x + p.x + radius));
		const minY = Math.min(...centers.map(p => y + p.y - radius));
		const maxY = Math.max(...centers.map(p => y + p.y + radius));
		const dx = minX < 16 ? 16 - minX : maxX > viewportWidth - 16 ? viewportWidth - 16 - maxX : 0;
		const dy = minY < 16 ? 16 - minY : maxY > viewportHeight - 16 ? viewportHeight - 16 - maxY : 0;
		return centers.map(p => {
			const hx = p.x + dx,
				hy = p.y + dy;
			const left = Math.min(0, hx - radius),
				top = Math.min(0, hy - radius);
			return {
				x: hx,
				y: hy,
				left,
				top,
				width: Math.max(0, hx + radius) - left,
				height: Math.max(0, hy + radius) - top,
				path: pinPath(hx, hy),
				hitPath: pinPath(hx, hy, -left, -top),
			};
		});
	});
	function preview(index?: number) {
		active = index;
		onpreview(index === undefined ? undefined : options[index]);
	}
	$effect(() => {
		if (routeId && options.length) {
			preview();
			void tick().then(position);
		}
	});
	onMount(() => {
		position();
		void tick().then(() =>
			container?.querySelector<HTMLButtonElement>('.payment-option')?.focus({ preventScroll: true }),
		);
		const outside = (event: PointerEvent) => {
			const target = event.target as Node;
			if (!container?.contains(target) && !(target instanceof Element && target.closest('.route.available'))) onclose();
		};
		const keyboard = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				onclose();
			}
		};
		window.addEventListener('pointerdown', outside);
		window.addEventListener('keydown', keyboard);
		window.addEventListener('resize', position);
		window.addEventListener('scroll', position, true);
		return () => {
			onpreview(undefined);
			window.removeEventListener('pointerdown', outside);
			window.removeEventListener('keydown', keyboard);
			window.removeEventListener('resize', position);
			window.removeEventListener('scroll', position, true);
		};
	});
</script>

<div
	class="route-payment"
	role="dialog"
	aria-label={`Choose route payment, ${points} point${points === 1 ? '' : 's'}`}
	bind:this={container}
	style:left={`${x}px`}
	style:top={`${y}px`}
	style:visibility={placed ? 'visible' : 'hidden'}
	transition:scale={{ start: 0.15, duration: reduceMotion ? 0 : 220 }}
>
	<svg class="pin-shapes" width="1" height="1" aria-hidden="true">
		{#each heads as head, i}
			<g class:active={active === i}>
				<path d={head.path} fill={options[i]!.cars ? routeColors[options[i]!.color] : '#405e65'} />
				<circle cx={head.x} cy={head.y} r="29" />
			</g>
		{/each}
	</svg>
	{#each heads as head, i}
		{@const payment = options[i]!}
		<button
			class="payment-option"
			style:left={`${head.left}px`}
			style:top={`${head.top}px`}
			style:width={`${head.width}px`}
			style:height={`${head.height}px`}
			style:clip-path={`path('${head.hitPath}')`}
			onpointerenter={() => preview(i)}
			onpointerleave={() => preview()}
			onfocus={() => preview(i)}
			onblur={() => preview()}
			onclick={() => onchoose(payment)}
			aria-label={`Claim with ${payment.cars ? `${payment.cars} ${payment.color} car${payment.cars === 1 ? '' : 's'}` : ''}${payment.cars && payment.wilds ? ' and ' : ''}${payment.wilds ? `${payment.wilds} locomotive${payment.wilds === 1 ? '' : 's'}` : ''}`}
		>
			<span
				class="pin-cost"
				style:left={`${head.x - radius - head.left}px`}
				style:top={`${head.y - radius - head.top}px`}
			>
				{#if payment.cars}<span class="cost"
						><strong>{payment.cars}</strong><TrainPieceIcon color={routeColors[payment.color]} /></span
					>{/if}
				{#if payment.wilds}<span class="cost"
						><strong>{payment.wilds}</strong><TrainPieceIcon color="#3c5159" locomotive /></span
					>{/if}
			</span>
		</button>
	{/each}
	<div class="anchor"><PointsSeal value={points} /></div>
	<button class="close" aria-label="Cancel route payment" onclick={onclose}><XIcon size={14} /></button>
</div>

<style>
	.route-payment {
		position: fixed;
		z-index: 80;
		width: 0;
		height: 0;
		transform-origin: 0 0;
		color: #263d42;
		pointer-events: none;
	}
	.pin-shapes {
		position: absolute;
		inset: 0;
		overflow: visible;
		pointer-events: none;
		filter: drop-shadow(1px 3px 2px #33281855);
	}
	.pin-shapes path {
		stroke: #b09a6c;
		stroke-width: 1.8;
		stroke-linejoin: round;
	}
	.pin-shapes circle {
		fill: #fff3d9;
		stroke: #efdcaa;
		stroke-width: 1;
	}
	.pin-shapes g {
		transition: filter 130ms;
	}
	.pin-shapes .active {
		filter: brightness(1.12) drop-shadow(0 0 3px #fff0c2);
	}
	.payment-option {
		position: absolute;
		width: 72px;
		height: 72px;
		border: 0;
		padding: 0;
		background: none;
		color: inherit;
		pointer-events: auto;
		cursor: pointer;
	}
	.pin-cost {
		position: absolute;
		width: 72px;
		height: 72px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		transition: transform 130ms;
	}
	.payment-option:hover .pin-cost,
	.payment-option:focus-visible .pin-cost {
		transform: translateY(-2px);
	}
	.payment-option:focus-visible {
		outline: 2px solid #fff6d4;
		outline-offset: 3px;
	}
	.cost {
		display: flex;
		align-items: center;
		gap: 3px;
		height: 23px;
	}
	strong {
		font:
			700 19px/1 Georgia,
			serif;
	}
	.anchor {
		position: absolute;
		width: 50px;
		height: 50px;
		left: -25px;
		top: -25px;
		--seal-number-size: 26px;
	}
	.close {
		position: absolute;
		left: 32px;
		top: -10px;
		width: 22px;
		height: 22px;
		display: grid;
		place-items: center;
		border: 1px solid #b19a70;
		border-radius: 50%;
		background: #fff3d9;
		color: #384847;
		pointer-events: auto;
		cursor: pointer;
		box-shadow: 0 2px 4px #382d2733;
	}
	@media (prefers-reduced-motion: reduce) {
		.pin-shapes g,
		.pin-cost {
			transition: none;
		}
	}
</style>
