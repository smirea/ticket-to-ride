<script lang="ts">
	import { gameMap, stationBorrowings, stationOwners, type GameState } from '@repo/shared';
	import { playerColors, type BoardLayout } from '$lib/game/board/layout';
	import StationIcon from './StationIcon.svelte';
	let { state: gameState, layout }: { state: GameState; layout: BoardLayout; viewerId: string } = $props();
	const map = $derived(gameMap(gameState));
	const colorOf = (playerId: string) => {
		const player = gameState.players.find(item => item.id === playerId);
		return player ? playerColors[player.color] : '#777';
	};
	const stations = $derived(
		Object.entries(stationOwners(gameState)).map(([cityId, owner]) => ({
			cityId,
			color: colorOf(owner),
			p: layout.cityPoint(map.city(cityId)!, 0),
		})),
	);
	// The borrowed routes only become final when the game ends, so they are shown then.
	const borrowed = $derived(
		gameState.phase.type === 'game-over'
			? gameState.players.flatMap(player =>
					stationBorrowings(gameState, player.id).map(route => ({
						key: `${player.id}-${route.id}`,
						color: colorOf(player.id),
						points: Array.from({ length: 17 }, (_, i) => layout.routePoint(route, i / 16))
							.map(p => `${p.x},${p.y}`)
							.join(' '),
					})),
				)
			: [],
	);
</script>

<g class="stations" aria-hidden="true">
	{#each borrowed as line (line.key)}
		<polyline class="borrowed" points={line.points} stroke={line.color} />
	{/each}
	{#each stations as station (station.cityId)}
		<g class="station" transform={`translate(${station.p.x - 24} ${station.p.y - 11})`}>
			<StationIcon color={station.color} size={20} />
		</g>
	{/each}
</g>

<style>
	.stations {
		pointer-events: none;
	}
	.station {
		filter: drop-shadow(0 0 1.5px #fff7e4) drop-shadow(0 1px 1px #2a211880);
	}
	.borrowed {
		fill: none;
		stroke-width: 3;
		stroke-dasharray: 2 4;
		stroke-linecap: round;
		opacity: 0.9;
	}
</style>
