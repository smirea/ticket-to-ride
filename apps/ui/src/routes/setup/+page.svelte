<script lang="ts">
	import Brand from '$lib/game/Brand.svelte';
</script>

<svelte:head>
	<title>New Game — Ticket to Travel</title>
</svelte:head>

<main>
	<nav><Brand /><a class="back" href="/">← Home</a></nav>
	<section>
		<div class="heading">
			<p>Single player</p>
			<h1>Ready the passengers.</h1>
			<span>Choose who will join your cross-country race.</span>
			<img
				src="/game-assets/atlas/tickets/chicago-santa-fe.webp"
				alt="Illustrated destinations from Chicago to Santa Fe"
				width="768"
				height="512"
			/>
		</div>

		<form action="/game" method="get">
			<input type="hidden" name="new" value="1" />
			<label>
				<span>Your name</span>
				<input name="name" value="You" maxlength="24" autocomplete="nickname" required />
			</label>

			<label>
				<span>Rival conductors</span>
				<select name="bots">
					<option value="1">1 rival · quick game</option>
					<option value="2">2 rivals</option>
					<option value="3">3 rivals · classic table</option>
					<option value="4">4 rivals · full table</option>
				</select>
			</label>

			<div class="details">
				<div><strong>Map</strong><span>Classic USA</span></div>
				<div><strong>Rules</strong><span>Standard</span></div>
				<div><strong>Save</strong><span>Automatic</span></div>
			</div>

			<button type="submit">Deal the tickets <span aria-hidden="true">→</span></button>
		</form>
	</section>
</main>

<style>
	main {
		min-height: 100svh;
		padding-bottom: 4rem;
		background: #f7f3e9;
		color: #142d3e;
	}
	nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.4rem clamp(1.25rem, 5vw, 5rem);
		border-bottom: 1px solid #dcd6c7;
	}
	.back {
		color: #667076;
		font-size: 0.78rem;
		font-weight: 700;
		text-decoration: none;
	}
	section {
		display: grid;
		grid-template-columns: 1fr 1fr;
		width: min(64rem, calc(100% - 3rem));
		margin: clamp(2rem, 5vw, 5rem) auto 0;
		border: 1px solid #d8d0bf;
		border-radius: 0.6rem;
		overflow: hidden;
		background: #fffcf5;
		box-shadow: 0 12px 35px #75613f12;
	}
	.heading,
	form {
		padding: clamp(1.5rem, 4vw, 3.4rem);
	}
	.heading {
		border-right: 1px solid #ded7c8;
		background: #f1ebdd;
	}
	.heading p {
		margin: 0 0 1.5rem;
		color: #a34a3d;
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.15em;
		text-transform: uppercase;
	}
	h1 {
		margin: 0 0 1.25rem;
		font-family: Georgia, serif;
		font-size: clamp(2.5rem, 4.5vw, 4.2rem);
		font-weight: 400;
		letter-spacing: -0.04em;
		line-height: 1.02;
	}
	.heading span {
		color: #647077;
		font-size: 0.9rem;
		line-height: 1.7;
	}
	.heading img {
		display: block;
		width: 100%;
		height: 180px;
		object-fit: cover;
		margin-top: 2rem;
		border: 5px solid #fffcf5;
		box-shadow: 0 3px 10px #75613f18;
	}
	form {
		display: grid;
		align-content: center;
		gap: 1.5rem;
	}
	label {
		display: grid;
		gap: 0.55rem;
	}
	label > span,
	.details strong {
		color: #637076;
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	input,
	select {
		width: 100%;
		min-height: 46px;
		border: 1px solid #cfc7b6;
		border-radius: 0.35rem;
		padding: 0.8rem 0.9rem;
		background: #fffef9;
		color: #142d3e;
		font: inherit;
	}
	input:focus,
	select:focus {
		outline: 2px solid #698ba3;
		outline-offset: 2px;
	}
	.details {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
		border-top: 1px solid #ded7c8;
		padding-top: 1.25rem;
	}
	.details div {
		display: grid;
		gap: 0.4rem;
	}
	.details span {
		color: #647077;
		font-size: 0.78rem;
	}
	button {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 48px;
		border: 0;
		border-radius: 0.4rem;
		padding: 1rem;
		background: #b6493d;
		color: white;
		font-weight: 750;
		cursor: pointer;
		transition:
			transform 180ms ease,
			box-shadow 180ms ease;
	}
	button:hover {
		transform: translateY(-2px);
		box-shadow: 0 7px 16px #64523b20;
	}
	@media (max-width: 720px) {
		section {
			grid-template-columns: 1fr;
		}
		.heading {
			border-right: 0;
			border-bottom: 1px solid #ded7c8;
		}
		.heading img {
			height: 150px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		button {
			transition: none;
		}
	}
</style>
