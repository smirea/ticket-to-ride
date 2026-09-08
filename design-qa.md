# Desktop and tablet UX QA

Date: 2026-09-08

final result: passed for the tested desktop/tablet scope

The product is exclusively for desktop and tablets. Minimum layout width is 768 CSS pixels. Phone layouts and phone validation are no longer part of the product requirements; earlier phone screenshots under artifacts/atlas-v2 are historical evidence only.

## Changes

- Removed phone breakpoints across the board, game screen, branding, home, setup, lobby, room and debug screens.
- Kept the tabletop composition on desktop and landscape tablets. Portrait tablets put the full-width atlas above a two-column area with tickets on the left and cards on the right.
- Removed narrow-screen Inspect mode, automatic mode switching, reduced labels and hidden city names. Fit map now resets zoom and scroll position consistently.
- All five players stay visible. Tickets remain a vertical collection with independent scrolling; a large hand scrolls horizontally without clipping its fan vertically.
- Increased map-control sizing and moved controls into the lower-left water area. Zoomed content can pass under these fixed map controls; the rest of the viewport remains available for panning.
- Removed viewport-based renderer quality reductions. All supported layouts use a DPR cap of 2 and 2048 shadows.
- Preserved two-column home/setup/lobby presentations. Live multiplayer wrappers can expand with the tabletop instead of clipping it.
- Recorded the desktop/tablet-only design rule in AGENTS.md.

## Evidence

Real production browser captures under artifacts/desktop-tablet:

| Capture               | Viewport   | State                                                                      |
| --------------------- | ---------- | -------------------------------------------------------------------------- |
| desktop.png           | 1586 × 992 | Five players, restored game, tickets and card collections                  |
| tablet-landscape.png  | 1024 × 768 | Same game, desktop tabletop arrangement                                    |
| tablet-portrait.png   | 768 × 1024 | Same game, full-width atlas and two-column lower table                     |
| tablet-full-table.png | 768 × 1024 | Development fixture with five players, twelve tickets and nine hand colors |

No page overflow at either tablet viewport. All 36 city labels remain visible. Five players fit without a scrolling roster. Home, setup and multiplayer entry were also visually checked at 768 × 1024.

## Playtesting and checks

A low-thinking subagent played a fresh five-player game at 1024 × 768 and 768 × 1024. Opening ticket selection, face-up/blind draws, bot turns, a Las Vegas–Los Angeles claim paid with two yellow cards, zoom/Fit reset and additional ticket selection passed. The claim produced 2 points and 43 remaining trains. A singular/plural ticket instruction found during play was fixed.

Root checked dense collections, card fan clearance, two-column entry screens, restored production gameplay and the final console. Production renderer reports 14 draw calls, 289,004 triangles, 12 geometries and 5 textures. No new browser errors or warnings appeared during the final production review.

Production build, Svelte/TypeScript checks, Oxlint, formatting and diff checks passed. No game rules changed; the existing game test suite was not rerun for this layout-only pass.

## Limits

Tablet checks used browser viewports, not physical tablet hardware. The minimum 768-pixel layout is deliberate; there is no phone-specific adaptation or compact map mode. Portrait tablets below 1024 pixels in height can scroll the table vertically.
