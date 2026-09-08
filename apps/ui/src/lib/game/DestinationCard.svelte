<script lang="ts">
	import { USA_CITIES, type DestinationTicket } from '@repo/shared';
	import CheckCircleIcon from 'phosphor-svelte/lib/CheckCircleIcon';
	import { getTicketArtwork } from './ticket-art';
	let { ticket, complete = false }: { ticket: DestinationTicket; complete?: boolean } = $props();
	const cityNames = new Map(USA_CITIES.map(city => [city.id, city.name]));
</script>

<span class="destination-card" class:complete>
	<img src={getTicketArtwork(ticket)} alt="" loading="lazy" draggable="false" />
	<span class="route-name"
		><strong>{cityNames.get(ticket.cityA)}</strong><span>— {cityNames.get(ticket.cityB)}</span></span
	>
	<strong class="ticket-points" aria-label={`${ticket.points} points`}>{ticket.points}</strong>
	{#if complete}<span class="complete-mark"><CheckCircleIcon size={16} weight="fill" />Connected</span>{/if}
</span>

<style>
	.destination-card {
		position: relative;
		display: block;
		isolation: isolate;
		min-height: 120px;
		height: 100%;
		overflow: hidden;
		border: 5px solid #fcf5e4;
		border-radius: 7px;
		background: #efe5ce;
		outline: 1px solid #b4a7885c;
		box-shadow: 0 3px 7px #4c3b2526;
		text-align: left;
	}
	img {
		position: absolute;
		inset: 0;
		z-index: -1;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.route-name {
		display: inline-flex;
		flex-direction: column;
		max-width: calc(100% - 18px);
		margin: 7px;
		padding: 5px 7px;
		border-radius: 3px;
		background: #fff9e9ed;
		color: #182d3a;
		font-size: 12px;
		line-height: 1.35;
	}
	.ticket-points {
		position: absolute;
		bottom: 7px;
		right: 7px;
		display: grid;
		place-items: center;
		width: 35px;
		height: 35px;
		border: 2px solid #fff5de;
		border-radius: 50%;
		background: #ac453c;
		color: #fff9e8;
		font:
			700 21px Georgia,
			serif;
		box-shadow: 0 1px 3px #0003;
	}
	.complete-mark {
		position: absolute;
		bottom: 8px;
		left: 7px;
		display: flex;
		align-items: center;
		gap: 3px;
		padding: 3px 5px;
		background: #f7faebed;
		color: #336044;
		font-size: 10px;
		border-radius: 3px;
		font-weight: 700;
	}
	.complete {
		outline-color: #4e8052;
	}
</style>
