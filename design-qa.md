# Steam gameplay UX parity QA

## Reference and implementation captures

- Steam in-match reference: `.cache/steam-ux-audit-2026-07-20/01-board-turn.png`
- Steam settings reference: `.cache/steam-ux-audit-2026-07-20/02-settings-overlay.png`
- Before comparison: `.cache/steam-ux-audit-2026-07-20/05-before-comparison.png`
- Final board comparison: `.cache/steam-ux-audit-2026-07-20/14-final-board-comparison.png`
- Ticket context comparison: `.cache/steam-ux-audit-2026-07-20/15-ticket-context-comparison.png`
- Final claim, results, and narrow captures: `.cache/steam-ux-audit-2026-07-20/09-redesigned-claim.png`, `.cache/steam-ux-audit-2026-07-20/11-redesigned-results.png`, `.cache/steam-ux-audit-2026-07-20/12-redesigned-ticket-narrow.png`

## Comparison passes

### Fidelity

- Layout: passed. The map now fills the game frame with compact left and right HUD rails, an overlaid bottom hand, and a shallow turn banner. The previous page header and large permanent panels no longer reduce the board.
- Gameplay decisions: passed. Ticket selection, route payment, and results use a 320–360px right drawer on desktop and a 42svh bottom sheet below 900px. The board remains visible in every tested game phase.
- Ticket context: passed. Pointer, focus, and selection update a high-contrast destination trace and endpoint rings on the board. Selection remains visually distinct from preview.
- Density and hierarchy: passed. Player rows, market cards, decks, tickets, and hand counts are edge-mounted and proportioned against the Steam frame.
- Typography, color, shapes, and elevation: passed for the project’s original visual system. The hierarchy, warm ticket paper, dark glass HUD, player colors, and selected-route glow are consistent and legible.
- Asset fidelity: passed within project scope. The commercial illustrated terrain and train art were not copied; the existing code-native board and card treatments remain intentionally original.

### Behavior and motion

- Claim scenario: passed. Selecting San Francisco–Los Angeles opens the side payment drawer, the selected route glows, and paying with purple cards closes the drawer and claims the route.
- Ticket scenario: passed. Selecting Calgary–Phoenix updates the map preview, enables the keep action, and closes the drawer after confirmation.
- Results and final-round states: passed. Results remain docked beside the board and keep expandable ticket details and replay behavior.
- Motion: passed. Drawers and sheets enter once, turn and move status arrive briefly, card groups deal in, counts pop, and claimed route segments illuminate sequentially.
- Reduced motion: passed by CSS review. Animations and transitions collapse to a single near-zero-duration iteration.

### Accessibility and resilience

- Keyboard and focus: passed. Existing route roving tabindex and arrow-key selection remain intact; destination previews update on focus; dialog regions receive focus when required.
- Semantics: passed. Board, market, players, live turn feedback, ticket choices, claim choices, and results retain labels and status roles.
- Desktop viewport: passed at 1210×768 against the Steam reference.
- Narrow viewport: passed at 760×768. The board stays visible, players become chips, the market becomes a bottom rail, and gameplay drawers become bottom sheets.
- Overflow and clipping: passed. Gameplay is fixed to the viewport and does not fall below the fold or create game-page scrolling.

## Remaining differences

- Steam’s terrain is a commercial illustrated raster map; this project intentionally uses its own code-native SVG geography.
- Steam’s exact ticket-draw animation could not be captured reliably because the Unity client intermittently drops synthetic pointer events. The implemented side drawer follows the user-requested board-preserving interaction and was validated end to end.

final result: passed
