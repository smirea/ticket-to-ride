<svelte:head>
	<title>Railbound — Ticket to Ride</title>
	<meta name="description" content="Build a railway across North America in a local Ticket to Ride game." />
</svelte:head>

<main class="home">
	<div class="sun" aria-hidden="true"></div>
	<div class="mountains" aria-hidden="true"></div>
	<div class="rail rail-one" aria-hidden="true"></div>
	<div class="rail rail-two" aria-hidden="true"></div>

	<nav aria-label="Main navigation">
		<a class="brand" href="/">Railbound</a>
		<a class="small-link" href="/debug/game">Debug game</a>
	</nav>

	<section class="hero">
		<p class="eyebrow">A cross-country railway adventure</p>
		<h1>Claim the rails.<br />Connect the continent.</h1>
		<p class="lede">
			Collect train cards, complete destination tickets, and race a determined rival across the classic USA map.
		</p>
		<div class="actions">
			<a class="primary" href="/game">Start single player <span aria-hidden="true">→</span></a>
			<span>Local game · 1 rival · deterministic</span>
		</div>
	</section>

	<footer>
		<span>45 trains. One continent.</span>
		<span>Classic USA</span>
	</footer>
</main>

<style>
	:global(html) {
		color-scheme: dark;
	}

	.home {
		position: relative;
		display: grid;
		grid-template-rows: auto 1fr auto;
		min-height: 100vh;
		overflow: hidden;
		background:
			linear-gradient(90deg, rgb(8 20 30 / 0.96) 0%, rgb(8 20 30 / 0.76) 46%, rgb(8 20 30 / 0.2) 100%),
			radial-gradient(circle at 78% 24%, #e0a451 0 7%, transparent 30%),
			linear-gradient(155deg, #24434a 0 45%, #172b32 45% 60%, #0b1823 60%);
		color: #f9f1dc;
	}

	nav,
	.hero,
	footer {
		position: relative;
		z-index: 2;
	}

	nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 2rem clamp(1.5rem, 6vw, 6rem);
	}

	a {
		color: inherit;
		text-decoration: none;
	}

	.brand {
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 1.55rem;
		font-weight: 700;
		letter-spacing: -0.03em;
	}

	.brand::before {
		display: inline-block;
		width: 0.7rem;
		height: 0.7rem;
		margin-right: 0.65rem;
		border: 3px solid #e7a548;
		border-radius: 50%;
		content: '';
	}

	.small-link {
		border-bottom: 1px solid rgb(255 255 255 / 0.35);
		color: #e6dcc8;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.hero {
		align-self: center;
		width: min(52rem, 92vw);
		padding: 4rem clamp(1.5rem, 8vw, 9rem) 8rem;
	}

	.eyebrow {
		margin: 0 0 1.5rem;
		color: #e7a548;
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.18em;
		text-transform: uppercase;
	}

	h1 {
		margin: 0;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: clamp(3.5rem, 7.5vw, 7.5rem);
		font-weight: 500;
		letter-spacing: -0.06em;
		line-height: 0.9;
		text-wrap: balance;
	}

	.lede {
		max-width: 38rem;
		margin: 2rem 0;
		color: #c6c2b5;
		font-size: clamp(1rem, 1.8vw, 1.2rem);
		line-height: 1.7;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		color: #969b97;
		font-size: 0.78rem;
	}

	.primary {
		display: inline-flex;
		align-items: center;
		gap: 2rem;
		border-radius: 0.25rem;
		padding: 1rem 1.25rem;
		background: #c94632;
		box-shadow: 0 12px 30px rgb(0 0 0 / 0.24);
		color: white;
		font-weight: 800;
		transition:
			transform 160ms ease,
			background 160ms ease;
	}

	.primary:hover {
		transform: translateY(-2px);
		background: #df563e;
	}

	footer {
		display: flex;
		justify-content: space-between;
		border-top: 1px solid rgb(255 255 255 / 0.12);
		padding: 1.2rem clamp(1.5rem, 6vw, 6rem);
		color: #8a9290;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.sun {
		position: absolute;
		top: 18%;
		right: 14%;
		width: 28rem;
		height: 28rem;
		border: 1px solid rgb(235 171 78 / 0.28);
		border-radius: 50%;
		box-shadow: 0 0 90px rgb(229 161 74 / 0.2);
	}

	.mountains {
		position: absolute;
		right: -5%;
		bottom: 6%;
		width: 65%;
		height: 55%;
		background:
			linear-gradient(135deg, transparent 0 32%, rgb(91 113 105 / 0.4) 32% 48%, transparent 48%),
			linear-gradient(45deg, transparent 0 38%, rgb(58 81 79 / 0.55) 38% 61%, transparent 61%);
		clip-path: polygon(0 100%, 15% 58%, 30% 74%, 49% 21%, 64% 67%, 77% 40%, 100% 100%);
	}

	.rail {
		position: absolute;
		right: -8%;
		bottom: 14%;
		width: 78%;
		height: 0.55rem;
		transform: rotate(-13deg);
		border-top: 2px solid rgb(217 176 108 / 0.7);
		border-bottom: 2px solid rgb(217 176 108 / 0.7);
		background: repeating-linear-gradient(90deg, transparent 0 1.8rem, rgb(217 176 108 / 0.75) 1.8rem 2rem);
	}

	.rail-two {
		bottom: 11%;
		transform: rotate(-9deg);
		opacity: 0.45;
	}

	@media (max-width: 700px) {
		.hero {
			align-self: end;
			padding-bottom: 5rem;
		}

		.actions {
			align-items: flex-start;
			flex-direction: column;
		}

		.sun {
			right: -45%;
		}

		footer span:first-child {
			display: none;
		}
	}
</style>
