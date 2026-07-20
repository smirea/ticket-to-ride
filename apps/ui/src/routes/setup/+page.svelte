<svelte:head>
	<title>New Game — Railbound</title>
</svelte:head>

<main>
	<a class="back" href="/">← Back</a>
	<section>
		<div class="heading">
			<p>Single player</p>
			<h1>Ready the passengers.</h1>
			<span>Choose who will join your cross-country race.</span>
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
	<div class="route" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
</main>

<style>
	main {
		position: relative;
		display: grid;
		place-items: center;
		min-height: 100vh;
		overflow: hidden;
		padding: 5rem 1.5rem;
		background:
			radial-gradient(circle at 15% 15%, rgb(202 126 61 / 0.2), transparent 30%),
			linear-gradient(145deg, #11252b, #071318 70%);
		color: #f8efd9;
	}

	.back {
		position: absolute;
		top: 2rem;
		left: 2rem;
		color: #aebbb7;
		font-size: 0.78rem;
		font-weight: 700;
		text-decoration: none;
	}

	section {
		position: relative;
		z-index: 1;
		display: grid;
		grid-template-columns: 1fr 1fr;
		width: min(62rem, 100%);
		border: 1px solid rgb(255 255 255 / 0.12);
		border-radius: 0.45rem;
		background: rgb(7 19 24 / 0.88);
		box-shadow: 0 30px 90px rgb(0 0 0 / 0.34);
	}

	.heading,
	form {
		padding: clamp(2rem, 5vw, 4rem);
	}

	.heading {
		border-right: 1px solid rgb(255 255 255 / 0.1);
		background: linear-gradient(160deg, rgb(41 71 70 / 0.65), transparent);
	}

	.heading p {
		margin: 0 0 2rem;
		color: #df9b4c;
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.16em;
		text-transform: uppercase;
	}

	h1 {
		margin: 0 0 1.5rem;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: clamp(2.6rem, 5vw, 4.8rem);
		font-weight: 500;
		letter-spacing: -0.055em;
		line-height: 0.95;
	}

	.heading span {
		color: #a9b1aa;
		line-height: 1.7;
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
		color: #879894;
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	input,
	select {
		width: 100%;
		border: 1px solid rgb(255 255 255 / 0.16);
		border-radius: 0.3rem;
		padding: 0.8rem 0.9rem;
		background: #13262c;
		color: #f8efd9;
		font: inherit;
	}

	.details {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
		border-top: 1px solid rgb(255 255 255 / 0.1);
		padding-top: 1.25rem;
	}

	.details div {
		display: grid;
		gap: 0.25rem;
	}

	.details span {
		color: #c3cbc5;
		font-size: 0.78rem;
	}

	button {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border: 0;
		border-radius: 0.3rem;
		padding: 1rem;
		background: #c84c37;
		color: white;
		font-weight: 800;
		cursor: pointer;
	}

	.route {
		position: absolute;
		right: -5rem;
		bottom: 5rem;
		display: flex;
		gap: 0.5rem;
		transform: rotate(-12deg);
		opacity: 0.25;
	}

	.route i {
		width: 5rem;
		height: 1.7rem;
		border: 3px solid #d6a55e;
		border-radius: 0.3rem;
	}

	@media (max-width: 720px) {
		main {
			padding-top: 6rem;
		}

		section {
			grid-template-columns: 1fr;
		}

		.heading {
			border-right: 0;
			border-bottom: 1px solid rgb(255 255 255 / 0.1);
		}
	}
</style>
