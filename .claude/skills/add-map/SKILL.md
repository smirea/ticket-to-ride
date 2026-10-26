---
name: add-map
description: Add a playable board (map) to Ticket to Travel, from rules/map-<id> to a registered map with tickets, rules, mechanics, bots, board art and UI. Use when asked to implement, add or finish a map.
---

# Add a map

A map is playable when it is registered in `GAME_MAPS`, `bun run maps:check <id>` is green, and a human can play every one of its rules through the UI. This playbook keeps every map built the same way. Read it fully before starting, and follow it step by step.

## How the framework fits together

- `rules/map-<id>/map.json` is the board graph (cities, routes, parallel groups, mechanics). `rules.md` is the parsed rulebook; `rules/README.md` explains every field. The PNGs (`map.png`, `map-generated.png`) are local only, never in git.
- `packages/shared/src/maps/<id>.ts` defines the map with `defineGameMap(board, { id, name, info, rules, tickets })`. `rules` overrides `DEFAULT_RULES` in `maps/define.ts` (trains, hand, deck, route scores, opening and mid-game ticket deals, long tickets, longest-path and globetrotter bonuses, final-round threshold). `defineGameMap` throws at import time if anything is inconsistent, including a mechanic in `map.json` with no implementation.
- `packages/shared/src/game.ts` is the engine. It reads everything map-specific through `gameMap(state)`. Ferries (printed locomotive spaces) are core: `Route.locomotives`.
- Mechanics (`packages/shared/src/mechanics/<name>.ts`, registered in `mechanics/index.ts`) plug in through the hooks in `mechanics/types.ts`: setup, actions with a timing (`turn`, `draw`, `phase`), claim validation, claim interception (to defer a claim into a phase), claim side effects, route points, ticket routes, final-round triggers, final scoring lines, bot moves, redaction of private state and journal text. A mechanic declares its state, actions, phases, events and claim options by augmenting the interfaces in `mechanics/types.ts` (see the comment at its top), so its types live in its own file.
- The UI draws any registered map, landscape or portrait (tall boards take the full table height with the hand and market beside or below). `apps/ui/src/lib/maps/<id>.ts` is the board art (terrain, flag, aspect, optional `positions` nudges, `bends` from the layout solver). The board size, route curves, lanes and car lengths are computed (`apps/ui/src/lib/game/board/layout.ts`).
- Mechanic UI lives in `apps/ui/src/lib/mechanics/<name>/` and is registered in `MECHANIC_UI` (`apps/ui/src/lib/mechanics/index.ts`): board layer, claim options beside the payment chooser, a phase panel, turn actions, player badges and phase status text. GameScreen renders them in place.
- Final scores show `FinalPlayerResult.bonuses` lines automatically; journal rows use `Mechanic.describeEvent`.

## Steps

1. **Read the rules.** Read `rules/map-<id>/rules.md` and `rules/default.md`. Open page images under `rules/map-<id>/images/` where the text extraction is unclear. Write down every way the map differs from the base game, and for each one decide, in this order of preference:
   1. a `MapRules` value,
   2. an existing mechanic in `packages/shared/src/mechanics/` (check before writing one),
   3. a generic extension of the framework that other maps would also use (see "Extending the framework"),
   4. new code in this map's own mechanic file.
2. **Transcribe the tickets.** Rulebooks rarely list them. Find the complete official list and check the count against the rulebook's component list. GitHub code search finds engine transcriptions fastest (`gh search code '"<city a>" "<city b>"'` with two cities that only this board has); BoardGameGeek and fandom wikis block fetching. Cross-check at least two sources, and resolve conflicts with the board: printed values are almost always the shortest train path, which `maps:check` warns about. Use `map.json` node ids; ticket ids are `<cityA>-<cityB>`. Mark long tickets with `long: true`. Every ticket must name existing cities and be connectable (`maps:check` verifies).
3. **Define and register the map.**
   - `packages/shared/src/maps/<id>.ts`: tickets, rules and `info` (a one-line `tagline`, a two-sentence `description`, and one `gimmicks` entry per special rule, phrased for a player choosing a map). Name the map like the box (for example "Europe", "Heart of Africa").
   - Add it to `GAME_MAPS` in `packages/shared/src/maps/index.ts`, after the existing maps.
4. **Board art.**
   - Terrain: `magick rules/map-<id>/map-generated.png -resize '2400x2400>' -quality 82 apps/ui/static/game-assets/maps/<id>/terrain.webp`.
   - Flag: `apps/ui/static/game-assets/maps/<id>/flag.svg`, a simple flat SVG with a 3:2 viewBox (see `maps/usa/flag.svg`). Use the country's or state's flag; for a region with no flag, draw a simple emblem in the board's palette. It is shown cropped in a round pin, so keep the key shapes near the centre.
   - `apps/ui/src/lib/maps/<id>.ts` with `title`, `terrain`, `aspect` (terrain width / height), `flag`, `bends` from `./<id>.layout.json`, and optional `labelBelow` and `geography` labels (sea and country names in board units). Register it in `apps/ui/src/lib/maps/index.ts`. The atlas place already exists in `apps/ui/static/game-assets/atlas/world-atlas.json`.
   - Run `bun run maps:layout <id>` first: it creates `apps/ui/src/lib/maps/<id>.layout.json` and prints the art file skeleton if the art file is missing. Run it again once the art is registered, and open the preview PNG it prints. If a city sits off its painted spot (in the sea, across a strait), add a normalized `positions` entry for it in the art file, rerun, and look again. To force a bend by hand (a ferry that should arc out to sea), set it in `bends` and list the route in `pinned`; the solver keeps pinned bends and works around them.
5. **Mechanics.** Mechanic UI code imports engine helpers from `@repo/shared/mechanics/<name>`. Bots chase end-game bonuses through `botGoalRoutes` and reuse the core route and card logic. Implement each new mechanic in its own file with its tests next to it (`<name>.test.ts`). Tests call `applyGameAction` the way players do and assert literal results: legal and illegal moves, payments, scoring lines, phases, redaction. Every decision a player makes needs a bot answer in `chooseBotAction`; bots should play the mechanic sensibly, not just legally.
6. **UI.** Add the mechanic's components under `apps/ui/src/lib/mechanics/<name>/` and register them. Keep the tabletop style: paper tickets, card fan, compact action ticket, minimal prose, desktop and tablet only (768px and up, portrait tablets included). Prefer Svelte component CSS.
7. **Verify on the real artifacts.**
   - `bun test`, `bun run typecheck`, `bun run lint:check`.
   - `bun run maps:check <id>`: every player count finishes, replays deterministically, survives server parsing and redaction; read the mean score, ticket completion and bonus lines for anything implausible.
   - Start the dev server with `bun run dev` (if port 6090 is taken, another thread runs one; use `UI_PORT=<free port> PORT=<free port> SERVER_URL=http://127.0.0.1:<that server port> bun run dev` and pass the UI port to the shot script with `UI_PORT=<port>`).
   - Screenshots: `bun run shot "/debug/game?map=<id>&players=4&turns=50" /tmp/<id>.png 1440x900`, again at `820x1180` (portrait tablet), and `bun run shot "/setup?map=<id>" /tmp/<id>-setup.png`. Look at every image. `SHOT_SCALE=2` renders close-ups.
   - To stage a mechanic's UI, the debug page exposes `window.debugGame` (`state()`, `load(state)`, `send(action)`): `bun run shot "/debug/game?map=<id>" /tmp/x.png 1440x900 --eval="const s = debugGame.state(); s.players[0].hand.red = 6; debugGame.load(s)"`. Chain `--eval` with clicks (`document.querySelector(...).click()`) or use the T3 browser preview.
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
