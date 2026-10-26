<script lang="ts">
	import {
		currentPlayer,
		routeName,
		tunnelPayment,
		type GameAction,
		type GameState,
		type TrainCard as Card,
	} from '@repo/shared';
	import CardPayment from '$lib/game/CardPayment.svelte';
	import TrainCard from '$lib/game/TrainCard.svelte';
	let {
		state: gameState,
		viewerId,
		send,
		disabled,
	}: { state: GameState; viewerId: string; send: (action: GameAction) => unknown; disabled: boolean } = $props();
	const phase = $derived(gameState.phase.type === 'tunnel' ? gameState.phase : undefined);
	const mine = $derived(currentPlayer(gameState).id === viewerId);
	// Each way to pay the extra cards, from fewest locomotives up.
	const payments = $derived.by(() => {
		if (!phase || !mine) return [];
		const player = currentPlayer(gameState);
		return Array.from({ length: phase.extra + 1 }, (_, locomotives) => locomotives).filter(
			locomotives => typeof tunnelPayment(phase, player, locomotives) !== 'string',
		);
	});
	const matches = (card: Card) =>
		card === 'locomotive' || (phase !== undefined && phase.payment.cars > 0 && card === phase.payment.color);
</script>

{#if phase}
	<section class="tunnel-panel" aria-label="Tunnel">
		<p class="route">{routeName(gameState, phase.claim.routeId)}</p>
		<div class="revealed" aria-label="Revealed cards">
			{#each phase.revealed as card, index (index)}
				<span class="card" class:match={matches(card)}><TrainCard color={card} /></span>
			{/each}
		</div>
		<p class="extra">+{phase.extra} {phase.extra === 1 ? 'card' : 'cards'}</p>
		{#if mine}
			<div class="choices">
				{#each payments as locomotives (locomotives)}
					{@const cars = phase.payment.cars > 0 ? phase.extra - locomotives : 0}
					<button
						class="pay"
						{disabled}
						onclick={() => send({ type: 'pay-tunnel', locomotives })}
						aria-label={`Pay ${cars ? `${cars} ${phase.payment.color}` : ''}${cars && locomotives ? ' and ' : ''}${locomotives ? `${locomotives} locomotive` : ''}`}
					>
						<CardPayment color={phase.payment.color} {cars} {locomotives} />
					</button>
				{/each}
				<button class="give-up" {disabled} onclick={() => send({ type: 'abandon-tunnel' })}>Give up</button>
			</div>
		{/if}
	</section>
{/if}

<style>
	.tunnel-panel {
		display: grid;
		gap: 8px;
		margin: 12px 0 0 18px;
		padding: 10px 12px 12px;
		border: 1px solid #c6b994;
		border-radius: 3px;
		background: #f8f0da;
		box-shadow:
			0 2px 0 #ccb991,
			2px 7px 9px #54422626;
		font-family: Georgia, serif;
		transform: rotate(-1deg);
	}
	p {
		margin: 0;
	}
	.route {
		font-weight: 700;
	}
	.revealed {
		display: flex;
		gap: 6px;
	}
	.card {
		display: block;
		width: 40px;
		height: 58px;
		opacity: 0.5;
	}
	.card.match {
		opacity: 1;
		outline: 2px solid #c2603e;
		outline-offset: 2px;
		border-radius: 7px;
	}
	.extra {
		color: #9c3f2a;
		font-weight: 700;
	}
	.choices {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
	}
	.pay {
		display: flex;
		padding: 4px;
		border: 1px solid #c6b994;
		border-radius: 5px;
		background: #fff8e8;
	}
	.pay:hover:not(:disabled) {
		border-color: #c2603e;
	}
	.give-up {
		padding: 6px 12px;
		border: 1px solid #b89a6a;
		border-radius: 3px;
		background: none;
		font-size: 12px;
	}
	button:disabled {
		opacity: 0.5;
	}
</style>
