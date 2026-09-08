# Ticket to Travel implementation QA

Date: 2026-09-08

final result: passed

## Comparison evidence

- Source visual truth: `docs/design/2026-09-08/01-modern.png`, the user's selected second image. The fanned carriage-card direction comes from the user's first attachment and `03-victorian-club.png`.
- Implementation: `http://127.0.0.1:6090/debug/game`, Atlas preview fixture.
- Final desktop capture: `docs/design/2026-09-08/implementation/desktop-atlas.png`.
- Source and implementation are both 1586 × 992 pixels. Browser CSS viewport was 1586 × 992; the saved capture is one output pixel per CSS pixel. No density resampling was used.
- State: light theme, two players, scores 24/18, trains 32/35, Portland–Phoenix and Chicago–Santa Fe tickets, four hand groups, five market cards, 97-card deck. Hand ordering follows the game's color order. Route geometry follows the real USA dataset, including its parallel routes; the generated source does not reproduce that dataset exactly.
- The source and final implementation were opened together in the same image comparison input. Full-resolution text, cards, ticket badges, city labels, and logo were readable, so a separate cropped comparison was unnecessary.
- Responsive captures: `implementation/tablet-atlas.png` at 768 × 1024, `implementation/phone-full-table.png` and `implementation/phone-overview-and-cards.png` at 390 × 844, relative to the design directory above. The phone overview capture is scrolled to show the board and both card sections.

## Findings and corrections

No actionable P0/P1/P2 findings remain in the tested states.

1. **P2, desktop proportions:** the first comparison exposed undersized card groups and city labels, and excessive space beneath a short ticket collection. Increased desktop cards to 106 × 150, market cards up to 102 pixels wide, labels to 14 pixels, and the tray to 220 pixels. Short ticket collections now size to their content. The final capture shows complete cards within the viewport; the lowest transformed card edge measures 985.54 pixels against a 992-pixel viewport.
2. **P2, tablet market:** at 768 pixels, the sidebar layout compressed face-up cards and left a tall, cropped map viewport. Applied the stacked layout through 900 pixels. The revised tablet capture shows full-width map and independent card sections. Document width equals viewport width.
3. **P2, phone overview:** Fit initially distorted the map. It now preserves the map's 1000:620 proportions and centers it. Inspect retains a scrollable 760-pixel map for legible route selection. Both states were recaptured.
4. **P2, preferences:** playtesting found that pace and ambient-animation preferences reset after refresh. They now persist locally. A separate low-thinking playtest agent verified Off/Quick across reload, then restored On/Normal.
5. **P1, saved solo journey:** the fresh-game query previously remained in the URL and could restart a game on refresh. The query is consumed after creating the game; the playtest verified restored progress.

## Required fidelity surfaces

- **Fonts:** self-hosted Barlow and Barlow Condensed provide the reference's strong navy display hierarchy. Weights, wrapping, 14-pixel board labels, and small supporting copy were checked in the final capture. Mobile overview deliberately reduces labels; Inspect retains full-size labels.
- **Layout:** ivory tabletop, dominant atlas, left ticket collection, bottom hand and market, and header players preserve the reference's composition. The fan is an explicitly requested variation. Five players and large collections use independent scrolling rather than page overflow. Phone and tablet use a stacked reading order.
- **Colors:** warm ivory, navy ink, muted red accents, turquoise water, and cream terrain preserve the optimistic palette. Card color labels and a separate locomotive subject supplement color. Keyboard focus uses a visible blue outline.
- **Images:** generated Ticket to Travel logo, distinct carriage/locomotive artwork, and 30 unique destination panoramas are real WebP assets. Ticket names, points, completion state, and hand counts are UI content. Destination art is lazy-loaded; all 30 images total approximately 2.79 MB. The live Three.js terrain is intentionally simpler and more geometric than the painted reference, following the user's explicit request for animated terrain and performance.
- **Copy:** Ticket to Travel replaces the old visible brand across entry, setup, lobby, room, and game surfaces. Existing save keys remain compatible. Turn instructions, payment costs, ticket minimums, draw availability, final standings, and player counts reflect actual state.

## Interaction and performance evidence

- Low-thinking agents played five-player solo through turn 16: opening tickets, face-up and blind draws, locomotive draw cost, gray-route claims, extra tickets, AI turns, and refresh restore passed.
- A 12-ticket, nine-card-type fixture verified the final ticket and locomotive group remain reachable. Results fixtures verified close/reopen and play again.
- Two independent browser clients passed room creation, join, ready, start, ticket selection, and synchronized turn advancement.
- Actual browser render diagnostics: 17 steady draw calls, 84,388 triangles; a 180-frame local development sample measured 16.70 ms median and 17.70 ms p95. This is a local observation, not a hardware-independent frame-rate guarantee.
- Ambient water, tree gusts, boat bobbing, and route settling run in the renderer. Static shadows update only when needed; DPR is capped at 1.65. Hidden/offscreen, reduced-motion, and ambient-off states suspend the continuous loop. Ambient-off render count was observed staying constant.
- `bun test`: 42 passed, 1,599 assertions, including complete deterministic games and five-player XState actor/stateless equivalence. Type checking, Oxlint, formatting, and production build passed.

## Intentional differences and remaining coverage

The implementation uses the correct full route network and a quieter live relief map, rather than reproducing painted scenery pixel for pixel. Generated artwork varies by destination. Header sizing accommodates five players. Triple-route offset calculation is generic, but the current USA map contains only single and double routes, so no triple-route game was played. Browser viewport tests do not replace testing on physical low-powered phones. A separate browser-console log export was not collected in this pass.

P3 follow-up polish: additional terrain surface detail could move the live map closer to the painted source, provided frame timing remains within budget.

## Implementation checklist

- [x] Compare selected reference and rendered desktop in one visual input.
- [x] Correct desktop density, tablet card sizing, and phone map proportions.
- [x] Verify all destination art and UI-owned points.
- [x] Exercise solo, multiplayer, large collections, persistence, and final results.
- [x] Run functional tests, type checking, lint, formatting, and production build.
