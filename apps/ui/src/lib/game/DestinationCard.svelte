<script lang="ts">
	import { USA_CITIES, type DestinationTicket } from '@repo/shared';
	import { getTicketArtwork } from './ticket-art';

	let { ticket, complete = false }: { ticket: DestinationTicket; complete?: boolean } = $props();
	const cityNames = new Map(USA_CITIES.map(city => [city.id, city.name]));
	let punching = $state(false);
	let initialized = false;
	let wasComplete = false;

	$effect(() => {
		if (initialized && complete && !wasComplete) punching = true;
		wasComplete = complete;
		initialized = true;
	});
</script>

<span class="destination-card" class:complete class:punching>
	<span class="ticket-paper">
		<img src={getTicketArtwork(ticket)} alt="" loading="lazy" draggable="false" />
		<span class="route-name">
			<strong>{cityNames.get(ticket.cityA)}</strong>
			<span class="journey-line" aria-hidden="true"></span>
			<strong>{cityNames.get(ticket.cityB)}</strong>
		</span>
		<span class="ticket-stub">
			<strong class="ticket-points" aria-label={`${ticket.points} points`}>{ticket.points}</strong>
		</span>
		{#if complete}<span class="complete-mark" aria-label="Connected"></span>{/if}
	</span>
	{#if punching}
		<span class="paper-punch" aria-hidden="true" onanimationend={() => (punching = false)}></span>
	{/if}
</span>

<style>
	.destination-card {
		--stub-width: 18%;
		position: relative;
		display: block;
		isolation: isolate;
		width: 100%;
		height: 100%;
		min-height: 96px;
		aspect-ratio: 2.65;
		filter: drop-shadow(0 1px 0 #ae9671) drop-shadow(0 3px 2px #4a342d26) drop-shadow(0 8px 7px #37271626);
		text-align: left;
		user-select: none;
	}
	.ticket-paper {
		position: absolute;
		inset: 0;
		display: block;
		overflow: hidden;
		border-radius: 3px;
		background: linear-gradient(115deg, #fff9e9, #eee0c1);
		box-shadow:
			inset 0 0 0 1px #fff9e6,
			inset 0 0 0 4px #b99c6840,
			inset 0 0 0 5px #fff7e7;
		mask-image:
			radial-gradient(circle at 0 50%, transparent 5px, #000 5.6px),
			radial-gradient(circle at 100% 50%, transparent 5px, #000 5.6px);
		mask-composite: intersect;
	}
	img {
		position: absolute;
		inset: 5px auto 5px 5px;
		width: 41%;
		height: calc(100% - 10px);
		object-fit: cover;
		border-radius: 1px;
		filter: saturate(0.82);
		box-shadow: 1px 0 0 #a5876152;
	}
	.route-name {
		position: absolute;
		inset: 11px calc(var(--stub-width) + 7px) 11px 46%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 5px;
		color: #243744;
		font-size: clamp(13px, 0.94vw, 15px);
		line-height: 1.15;
	}
	.route-name strong {
		font-weight: 650;
	}
	.journey-line {
		position: relative;
		display: block;
		width: 23px;
		height: 1px;
		background: #947a515e;
	}
	.journey-line::after {
		position: absolute;
		right: 0;
		top: -2px;
		width: 4px;
		height: 4px;
		border-top: 1px solid #947a5199;
		border-right: 1px solid #947a5199;
		transform: rotate(45deg);
		content: '';
	}
	.ticket-stub {
		position: absolute;
		inset: 7px 0;
		left: calc(100% - var(--stub-width));
		display: grid;
		place-items: center;
		border-left: 1px dashed #b79b6e8c;
		background: linear-gradient(90deg, #b39c6c09, transparent 12%);
	}
	.ticket-points {
		color: #9d483b;
		font:
			700 29px Georgia,
			serif;
		font-variant-numeric: lining-nums;
		text-shadow: 0 1px #fff8e5;
	}
	.complete .ticket-paper {
		mask-image:
			radial-gradient(circle at 0 50%, transparent 5px, #000 5.6px),
			radial-gradient(circle at 100% 50%, transparent 5px, #000 5.6px),
			radial-gradient(circle at calc(100% - 22px) calc(100% - 20px), transparent 5px, #000 5.6px);
	}
	.complete-mark {
		position: absolute;
		right: 13px;
		bottom: 11px;
		width: 18px;
		height: 18px;
		border: 1px solid #53705c91;
		border-radius: 50%;
		box-shadow: inset 0 0 0 2px #7e8e6740;
	}
	.complete .ticket-points {
		color: #4d6752;
	}
	.punching .ticket-paper {
		animation: ticket-press 580ms cubic-bezier(0.2, 0.8, 0.25, 1) both;
	}
	.paper-punch {
		position: absolute;
		right: 17px;
		bottom: 15px;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #efe1c4;
		box-shadow: 0 2px 3px #46362430;
		pointer-events: none;
		animation: paper-fall 850ms cubic-bezier(0.22, 0.7, 0.3, 1) both;
	}
	@keyframes ticket-press {
		0%,
		22% {
			transform: translateY(0);
		}
		34% {
			transform: translateY(3px) scale(0.992);
		}
		60% {
			transform: translateY(-1px);
		}
		100% {
			transform: translateY(0);
		}
	}
	@keyframes paper-fall {
		0%,
		30% {
			transform: translate(0, 0);
			opacity: 1;
		}
		60% {
			transform: translate(9px, -16px) rotateX(130deg) rotateZ(30deg);
			opacity: 1;
		}
		100% {
			transform: translate(23px, 41px) rotateX(240deg) rotateZ(100deg);
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.punching .ticket-paper,
		.paper-punch {
			animation-duration: 1ms;
		}
	}
</style>
