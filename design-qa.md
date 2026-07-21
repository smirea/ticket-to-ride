# Steam gameplay UI QA

## Evidence

- Steam turn reference: `.cache/steam-pixel-pass-2026-07-20/steam-default.png`
- Steam settings reference: `.cache/steam-pixel-pass-2026-07-20/steam-settings.png`
- Final four-player frame: `.cache/local-pixel-pass-2026-07-20/local-live-default-final.png`
- Direct turn comparison: `.cache/local-pixel-pass-2026-07-20/compare-live-default-final.png`
- Final settings frame: `.cache/local-pixel-pass-2026-07-20/local-settings-final.png`
- Direct settings comparison: `.cache/local-pixel-pass-2026-07-20/compare-settings-final.png`
- Ticket selection: `.cache/local-pixel-pass-2026-07-20/local-ticket-selected-final.png`
- Route payment: `.cache/local-pixel-pass-2026-07-20/local-claim-final.png`
- Final standings: `.cache/local-pixel-pass-2026-07-20/local-results-final.png`
- Compact ticket flow: `.cache/local-pixel-pass-2026-07-20/local-mobile-ticket-final.png`

The source and desktop implementation captures are 1211×768 and 1210×768 respectively. The one-pixel width difference is from the installed Steam window capture. Its 20px macOS title bar is treated as window chrome rather than game UI when evaluating vertical placement.

## Fidelity

- Layout: passed. At 1210×768 the implementation measures 58px for the top-left controls, 134×279px for the opponent rail, 220×213px for the viewer HUD, 336×138px for the hand, and 714×43px for the turn banner. The controls, players, ticket deck, five-card market, blind deck, hand fan, and banner occupy the same edge bands as the Steam frame.
- Board visibility: passed. The board fills the viewport in normal play. Ticket, payment, settings, and results states use a right drawer on desktop and bottom sheet below 900px; the map remains visible and interactive context is highlighted.
- Typography and hierarchy: passed. Condensed high-contrast city labels, serif ticket/drawer headings, compact uppercase metadata, and large score figures preserve the source hierarchy without using commercial fonts or art.
- Color and surfaces: passed. Navy, cream, teal, brass, player colors, gold rims, layered paper, and restrained shadows consistently reproduce the source treatment in an original visual system.
- Imagery: passed. The map, tabletop, ticket faces and backs, train-card back, nine train-card scenes, and five portraits are real raster assets generated as one cohesive whimsical-1800s family. No commercial game imagery is reused. The asset roles and prompts are recorded in `apps/ui/static/game-assets/whimsical-1800s/ASSET_MANIFEST.md`.
- Icons: passed. Visible controls use one Phosphor icon family with source-like filled weight, optical size, circular framing, hover lift, focus rings, and active treatment.
- Source-directed differences: passed. Settings and gameplay decisions remain side-docked instead of blocking the board because the requested interaction model requires the board to stay visible. Original map art intentionally does not reproduce Steam's commercial terrain illustration.

## States, interaction, and motion

- Real single player: passed. A four-player game was opened through the production route. The human selected two opening destinations, drew a face-up train card, completed the second draw blind, and control advanced through three deterministic bots back to the player.
- Tickets: passed. Pointer, focus, and selection update the map endpoint rings and dashed route trace. Selection lifts and rims the generated ticket while keeping the confirm action disabled until the required count is met.
- Claims: passed. Selecting San Francisco–Los Angeles focuses the payment drawer, highlights the route above the map, presents only legal generated-card payments, and paying claims the route, removes the cards, awards points, and advances the turn.
- Settings: passed. The drawer receives focus; both sliders respond and the speed stepper works; simplified-map and player-information toggles visibly affect the frame; single-player speed changes bot pacing; Resume returns focus to the settings control.
- History and turn feedback: passed. Move history is available from the top-left journal control. Source-inaccurate persistent move and bot-status pills were removed; active player styling and the bottom banner carry turn state.
- Results: passed. The current raster-map implementation was captured with ranked portraits, route/ticket/longest-rail breakdowns, replay action, and the board still visible.
- Motion: passed. Controls lift, cards deal and fan, ticket choices move, drawers enter, banners rise, counters pop, result rows reveal, route selection pulses, and claimed segments illuminate sequentially.
- Reduced motion: passed by CSS review. Animations and transitions collapse to a single near-zero-duration iteration under `prefers-reduced-motion`.

## Accessibility and resilience

- Focus and keyboard behavior: passed. Board routes retain roving tabindex and arrow-key navigation. Ticket, settings, claim, and results drawers receive focus. Escape dismisses settings, history, and an unconfirmed route selection. Focus-visible styling is consistent.
- Semantics: passed. The board, route actions, player statistics, market, decks, ticket choices, payment choices, settings, results, and live turn state expose roles and labels. Decorative raster art uses empty alt text because equivalent state is already announced by the owning control.
- Compact viewport: passed at 390×844. The document remains exactly viewport-sized with no page overflow. The board stays visible above the 380px bottom sheet, tickets scroll horizontally, and controls retain practical targets.
- Browser diagnostics: passed. The live four-player route and deterministic QA route produced no console warnings or errors after all interactions.

final result: passed
