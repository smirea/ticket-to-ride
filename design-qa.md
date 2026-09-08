# Physical tabletop UX QA

Date: 2026-09-08

final result: passed for the tested desktop/tablet states

## Direction and implementation

The latest supplied references establish the blue mountain-and-rails card reverse and a fitted market tray. The user's written changes govern the rest of the composition: physical pieces, reduced prose, overlapping tickets/hand, quieter route slots, and a small action ticket. This is a redesign using those component references, not a pixel-for-pixel copy of a full-screen mockup.

- Wide illustrated destination tickets have paper edges, scalloped cutouts, a perforated points stub, small rotations and shadows. They overlap the atlas edge.
- A short ticket collection stays together; a large collection overlaps progressively. Exposed origin names and points make the stack identifiable; hovering, focusing or selecting a ticket raises the complete ticket.
- Completion presses the ticket, drops a paper disc and leaves an actual transparent punch. The punch sits below the points, so it never erases the value. Completed tickets do not replay the punch merely when loaded.
- Eight different carriage subjects replace the shared tinted image. The locomotive stays visually distinct. The back restores the simple navy mountain/rail motif with clean cream borders; it is a newly drawn version of the original design.
- The fan casts a lifted shadow and touches the map. Its spacing adapts to the available width so all nine card types remain visible.
- Market cards sit in recessed storage in a dark green tray with brass edging and a separate stacked draw deck. Draws move a card to the hand; a blind draw reveals its face in transit; payments move cards from the hand to the claimed route. New market cards slide into place.
- Ticket selection is a nonmodal paper sheet beside the resized atlas. All three offered tickets and the entire map remain visible together. The sheet rests slightly across the map edge.
- The four unwanted section/turn headings are removed. The top-right action ticket communicates turn, draw, payment, ticket selection and game-over states, with a muted rival-turn appearance.
- Open routes are shallow matte slots with subdued color and a thin contrasting rim. Claimed routes retain physical train height and player color.
- Ticket previews have a pale outlined route guide, warm red dashes, larger endpoint rings and emphasized city names.
- Map text is not selectable. Desktop/tablet-only assumptions and all 36 city labels are preserved.

## Visual evidence

Real CUA browser captures under artifacts/physical-table:

| File                            | Viewport / state                                          |
| ------------------------------- | --------------------------------------------------------- |
| desktop-atlas.png               | 1586 × 992, reference Atlas fixture                       |
| production-ticket-selection.png | 1586 × 992, direct fresh five-player game                 |
| production-desktop.png          | 1586 × 992, five players after actual draws and bot turns |
| production-landscape.png        | 1024 × 768, restored production game                      |
| tablet-stacked.png              | 768 × 1024, twelve tickets and nine hand types            |
| tablet-ticket-selection.png     | 768 × 1024, whole map beside all offered tickets          |
| ticket-punch-motion.png         | Live payment and punch, unpaused                          |
| ticket-punched.png              | Completed ticket after animation cleanup                  |

The latest component references were visually compared with the tray and final reverse. Generated asset provenance and exact prompts are in artifacts/physical-table/card-art.md. All assets are local WebPs; card counts, ticket points and city names remain UI content.

## Corrections from review

1. **P2: dense hand hidden behind tray.** A low-thinking playtest agent found Ivory/Wild and part of Black obscured in the nine-color fixture. The fan now measures its space and tightens overlap. The agent retested at actual 1280 × 720 and 1023 × 767 and confirmed all types/counts fit; focused Wild raises fully.
2. **P2: sheet/action overlap.** Removed duplicate selection heading/instructions from the paper sheet and adjusted the action ticket position so the first offer remains visible.
3. **P2: small-map labels.** Portrait ticket selection originally crowded city names. Labels now scale with the smaller atlas; none are hidden.
4. **P2: ticket stack identification.** Origin names and points move to the exposed top of stacked tickets. Raised tickets retain the full composition.
5. **P2: completion punch/value collision.** A single ticket was incorrectly treated as stacked, putting its points under the punch. Single tickets now retain their normal layout, and the punch is below the value.
6. **P2: short desktop overflow.** Removed an unnecessary 740-pixel minimum so 1280 × 720 fits.

No actionable P0/P1/P2 issues remain in these tested states. Very large ticket collections retain internal scrolling after reaching minimum stack spacing.

## Interaction and animation evidence

A low-thinking subagent played a fresh five-player game: opening tickets, market and blind draws, bot turns, a New York–Washington claim paid with two orange cards, additional ticket choices, previews and card fan focus passed. The claim produced 2 points and 43 trains. A separate payment check spent three purple cards and observed three flight elements.

Root used the new Ticket stamp fixture to complete Portland–Phoenix by claiming San Francisco–Los Angeles. During the event the DOM showed one completed/punching ticket, one paper disc and three card flights; after settling it showed the completed ticket with zero paper discs and zero flights. The state advanced to 18 route points and 34 trains. The CSS mask left a transparent hole below the points.

Production direct startup consumed the fresh-game query, showed the five-player ticket sheet and completed selection. A face-up draw created one flight and changed the action ticket to “Draw one more card”; the blind draw created another flight and changed it to “Maya is playing.” Final console review found no new errors or warnings.

## Performance and checks

- Renderer remains at 14 draw calls, 289,004 triangles, 12 geometries and 5 textures. DPR cap 2 and existing visibility/reduced-motion loop controls remain.
- Card flights animate transforms/opacity with the Web Animations API and dispose themselves. Reduced-motion preference skips flights and reduces ticket effects. No new per-frame Svelte state loop or rendering pass was introduced.
- Nine new card assets are 640 × 960 WebPs, about 1.6 MiB total. The atlas texture is unchanged.
- Production build, Svelte/TypeScript checks, Oxlint, formatting and diff checks passed.
- No game rules changed. Existing game tests were not expanded with trivial visual assertions; this pass was verified through real game input.

## Limits

Tablet testing used browser viewports, not physical tablet hardware. The small atlas during portrait ticket selection uses correspondingly smaller text, while preserving the complete map and all choices. The original reverse was recreated from the reference rather than extracted pixel-for-pixel. Existing map geography and all route logic remain unchanged.
