---
name: add-map
description: Add a playable board (map) to Ticket to Travel, from rules/map-<id> to a registered map with tickets, rules, mechanics, bots, board art and UI. Use when asked to implement, add or finish a map.
---

# Add a map

A map is playable when it is registered in `GAME_MAPS`, `bun run maps:check <id>` is green, and a human can play every one of its rules through the UI. This playbook keeps every map built the same way. Read it fully before starting, and follow it step by step.

## How the framework fits together

- `rules/map-<id>/map.json` is the board graph (cities, routes, parallel groups, companies, mechanics). `rules.md` is the parsed rulebook; `rules/README.md` explains every field. The PNGs and PDFs are local only, never in git.
- `packages/shared/src/maps/<id>.ts` defines the map with `defineGameMap(board, { id, name, info, rules, tickets, ticketValues })`. `rules` overrides `DEFAULT_RULES` in `maps/define.ts` (trains, hand, deck, route scores, opening and mid-game ticket deals, long tickets, longest-path and globetrotter bonuses, final-round threshold) and holds per-map mechanic settings in `rules.mechanics.<name>`. `defineGameMap` throws at import time if anything is inconsistent, including a mechanic with no implementation or a failed `Mechanic.validate(map)`.
- `packages/shared/src/game.ts` is the engine. It reads everything map-specific through `gameMap(state)`. Ferries (printed locomotive spaces) are core: `Route.locomotives`. Separate positions (`connectivity: separate`) are separate travel endpoints; shared positions (insets) are one city.
- Mechanics live in `packages/shared/src/mechanics/<name>.ts` and declare their state, actions, phases, events, claim options and per-map rules by augmenting the interfaces at the top of `mechanics/types.ts`. Existing mechanics: `ferries` (core), `tunnels`, `stations`, `mandalas`, `stocks`, `terrain-cards`, `bullet-trains`; read the closest one before writing a new one. Hooks, all optional:
  - setup and data: `setup`, `validate(map)`;
  - actions: `actions` with a timing (`turn`, `draw` with `finishDraw`, `phase`), `canDraw` for an extra draw supply, `hasTurnAction`;
  - claims: `claimOptions` (zod), `validateClaim`, `interceptClaim` (defer into a phase, finish with `completeClaim`), `onClaim`, `routePoints`, `claimPoints` (points that depend on options), `claimTrains` (pieces a claim costs);
  - tickets and end: `ticketRoutes` (routes others may use), `triggersFinalRound`, `holdsFinalRound`, `scoring` (bonus lines), `tiebreak`;
  - bots: `chooseBotAction` (must answer every phase), `botGoalRoutes`, `botDeclinesClaim`, `botClaimOptions`; `botPlannedRoutes(state, player)` tells a mechanic what the core bot is building toward;
  - multiplayer and text: `redact`, `describeEvent` (a phrase without the player's name).
- The UI draws any registered map, landscape or portrait. `apps/ui/src/lib/maps/<id>.ts` is the board art (terrain, flag, aspect, optional `positions` nudges, `labelBelow`, `geography`, `bends` from the layout solver). Board size, route curves, lanes, car lengths and label placement are computed in `apps/ui/src/lib/game/board/layout.ts`.
- Mechanic UI lives in `apps/ui/src/lib/mechanics/<name>/` (`MechanicUi` in `apps/ui/src/lib/mechanics/index.ts`). GameScreen and GameBoard render each slot in place: `RouteLayer` (under city labels) and `BoardLayer` (above them), `drawsClaim` (the mechanic draws a claimed route itself), `ClaimOptions` with `needsClaimChoice`, `defersClaim`, `PhasePanel` (floats over the board), `TurnActions`, `DrawPile`, `SidebarPanel`, `PlayerBadge`, `TicketStamp` and `describePhase`. Turn actions and phase panels can ask for a city on the board with `pickCity`. Layers draw with the layout helpers (`routePoint`, `routeMarkerT`, `routeMarkerLength`, `cityPoint`, `ROUTE_MARKER_WIDTH`); payment buttons reuse `CardPayment.svelte`. UI code imports engine helpers from `@repo/shared/mechanics/<name>`.
- Registries are one entry per line in `registry.ts` files (`packages/shared/src/{maps,mechanics}/registry.ts`, `apps/ui/src/lib/{maps,mechanics}/registry.ts`). Git merges them with the union driver, so parallel map branches do not conflict there; keep one import and one entry per line.
- Final scores show `FinalPlayerResult.bonuses` lines automatically.

## Steps

0. **Prepare the worktree.** Run `bun install`. Copy the git-ignored reference files from the main checkout: `cp -R /Users/stefan/code/ticket-to-ride/rules/map-<id>/. rules/map-<id>/`.
1. **Read the rules.** Read `rules/map-<id>/rules.md` and `rules/default.md`. Parsed rulebooks can be incomplete or scrambled: check the page images and any other PDFs in the map folder (anniversary or classic editions) before concluding a rule is absent. Open page images under `rules/map-<id>/images/` where the text extraction is unclear. Write down every way the map differs from the base game, and for each one decide, in this order of preference:
   1. a `MapRules` value,
   2. an existing mechanic in `packages/shared/src/mechanics/` (check before writing one),
   3. a generic extension of the framework that other maps would also use (see "Extending the framework"),
   4. new code in this map's own mechanic file.
2. **Transcribe the tickets.** Rulebooks rarely list them. Find the complete official list and check the count against the rulebook's component list. Sources that worked, best first: the Board Game Arena implementation (`github.com/thoun/tickettoride`, `modules/maps/<id>/destinations.php` plus scans of the cards), card-scan repositories and engine transcriptions on GitHub (repository search plus raw file fetches; code search is rate limited across threads), and Vassal module wikis. BoardGameGeek and fandom wikis block fetching. Cross-check at least two sources and resolve conflicts with the card scans. Printed values are usually the shortest train path and `maps:check` warns about outliers; boards whose cards deliberately differ set `ticketValues: 'printed'`. Tables printed only on components (share values, bonus tracks) need their own source, since the rulebook may hide them. Use `map.json` node ids; ticket ids are `<cityA>-<cityB>`. Mark long tickets with `long: true`. Every ticket must name existing cities and be connectable (`maps:check` verifies).
3. **Define and register the map.**
   - `packages/shared/src/maps/<id>.ts`: tickets, rules and `info` (a one-line `tagline`, a two-sentence `description`, and one `gimmicks` entry per special rule, phrased for a player choosing a map). Name the map like the box (for example "Europe", "Heart of Africa").
   - Add it to `MAPS` in `packages/shared/src/maps/registry.ts`, at its place in the menu order.
4. **Board art.**
   - Terrain: `magick rules/map-<id>/map-generated.png -resize '2400x2400>' -quality 82 apps/ui/static/game-assets/maps/<id>/terrain.webp`.
   - Flag: `apps/ui/static/game-assets/maps/<id>/flag.svg`, a simple flat SVG with a 3:2 viewBox (see `maps/usa/flag.svg`). Use the country's or state's flag; for a region with no flag, draw a simple emblem in the board's palette. It is shown cropped in a round pin, so keep the key shapes near the centre.
   - `apps/ui/src/lib/maps/<id>.ts` with `title`, `terrain`, `aspect` (terrain width / height), `flag`, `bends` from `./<id>.layout.json`, and optional `labelBelow` and `geography` labels (sea and country names in board units). Register it in `apps/ui/src/lib/maps/registry.ts`. The atlas place already exists in `apps/ui/static/game-assets/atlas/world-atlas.json`.
   - Run `bun run maps:layout <id>` first: it creates `apps/ui/src/lib/maps/<id>.layout.json` and prints the art file skeleton if the art file is missing. Run it again once the art is registered, and open the preview PNG it prints. If a city sits off its painted spot (in the sea, across a strait), add a normalized `positions` entry for it in the art file, rerun, and look again. The layout check also reports city labels that run off the board; fix those with `labelBelow` or a `positions` nudge. To force a bend by hand (a ferry that should arc out to sea), set it in `bends` and list the route in `pinned`; the solver keeps pinned bends and works around them.
5. **Mechanics.** Implement each new mechanic in its own file with its tests next to it (`<name>.test.ts`). Tests call `applyGameAction` the way players do and assert literal results: legal and illegal moves, payments, scoring lines, phases, redaction. Every decision a player makes needs a bot answer in `chooseBotAction`; bots should play the mechanic sensibly, not just legally.
6. **UI.** Add the mechanic's components under `apps/ui/src/lib/mechanics/<name>/` and register them. Keep the tabletop style: paper tickets, card fan, compact action ticket, minimal prose, desktop and tablet only (768px and up, portrait tablets included). Prefer Svelte component CSS.
7. **Verify on the real artifacts.**
   - `bun test`, `bun run typecheck`, `bun run lint:check`.
   - `bun run maps:check <id>`: every player count finishes, replays deterministically, survives server parsing and redaction; read the mean score, ticket completion, bonus lines and mechanic events per game for anything implausible (Europe's bots first abandoned 57% of tunnel attempts; the event counts showed it).
   - Start the dev server with `bun run dev` (if port 6090 is taken, another thread runs one; use `UI_PORT=<free port> PORT=<free port> SERVER_URL=http://127.0.0.1:<that server port> bun run dev` and pass the UI port to the shot script with `UI_PORT=<port>`).
   - Screenshots: `bun run shot "/debug/game?map=<id>&players=4&turns=50" /tmp/<id>.png 1440x900`, again at `820x1180` (portrait tablet), and `bun run shot "/setup?map=<id>" /tmp/<id>-setup.png`. Look at every image. `SHOT_SCALE=2` renders close-ups. Add `&hand=blue:4,locomotive:2` to the debug URL to set your hand.
   - To stage a mechanic's UI, the debug page exposes `window.debugGame` (`state()`, `load(state)`, `send(action)`): `bun run shot "/debug/game?map=<id>" /tmp/x.png 1440x900 --eval="const s = debugGame.state(); s.players[0].hand.red = 6; debugGame.load(s)"`. `debugGame.claim(routeId)` clicks a route like a player, opening the payment chooser. Chain `--eval` with clicks (`document.querySelector(...).click()`) or use the T3 browser preview.
   - Play at least one turn of every mechanic interaction as a human in the browser.
8. **Commit and report.** Small conventional commits on your branch (`gai`), each green. Do not push to master and do not merge; the coordinator merges. Report: what you built, every framework change and why, deviations from this playbook, anything you could not verify, and suggestions that would have made this map cheaper to build.

## Extending the framework

Map-specific code is fine when no other board would use it. When a rule needs something the hooks cannot express, extend the framework generically instead of special-casing your map in core files:

- Add or widen a hook in `mechanics/types.ts`, call it from the engine, and document it in one line there.
- Add a slot to `MechanicUi` and render it in place in GameScreen or GameBoard.
- Never test for a map id or mechanic id inside `game.ts`, `GameScreen.svelte` or `GameBoard.svelte`.

Other threads build other maps in parallel. Keep core edits small and additive so merges stay easy, and list each one in your report.

## Rules of thumb

- Fail fast: validate map data at definition time and throw with a message that names the map and the item.
- Only `z.object` schemas for action payloads: unknown fields are stripped before the history is stored.
- The engine is deterministic: use `shuffleWithState` for any randomness, never `Math.random`.
- Private mechanic state (hands of special cards, hidden shares) must be hidden by `redact`.
- Comments only for non-obvious decisions; no comments that narrate code.
