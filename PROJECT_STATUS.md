# Goal: Implement Ticket to Ride

Build a fully playable Ticket to Ride game on the classic USA map, supporting single-player and multiplayer.

## Scope

- USA map only.
- Use the installed Steam game as the gameplay and interaction reference. Inspect each feature in Steam before implementing it.
- Recreate visuals with CSS and code-native SVG. Do not reuse commercial game assets; use image generation sparingly when a raster asset is genuinely needed.
- Follow `~/code/knowledgebase/skills/code-ts-game-framework`.
- Keep deterministic, serializable game rules in `packages/shared`.
- Build and validate the complete local game before adding networking.
- Update this file as milestones change and commit completed systems independently.

# Status

## Current

- [x] Steam-reference UX parity pass completed: board-first HUD, side-docked gameplay decisions, map ticket previews, and motion polish.
- [x] Bun API server and SvelteKit SPA scaffolded.
- [x] Vite development proxy and production static serving configured.
- [x] Shared environment parsing, theme tokens, TanStack Query, linting, formatting, and hooks configured.
- [x] The complete deterministic USA rules engine can play seeded games through final scoring.
- [x] Single player supports configurable rivals, automatic save/resume, restart, debug scenarios, and results.
- [x] Bots deterministically pursue destination-ticket paths and complete full seeded games using only legal actions.
- [x] Multiplayer supports private rooms, persistent browser identities, live lobby updates, authoritative turns, reconnect states, and explicit abandon.

## Completed milestone: Steam-reference gameplay UX pass

- [x] Capture and measure Steam's live in-match board and settings frames at the implementation viewport.
- [x] Replace the page-like game dashboard with a full-viewport board and compact edge-mounted HUD.
- [x] Keep the train market, decks, hand, player state, turn state, and destination tickets visible without pushing the board below the fold.
- [x] Move destination choice, route payment, and final results into side drawers that preserve the map.
- [x] Preview destination endpoints and their connection on the board from pointer, keyboard focus, and selection state.
- [x] Add restrained drawer, turn, card, count, and route-claim animation with reduced-motion handling.
- [x] Validate default turn, ticket selection, route claim, final results, and narrow-screen states through the real debug action path.
- [x] Complete a same-viewport source/implementation comparison and record the result in `design-qa.md`.

## Completed milestone: Open and interact with a single-player game

Establish the real game architecture and produce the first usable vertical slice before completing every rule.

- [x] Inspect the Steam home screen and single-player entry point.
- [x] Inspect Steam's single-player setup, opening ticket selection, board presentation, train-card draw, route claim, and turn-transition interactions.
- [x] Add shared serializable player, card, route, ticket, turn, and game-state types.
- [x] Add the USA city and route network as owned project data.
- [x] Add deterministic game creation and a typed semantic action boundary.
- [x] Build the reusable `GameScreen` and code-native SVG/CSS board.
- [x] Add `/debug/game` using the real shared state and `GameScreen`, with deterministic scenarios.
- [x] Add a Single Player entry point from `/`.
- [x] Support initial destination-ticket selection and at least one complete interactive turn.
- [x] Add a deterministic bot that performs a legal turn and returns control to the player.
- [x] Run tests, typecheck, lint, and a production build.

### Acceptance criteria

- `bun run dev` opens the app at `ticket-to-ride.localhost:6090`.
- Selecting Single Player reaches a recognizable USA game board without server or console errors.
- The screen shows players, current turn, train counts, the player hand, destination tickets, face-up train cards, and draw piles.
- The player can select initial destination tickets.
- The player can complete a legal train-card draw turn.
- A deterministic debug scenario lets the player select and claim an eligible route.
- Accepted actions visibly update shared game state and advance the turn.
- A local opponent performs a legal action and control returns to the human.
- Illegal choices are disabled or rejected with a clear reason.
- Gameplay uses the same reusable `GameScreen` and shared action path intended for the finished game.
- State is serializable and random results are reproducible from a seed.
- Tests, typecheck, lint, and a production build pass.

## Roadmap

### 2. Complete the local rules engine (implementation complete; reference audit pending)

- [ ] Inspect the complete classic USA rules and edge cases in Steam.
- [x] Implement setup, deck construction, shuffling, dealing, and destination-ticket keep rules.
- [x] Implement blind and face-up train-card draws, locomotive restrictions, market refresh, discard reshuffling, and exhausted-deck behavior.
- [x] Implement colored and gray route claims, card payment selection, train-piece limits, and route scoring.
- [x] Implement double-route restrictions for smaller games and ownership restrictions.
- [x] Implement destination-ticket draws and minimum keep rules.
- [x] Implement final-round triggering and turn order.
- [x] Implement completed and incomplete destination scoring, longest continuous route, ties, and final ranking.
- [x] Add meaningful deterministic tests for rule boundaries, scoring, and replay.
- [x] Prove a complete seeded game can be played start-to-finish and rendered in `/debug/game`.

### 3. Complete the single-player product (playable; extended human QA pending)

- [x] Inspect Steam bot pacing, turn feedback, public player counts, board controls, and game-speed setting.
- [ ] Inspect Steam difficulty choices and game-over presentation.
- [x] Replace the vertical-slice bot with a coherent deterministic strategy that only uses legal actions.
- [x] Support the intended USA player-count range and configurable local opponents.
- [x] Add restart, turn history, bot-action feedback, and local save/resume.
- [x] Add debug scenarios for setup, each turn action, final round, longest route, ties, and final scoring.
- [x] Finish keyboard board navigation, route selection, card payment, transitions, and responsive layout.
- [x] Pace bot actions so each legal move and turn transition remains visible.
- [ ] Verify a human can complete multiple full games without debug controls.

### 4. Add player identity and app navigation (complete)

- [x] Add the shared player profile model and setup screens.
- [x] Add namespaced typed local storage.
- [x] Preserve `DEBUG_ID` through navigation and support multiple identities in one browser.
- [x] Add `/ -> /setup` for single player and `/ -> /lobby -> /room/[code]` for multiplayer.
- [x] Reuse a consistent player color and identity presentation throughout the app.

### 5. Add authoritative multiplayer rooms (complete except debug tooling)

- [x] Add shared room state and typed request, response, and event contracts.
- [x] Add create, join, leave, readiness, settings, and start actions.
- [x] Add SQLite-backed room snapshots and accepted semantic action persistence.
- [x] Make the Bun server validate actions with the shared rules engine.
- [x] Broadcast authoritative room snapshots through one per-room SSE stream.
- [x] Add lobby and room screens using the real `GameScreen`.
- [x] Add current-room recovery, idempotent action retries, and explicit abandon semantics to the server.
- [x] Wire refresh and reconnect behavior into the UI room routes.
- [ ] Add live-room debug save, load, and reset helpers.

### 6. Complete multiplayer gameplay

- [x] Verify secret information is hidden by the UI for the current viewer.
- [x] Enforce turn ownership and reject invalid actions at the server boundary.
- [x] Support 2-5 players on the USA map.
- [x] Persist and stream completed or explicitly abandoned room snapshots.
- [x] Verify joins, readiness, start consensus, refresh/rejoin recovery, and private opening-ticket rendering through two browser clients.
- [ ] Add a spectator flow and simultaneous-join stress test.
- [x] Test several same-browser clients with distinct `DEBUG_ID` values.
- [x] Prove a multiplayer game completes start-to-finish and recovers its exact final snapshot and action log after a server/store restart.

### 7. Reference parity and release polish

- [ ] Audit every gameplay phase and interaction against the installed Steam game. In-match board and settings frames are captured; the board, ticket selection, claim payment, and results now follow the board-first interaction model.
- [x] Finish responsive desktop and mobile layouts for setup, lobby, room, board, ticket selection, and results.
- [x] Add keyboard route navigation, visible focus, semantic labels, live status, and reduced-motion behavior.
- [ ] Complete contrast and screen-reader audits across every route.
- [x] Add useful loading, waiting, reconnecting, empty, and error states.
- [x] Verify rules, scoring, bot turns, replay, room recovery, and production serving.
- [x] Run the complete test, typecheck, lint, format, and production-build suite.

# Bugs

- None logged.

# Notes

- The server owns multiplayer state; clients send semantic actions and render authoritative snapshots.
- Random outcomes or seeds must be stored in accepted state so replay remains deterministic.
- `GameScreen` accepts plain game state, players, `viewerId`, and one `send(event)` callback.
- Steam reference interaction is verified through single-player setup, opening ticket selection, face-up and blind card draws, route selection, and AI turn handoff. Route claims drag a matching card group onto the route; clicking a route and confirming is the accessible alternate flow.
- Steam exposes public card, ticket, train, and score counts in each player row, announces the human turn over the board, and offers an adjustable game-speed setting. Local bots now reveal their actions with short paced transitions.
- The Unity client occasionally drops synthetic pointer-down events. Longer held input is reliable; Retina window captures must be converted from pixels to screen points before targeting board colliders.
- Multiplayer browser QA uses distinct `DEBUG_ID` values. Two clients have proven create/join, revisioned SSE updates, readiness, start, refresh recovery, identity isolation, and secret opening-ticket rendering; the server test completes the same authoritative path through final recovery.
- Multiplayer work begins only after the local game is playable start-to-finish.
- Other maps, reused commercial assets, authentication, matchmaking, and hostile-client security are out of scope.
