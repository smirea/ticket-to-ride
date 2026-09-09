<script lang="ts">
	import type { Player } from '@repo/shared';
	import { playerPortraitAssets } from './assets';
	import PointsSeal from './PointsSeal.svelte';
	import TrainPieceIcon from './TrainPieceIcon.svelte';
	import GearSixIcon from 'phosphor-svelte/lib/GearSixIcon';
	let {
		player,
		viewerId,
		active,
		color,
		index = 0,
	}: { player: Player; viewerId: string; active: boolean; color: string; index?: number } = $props();
</script>

<div
	class="player-plaque"
	class:active
	style:--player-color={color}
	style:--rest-angle={`${[-0.7, 0.6, -0.4, 0.8, -0.6][index % 5]}deg`}
	aria-label={`${player.name}: ${player.score} points, ${player.trains} trains, ${Object.values(player.hand).reduce((sum, count) => sum + count, 0)} cards, ${player.tickets.length} tickets`}
	aria-current={active ? 'true' : undefined}
>
	<div class="portrait">
		<img src={playerPortraitAssets[player.color]} alt="" draggable="false" />
	</div>
	<div class="ledger">
		<strong class="name" title={player.name}>{player.id === viewerId ? 'You' : player.name}</strong>
		<div class="score"><span class="points-icon"><PointsSeal /></span><strong>{player.score}</strong></div>
		<div class="trains">
			<TrainPieceIcon color="currentColor" width={24} height={21} /><strong>{player.trains}</strong>
		</div>
	</div>
	<span class="turn-gear" class:turning={active} aria-hidden="true"><GearSixIcon size={15} weight="duotone" /></span>
</div>

<style>
	.player-plaque {
		position: relative;
		display: grid;
		grid-template-columns: 42% minmax(0, 1fr);
		gap: 8px;
		flex: 0 1 174px;
		width: clamp(128px, 11.2vw, 174px);
		min-width: 0;
		height: 112px;
		padding: 7px 8px 7px 7px;
		border: 1px solid #9c8257;
		border-radius: 10px 5px 9px 5px;
		background: linear-gradient(
			115deg,
			color-mix(in srgb, var(--player-color) 78%, #342d28),
			color-mix(in srgb, var(--player-color) 65%, #231e20)
		);
		color: #fff3d6;
		box-shadow:
			inset 0 0 0 2px #e9d2a6,
			inset 0 0 0 3px #96774988,
			0 2px #b89c6a,
			0 4px #705d3e,
			3px 8px 9px #34271d33;
		transform: rotate(var(--rest-angle));
		transform-origin: 50% 80%;
		transition:
			transform 330ms cubic-bezier(0.2, 0.8, 0.2, 1),
			box-shadow 330ms,
			background 330ms,
			color 330ms;
		user-select: none;
	}
	.player-plaque::after {
		content: '';
		position: absolute;
		inset: 4px;
		border: 1px solid color-mix(in srgb, var(--player-color) 55%, transparent);
		border-radius: 6px 2px 5px 2px;
		pointer-events: none;
	}
	.active {
		transform: translateY(-8px) rotate(-0.3deg);
		background: linear-gradient(
			115deg,
			color-mix(in srgb, var(--player-color) 78%, #342d28),
			color-mix(in srgb, var(--player-color) 65%, #231e20)
		);
		color: #fff3d6;
		box-shadow:
			inset 0 0 0 2px #e6c98d,
			inset 0 0 0 3px #987445,
			0 2px #b69b65,
			0 4px #695535,
			4px 17px 15px #30261950;
		z-index: 2;
	}
	.portrait {
		position: relative;
		min-width: 0;
		overflow: hidden;
		border-radius: 4px 1px 3px 1px;
		border: 1px solid #a4895b99;
		background: #d0bb91;
	}
	.portrait img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: 50% 32%;
		transform: scale(1.08);
	}
	.ledger {
		min-width: 0;
		display: grid;
		grid-template-rows: 23px 1fr 29px;
	}
	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font:
			700 15px/22px Georgia,
			serif;
		border-bottom: 1px solid #ead5a33d;
	}
	.active .name {
		border-color: #ead5a33d;
	}
	.score,
	.trains {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.score > strong {
		font:
			600 clamp(20px, 2vw, 29px)/1 Georgia,
			serif;
		font-variant-numeric: lining-nums;
	}
	.points-icon {
		width: 23px;
		height: 23px;
		flex-shrink: 0;
	}
	.trains {
		border-top: 1px solid #ead5a32e;
	}
	.active .trains {
		border-color: #ead5a32e;
	}
	.trains strong {
		font:
			600 20px/1 Georgia,
			serif;
	}
	.turn-gear {
		position: absolute;
		right: 7px;
		bottom: 7px;
		width: 15px;
		height: 15px;
		color: #f5d99e;
		opacity: 0;
		pointer-events: none;
		transition: opacity 240ms;
		animation: clockwork 9s linear infinite;
		animation-play-state: paused;
	}
	.turn-gear.turning {
		opacity: 0.85;
		animation-play-state: running;
	}
	@keyframes clockwork {
		to {
			transform: rotate(360deg);
		}
	}
	@media (max-width: 1100px) {
		.player-plaque {
			flex: 1 1 0;
			width: auto;
			max-width: 178px;
			height: 99px;
			gap: 5px;
			padding: 6px;
		}
		.ledger {
			grid-template-rows: 21px 1fr 24px;
		}
		.name {
			font-size: 13px;
		}
		.points-icon {
			width: 20px;
			height: 20px;
		}
		.trains strong {
			font-size: 18px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.turn-gear {
			animation: none;
			transition: none;
		}
		.player-plaque {
			transition: none;
		}
	}
</style>
