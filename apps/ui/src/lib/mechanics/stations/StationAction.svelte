<script lang="ts">
	import {
		TRAIN_COLORS,
		canBuildStation,
		cityName,
		gameMap,
		nextStationCost,
		stationOwners,
		type GameAction,
		type GameState,
		type TrainColor,
	} from '@repo/shared';
	import TrainCard from '$lib/game/TrainCard.svelte';
	import { playerColors } from '$lib/game/board/layout';
	import type { PickCity } from '$lib/mechanics';
	import StationIcon from './StationIcon.svelte';
	type Send = (action: GameAction) => unknown;
	let {
		state: gameState,
		viewerId,
		send,
		disabled,
		pickCity,
	}: { state: GameState; viewerId: string; send: Send; disabled: boolean; pickCity: PickCity } = $props();
	type Payment = { paymentColor: TrainColor; locomotives: number; cars: number };
	const player = $derived(gameState.players.find(item => item.id === viewerId));
	const cost = $derived(player ? nextStationCost(gameState, player.id) : undefined);
	let cityId = $state<string>();
	let picking = $state(false);
	const payments = $derived.by((): Payment[] => {
		if (!player || cost === undefined) return [];
		const options = TRAIN_COLORS.filter(color => player.hand[color] > 0).map(color => ({
			paymentColor: color,
			locomotives: Math.max(0, cost - player.hand[color]),
			cars: Math.min(cost, player.hand[color]),
		}));
		if (player.hand.locomotive >= cost) options.push({ paymentColor: 'red', locomotives: cost, cars: 0 });
		return options
			.filter(option => option.locomotives <= player.hand.locomotive)
			.sort((a, b) => a.locomotives - b.locomotives);
	});
	const freeCities = $derived(
		gameMap(gameState)
			.cities.map(city => city.id)
			.filter(id => !stationOwners(gameState)[id]),
	);

	async function start() {
		picking = true;
		const picked = await pickCity(freeCities, `Choose a city for your station`);
		picking = false;
		if (!picked) return;
		if (payments.length === 1) return build(picked, payments[0]!);
		cityId = picked;
	}
	async function build(city: string, payment: Payment) {
		cityId = undefined;
		if (!player || canBuildStation(gameState, player, city, payment.paymentColor, payment.locomotives)) return;
		await send({
			type: 'build-station',
			cityId: city,
			paymentColor: payment.paymentColor,
			locomotives: payment.locomotives,
		});
	}
	$effect(() => {
		if (disabled) cityId = undefined;
	});
</script>

{#if cost !== undefined && player}
	{#if cityId}
		<div class="station-payment" role="group" aria-label={`Pay for a station in ${cityName(gameState, cityId)}`}>
			<p><StationIcon color={playerColors[player.color]} size={16} /> {cityName(gameState, cityId)}</p>
			<div class="options">
				{#each payments as payment (`${payment.paymentColor}-${payment.locomotives}`)}
					<button
						onclick={() => build(cityId!, payment)}
						aria-label={`Pay ${payment.cars ? `${payment.cars} ${payment.paymentColor}` : ''}${payment.cars && payment.locomotives ? ' and ' : ''}${payment.locomotives ? `${payment.locomotives} locomotive` : ''}`}
					>
						{#each Array(payment.cars) as _}<span class="card"><TrainCard color={payment.paymentColor} /></span>{/each}
						{#each Array(payment.locomotives) as _}<span class="card"><TrainCard color="locomotive" /></span>{/each}
					</button>
				{/each}
			</div>
			<button class="cancel" onclick={() => (cityId = undefined)}>Cancel</button>
		</div>
	{:else}
		<button
			class="build-station"
			disabled={disabled || picking || payments.length === 0 || freeCities.length === 0}
			onclick={start}
			aria-label={`Build a station for ${cost} ${cost === 1 ? 'card' : 'cards'}`}
		>
			<StationIcon color={playerColors[player.color]} size={22} /><span>Station</span><small>{cost}</small>
		</button>
	{/if}
{/if}

<style>
	.build-station,
	.station-payment {
		align-self: start;
		margin: 12px 0 0 25px;
		border: 1px solid #c6b994;
		border-radius: 3px;
		background: #f8f0da;
		box-shadow:
			0 2px 0 #ccb991,
			2px 7px 9px #54422626;
	}
	.build-station {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 9px 18px;
		transform: rotate(1.5deg);
		transition: transform 170ms ease;
	}
	.build-station:hover:not(:disabled) {
		transform: rotate(0) translateY(-3px);
	}
	.build-station:disabled {
		opacity: 0.5;
	}
	.build-station span {
		font-size: 12px;
		font-weight: 600;
	}
	.build-station small {
		min-width: 18px;
		padding: 1px 5px;
		border-radius: 9px;
		background: #3a2f22;
		color: #fff4dc;
		font-size: 11px;
		font-weight: 700;
	}
	.station-payment {
		display: grid;
		gap: 8px;
		padding: 10px 12px;
		font-family: Georgia, serif;
	}
	.station-payment p {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 0;
		font-weight: 700;
	}
	.options {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.options button {
		display: flex;
		padding: 4px;
		border: 1px solid transparent;
		border-radius: 5px;
		background: none;
	}
	.options button:hover,
	.options button:focus-visible {
		border-color: #c2603e;
		background: #fff8e8;
	}
	.card {
		display: block;
		width: 26px;
		height: 38px;
		margin-right: -8px;
	}
	.card:last-child {
		margin-right: 0;
	}
	.cancel {
		justify-self: start;
		padding: 0;
		border: 0;
		background: none;
		color: #6b5a44;
		font-size: 12px;
		text-decoration: underline;
	}
</style>
