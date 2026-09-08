# Ticket to Travel — atlas correction QA

Date: 2026-09-08

final result: passed for the tested correction scope

The previous visual pass accepted a sparse geometric map that did not meet the selected reference. This pass replaces that surface and removes the unwanted card color tags and excess copy. The earlier QA's claim that additional terrain detail was optional is superseded.

## Visual comparison

- Reference: `docs/design/2026-09-08/01-modern.png`.
- Matched fixture: `artifacts/atlas-v2/desktop.png`, 1586 × 992, two players at 24/18 points and 32/35 trains, Portland–Phoenix and Chicago–Santa Fe tickets, four hand groups, five market cards.
- Actual five-player production game: `artifacts/atlas-v2/desktop-production.png`, 1586 × 992.
- Phone: `artifacts/atlas-v2/mobile-overview.png` and `mobile-production.png`, 390 × 844.
- Reference and matched fixture were opened together at identical output dimensions. Captures are real browser output, one output pixel per CSS pixel, with no resampling.
- The current card fan follows the user's first reference; the surrounding tabletop follows the second. The full USA dataset includes routes and cities absent or simplified in the generated reference.

The board now has authored mountain relief, forests, coastlines and water, a slight perspective, a bound paper edge and a broad contact shadow. The illustrated texture sits on a Three.js height mesh, with separate raised route pieces, boats and instanced trees. Water and forest motion are shader-driven. The final coast artwork and southern route curves keep the Gulf routes readable.

## Findings resolved

1. **P1: rejected map fidelity.** Replaced the sparse procedural surface with the illustrated relief atlas, aligned to actual city coordinates. Await texture loading before revealing the canvas; retain an illustrated SVG fallback.
2. **P2: visual clutter.** Removed visible train color-name tags, corner train icons, repeated ticket-selection labels, turn counter, motto, hand totals, and redundant deck/player prose. Card counts and ticket points remain UI content. Accessible button names retain card colors.
3. **P2: route readability.** Independent playtesting identified undersized route pieces and city markers. Enlarged pieces and markers, increased parallel-route spacing and strengthened route colors.
4. **P2: phone framing.** Removed empty overview bars. A fresh phone load fits the entire atlas; Inspect expands it for readable route selection. Minor city text is hidden only in phone overview, except ticket endpoints.
5. **P2: dense layout.** Five players fit the desktop header. On phones, players, tickets and card collections scroll independently. The dense fixture measured document/viewport widths of 390/390, players 366/526, tickets 366/2024 and hand 384/528 pixels (client/scroll widths).
6. **P2: renderer warning.** Replaced deprecated PCFSoftShadowMap with PCFShadowMap. Final production reload produced no errors or warnings.

No actionable P0/P1/P2 findings remain in the tested correction states. This is not a claim of pixel identity or complete device coverage.

## Required fidelity surfaces

- **Fonts and hierarchy:** navy Barlow headings, restrained supporting copy, readable city labels and ticket names; desktop player names/stats enlarged.
- **Layout:** dominant angled atlas, ivory tabletop, left destination collection and bottom card fan/market. Five-player and phone layouts checked.
- **Color and imagery:** warm land and cream paper against blue water; distinct carriage and locomotive subjects. No color-name labels are printed on the cards. Destination numbers are rendered by the UI.
- **Interaction:** hover/selection states, ticket endpoints, route selection and payment remain functional with the transformed board. Larger routes retain accurate targeting.
- **Motion:** unpaused browser captures `motion-a.png` and `motion-b.png` show ambient changes; live play verified selection and route-claim transitions. Pixel differences establish ongoing motion, not frame pacing by themselves.

## Functional and performance checks

- Low-thinking playtest agent: direct fresh five-player game, keep two tickets, face-up plus blind draw (hand 4 → 6), Phoenix–Santa Fe selection and payment with one red/two wild (score 0 → 4, trains 45 → 42, hand 6 → 3).
- Production preview: direct fresh URL, opening selection, two blind draws, AI claims, clean URL consumption and reload restoring six cards/two tickets. The earlier router-initialization fix is preserved.
- A stale preview process referenced an old bundle after rebuilding; restarting preview resolved it. The final reload's console is clean.
- Steady renderer: 14 draw calls, 289,004 triangles, 12 geometries, 5 textures on both measured viewports.
- Local development sample: 180 frames, median 16.70 ms, p95 17.60 ms. This is local evidence, not a hardware-independent guarantee or a production frame-time measurement.
- DPR caps: 2 desktop, 1.5 mobile. Shadow allocation: 2048 desktop, 1024 on mobile initialization. Hidden/offscreen, reduced-motion and ambient-off loop controls are retained.
- Atlas texture: 1591 × 988 WebP, 626,270 bytes. Instanced routes and trees share geometry/material resources; no post-processing passes.
- Production build, type checking (zero errors/warnings), Oxlint, formatting and diff checks passed. All 42 tests passed with 1,599 assertions.

## Coverage limits

Phone viewport testing does not replace physical low-powered phone testing. Triple-route offsets are generic, but the USA dataset has only single/double routes, so a triple-route game was not played. Prior multiplayer/results regression evidence remains in the previous revision of this document; those flows were not rerun during this visual correction. Correct routes, new branding, fanned cards and five-player header sizing intentionally differ from the generated reference.

Additional skill, asset and measured pixel evidence: `artifacts/final-evidence.md`.
