<script lang="ts">
	import { GAME_MAPS } from '@repo/shared';
	import { boardArt } from '.';
	import { ATLAS_ASPECT, ATLAS_IMAGE, atlasPlace } from './atlas';

	let { selectedId, onselect }: { selectedId: string; onselect: (mapId: string) => void } = $props();
</script>

<div class="atlas" style:aspect-ratio={ATLAS_ASPECT} role="radiogroup" aria-label="Choose a map">
	<img src={ATLAS_IMAGE} alt="" draggable="false" />
	{#each GAME_MAPS as map (map.id)}
		{@const place = atlasPlace(map.id)}
		<button
			class="bubble"
			class:selected={map.id === selectedId}
			style:left={`${place.x * 100}%`}
			style:top={`${place.y * 100}%`}
			role="radio"
			aria-checked={map.id === selectedId}
			aria-label={`${map.name}, ${Math.min(...map.players)} to ${Math.max(...map.players)} players`}
			onclick={() => onselect(map.id)}
		>
			<span class="flag"><img src={boardArt(map.id).flag} alt="" draggable="false" /></span>
			<span class="name">{map.name}</span>
		</button>
	{/each}
</div>

<style>
	.atlas {
		position: relative;
		width: 100%;
		border-radius: 10px;
		overflow: hidden;
		background: #1c7ea2;
		box-shadow:
			0 1px 0 #e9dfbd,
			0 3px 0 #d1c4a3,
			0 5px 0 #967b50,
			0 14px 26px #4f40262e;
		user-select: none;
	}
	.atlas > img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
	.bubble {
		position: absolute;
		display: grid;
		justify-items: center;
		gap: 3px;
		padding: 0;
		border: 0;
		background: none;
		transform: translate(-50%, calc(-100% + 4px));
		cursor: pointer;
		z-index: 1;
	}
	.bubble.selected,
	.bubble:hover,
	.bubble:focus-visible {
		z-index: 2;
	}
	/* A pin: round flag on a short point that touches the map's place. */
	.flag {
		position: relative;
		display: block;
		width: clamp(30px, 3.6vw, 46px);
		aspect-ratio: 1;
		border: 3px solid #fff8e6;
		border-radius: 50% 50% 50% 0;
		rotate: -45deg;
		overflow: hidden;
		background: #fff8e6;
		box-shadow:
			0 2px 0 #b59a6a,
			0 6px 10px #1d2a2f66;
		transition:
			scale 160ms ease,
			border-color 160ms ease;
	}
	.flag img {
		position: absolute;
		inset: -20%;
		width: 140%;
		height: 140%;
		object-fit: cover;
		rotate: 45deg;
	}
	.name {
		order: -1;
		padding: 2px 8px 3px;
		border-radius: 999px;
		background: #fff8e6e6;
		color: #183243;
		font:
			700 clamp(10px, 1vw, 13px) Georgia,
			serif;
		white-space: nowrap;
		box-shadow: 0 2px 5px #1d2a2f40;
		opacity: 0;
		translate: 0 4px;
		transition:
			opacity 160ms ease,
			translate 160ms ease;
		pointer-events: none;
	}
	.bubble:hover .flag,
	.bubble:focus-visible .flag {
		scale: 1.12;
	}
	.bubble:hover .name,
	.bubble:focus-visible .name,
	.selected .name {
		opacity: 1;
		translate: 0 0;
	}
	.selected .flag {
		scale: 1.22;
		border-color: #f3c75b;
		box-shadow:
			0 2px 0 #a8742a,
			0 0 0 5px #f3c75b55,
			0 8px 14px #1d2a2f80;
	}
	.bubble:focus-visible {
		outline: none;
	}
	@media (prefers-reduced-motion: reduce) {
		.flag,
		.name {
			transition: none;
		}
	}
</style>
