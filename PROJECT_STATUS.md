# Ticket to Ride — development status

Updated 2026-09-10.

## Scope and architecture

- Playable classic USA game for solo play against bots and private multiplayer rooms with 2–5 players.
- Desktop and tablet layouts, minimum width 768px, including portrait tablets. Preserve the physical tabletop, overlapping tickets, card fan, fitted market, and compact action ticket.
- SvelteKit SPA served by Vite in development and the Bun server in production. Same-origin `/api` requests are proxied to Bun in development.
- Deterministic, serializable rules and XState turn transitions live in `packages/shared/src/game.ts`.
- Shared route adjacency and path finding live in `packages/shared/src/route-graph.ts`. Ticket completion, bot planning, celebration paths, and longest-trail scoring reuse the graph; the longest-trail algorithm remains distinct from shortest-path planning.
- `GameScreen` renders state and submits semantic actions through its `send` callback. Solo play applies actions locally; multiplayer applies them on the server.
- SQLite stores authoritative room snapshots and accepted actions atomically. Typed Fetch API requests and server-sent events handle multiplayer communication; no query-cache framework is used.
- Game state version 3 records a discriminated `GameEvent` union with player IDs, turn numbers, counts, and resolved claim payments. Journal text is generated from events; semantic `GameAction` history remains available for deterministic replay.
- Older saves retain their English log entries as literal notes, without guessing actions or player identities. Room loading and solo loading use the same game migration boundary. The obsolete destination discard field is removed during migration.
- Gameplay follows the documented classic USA rules in `rules/default.md`. Other archived rulebooks do not imply support for additional maps.

## Implemented

- [x] Complete USA cities, routes, destination tickets, train deck, deterministic dealing, opening selection, and returned-ticket handling.
- [x] Legal train draws, locomotive restrictions, market refresh, discard reshuffling, and exhausted-pile behavior.
- [x] Colored/gray route claims, payment validation, train limits, route scores, and double-route restrictions.
- [x] Destination completion, final-round order, longest continuous trail, ticket scoring, tie breakers, and final standings.
- [x] Deterministic bots that pursue destination paths and complete games across the supported player counts.
- [x] Solo setup, automatic save/resume, restart, bot pacing, settings, and debug scenarios.
- [x] Multiplayer create/join/leave, host settings, readiness consensus, start, authoritative turns, live snapshots, finished games, and explicit abandonment.
- [x] Viewer-specific projections of private hands, tickets, offers, decks, and ticket-history details. This does not yet provide protection against identity impersonation or predictable seeds; see remaining work.
- [x] Board route selection, payment choice, card draws, ticket previews, completion celebrations, structured journal, and final results.
- [x] Current original atlas/card/ticket artwork, retained player portraits, and attributed train sprites.
- [x] Solo new-game URL cleanup and unavailable parallel-route interaction handling exist in the current UI. The turn instruction now lives in the ticket sidebar rather than beneath the hand fan.

## Completed review follow-up

Each requested point is recorded in its own commit.

- [x] Bot legality: share train-draw availability across the engine, bots, and UI. Bots no longer choose face-up cards when both train piles are exhausted; regression coverage checks continued play with ordinary cards and locomotives still displayed.
- [x] Multiplayer idempotency: persist an unconfirmed move in per-room/per-identity session storage before sending it. Bounded automatic retries, explicit retry, and reload recovery reuse its original action ID, payload, and expected revision. Reject new moves while one is unconfirmed; clear definitively rejected moves and refresh the snapshot.
- [x] Server action checks: accept identical retries even after the revision changes, reject an action ID reused with a different payload, and reject new stale-revision actions before applying them.
- [x] Journal/history: replace English-string parsing and positional history matching with typed events. Group by player ID and turn; record exact payments at acceptance; project kept-ticket identities only to their owner.
- [x] Graph logic: consolidate adjacency/path traversal, move connection tests into shared code, and remove the board's duplicated parallel-route rule.
- [x] Dead code/assets: remove unused TanStack Query setup and dependency, `gameReducer`, test-only JSON serialization wrappers, and destination discard state. Remove 48 obsolete asset files totaling about 8.1 MiB while retaining all 55 active runtime assets.
- [x] Pre-commit staging: lint and format selected staged files and automatically restage fixes. Keep formatting separate from code linting so documentation-only commits work.
- [x] Replace historical status claims with the current implementation, verification evidence, and remaining work.

## Verification

- [x] 59 tests pass, including full deterministic replay, final scoring, room persistence/recovery, private event projection, lost-acknowledgment retries, reload recovery of unconfirmed requests, stale revisions, resolved payments, duplicate player names, and graph traversal through zero-cost owned cycles.
- [x] An additional 100 seeded all-bot games complete across 2–5 players after the graph changes.
- [x] UI and server typechecks pass. Svelte reports no errors or warnings under the current configuration; accessibility warnings are still globally suppressed.
- [x] Oxlint and formatting checks pass for application/shared source, scripts, and changed configuration.
- [x] Production build passes. Adapter-static still prints its existing fallback/index overwrite warning.
- [x] Verify every active runtime asset exists after cleanup.
- [x] Browser smoke test: claim San Francisco–Los Angeles, observe 4 points and 42 remaining trains, see the sibling marked unavailable, and inspect the journal's exact three-purple-card payment. Retained artwork renders without browser console errors.
- [x] Browser multiplayer smoke test: connect to a live two-player room, keep two opening tickets through the revisioned action path, hand off selection to the other player, inspect owner-visible destination history, and reload to the same live room state without browser console errors.

## Remaining work

### Correctness and multiplayer boundaries

- [ ] Separate public player IDs from secret session credentials. The current request identity is exposed in room snapshots and can be reused to impersonate another player.
- [ ] Generate unpredictable server-side seeds for ordinary multiplayer rooms. The default seed is reconstructible from the public room code; user-selected deterministic seeds should be an explicit debug capability.
- [ ] Close existing event subscriptions when membership ends. Current streams may continue receiving updates after a player leaves through another tab.
- [ ] Automatically retry failed initial room loads and distinguish terminal membership/not-found errors from connection failures.
- [ ] Validate complete persisted game structure before accepting saves; the migration helper still checks only a small outer shape.
- [ ] Introduce an explicit viewer-facing state type instead of representing private data with red-card and fake-ticket placeholders.
- [ ] Decide whether the payment chooser should allow spending extra locomotives. It currently deliberately offers the least-wild payment per color even though the engine supports other legal payments.

### Maintainability and UI validation

- [ ] Extract animation coordination and market/hand presentation from `GameScreen`; audit cancellation and pending animation promises during navigation and reset.
- [ ] Consolidate storage access and profile/navigation handling, including storage-disabled behavior and `DEBUG_ID` preservation through solo setup and game menus.
- [ ] Remove blanket accessibility-warning suppression, then perform keyboard, focus, contrast, and screen-reader checks.
- [ ] Repeat portrait-tablet and full-game browser regression checks for ticket selection, draws, claims, celebrations, results, and refresh. Historical solo QA completed one 73-turn game; multiple full human playthroughs remain outstanding.
- [ ] Exercise actual network interruptions and multi-tab interactions end to end. Automated tests cover uncertain acknowledgments and persisted retries, but browser smoke testing does not simulate packet loss.
- [ ] Complete remaining Steam-reference comparisons for difficulty and results where relevant to the current tabletop design.

### Optional future features

- [ ] Live-room debug save/load/reset tooling.
- [ ] Spectator flow and simultaneous-join stress testing.
- Other playable maps, account authentication, and matchmaking remain outside the current implementation scope.
