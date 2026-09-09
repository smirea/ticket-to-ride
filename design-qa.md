# Traced route network and live game QA

Date: 2026-09-08. Final result: **passed**.

## Reference and implementation

The supplied `codex-clipboard-07b02d41-5aac-4935-a191-97e33654f286.png` is the source for all 36 city centers and 100 route lanes. The scoring frame is cropped to x40–985, y45–640 and normalized to the existing board. Measured source coordinates and fitted cubic arcs live in `apps/ui/src/lib/game/board/route-trace.ts`; detailed trace measurements and limitations are in `artifacts/route-network/trace-notes.md`. This is a manual trace, not pixel-identical automatic vectorization. The existing orange Salt Lake City–Denver rule color is retained rather than the reference's yellow.

Equal-distance placement follows each measured curve. Neighboring segments almost touch (0.90–1.08 board-unit gaps), with clear approaches to city hubs. Flat SVG placeholders replace the unclaimed plastic meshes. One translucent SVG group joins route backings and city halos without compounding opacity at junctions. Claimed trains remain instanced Three.js pieces. A static triangulated UV warp aligns the existing painted terrain to the traced city locations; no new texture or per-frame triangulation is required.

Car symbols now share ivory-white strokes and a faint dark edge. A compact route-anchored payment menu shows counts and card images for every affordable combination, ordered by locomotive count, with all-wild payment deduplicated. The shared XState transition validates and deducts the exact selected payment. Single-option routes claim directly; unavailable routes reject without opening a menu.

## Corrections found through browser testing

- Invisible ticket collection space intercepted west-coast route clicks. Only the actual tickets now receive pointer events.
- At 1024×768, real stacked tickets covered nine route markers. Adjusting the sidebar/map columns cleared those targets.
- Portrait map controls covered two Los Angeles–El Paso markers. Smaller controls at the lower edge cleared them.
- Moving whole hand buttons during hover changed which card was under the pointer. The artwork now lifts inside stable hit targets; ticket offers use the same approach.
- Locomotive filtering omitted legal optional-wild payments. Payment enumeration now includes all legal mixes and preserves the exact choice through the server.
- A closed parallel lane appeared open and produced misleading payment feedback. It is now visibly unavailable and cannot be selected.
- Move animations polled for state changes. They now await authoritative action success and unwind cleanly when an action fails.
- Finished multiplayer rooms added a large duplicate header and displaced the board. The board now remains in its existing layout, the turn/countdown clears, and a trophy control reopens standings. An agent reloaded the completed room and verified these fixes.

## Full live two-player game

Two low-thinking agents played separate browser identities in real room Y74NR5 through revision 128 and final scoring. They used visible browser controls, including actual mouse-coordinate route claims; no direct API actions or state mutation substituted for gameplay. Reports are `artifacts/route-network/live-player-a.md` and `live-player-b.md`.

The game covered lobby readiness/start, both opening selections, face-up and blind draws, face-up locomotive restrictions, direct and multi-option claims, exact mixed/all-wild deductions, parallel restrictions, midgame ticket selection, ticket completion/filtering, pinned cards, invalid claims, history/settings, reload/reconnect, final-round countdown, and endgame. Bert won 128 = 60 route + 58 ticket + 10 longest-route points; Ada scored 101 = 46 route + 55 ticket points. Both clients agreed. Nine development warnings appeared for one client during hot module replacement; reloaded final-room and production checks had no warnings/errors.

## Root browser checks and visual evidence

All 309 marker centers resolve through `elementFromPoint` to their intended routes at 1586×992, 1024×768, and 768×1024, including the five-player/twelve-ticket fixture. Geometry tests separately check inter-route footprints, city clearances, segment spacing, and crossing hit paths. This is systematic target coverage plus live mouse play, not a claim to have manually clicked every pixel.

Mouse checks verified stable red-card hover, pin persistence after leaving, second-click unpin, and clearing all hints afterward. Ticket hover showed two destination endpoints and its connecting trace; leaving cleared both. Gray-route menus opened, dismissed, reopened, scrolled, and paid exact selected amounts. A three-locomotive market reset finished with five face-up cards and exactly one added red card in the hand (three purple retained). The production build consumed the new-game query without the router initialization error and completed opening selection.

Screenshots in `artifacts/route-network/` include `desktop-full-table.png`, `tablet-full-table.png`, `portrait-full-table.png`, `pinned-card-hints.png`, `payment-options.png`, `market-reset-settled.png`, `production-desktop.png`, and both agents' live-game evidence. The twelve-ticket collection intentionally overlaps; hovering/focusing reveals individual tickets. At portrait tablet size the entire network remains visible but is dense; map zoom controls remain available. No horizontal overflow occurred at either tablet size.

## Performance and checks

The observed full-table canvas used six draw calls, five textures, four geometries and 292040 triangles. A sampled development tablet window reported 16.7 ms median / 33.4 ms p95 frame intervals; this is a local browser observation, not a cross-device FPS guarantee. Existing visibility pausing, pixel-ratio caps, reduced-motion handling and resource disposal remain. SVG network geometry is static between layout changes; payment choices are cached per game state.

- 49 tests pass, 1726 assertions across five files.
- Full Svelte/server typecheck: zero errors and warnings.
- Lint/format and production build pass.
- `git diff --check` passes.
- Rechecked finished live room and fresh production startup: no console errors or warnings.

## Carriage models and visible completion stamps

The follow-up replaces the two plain claimed-route boxes with a reusable three-material carriage model: painted barrel roof/body, ivory clerestory roof and window surrounds, dark windows/roof vents, underframe, wheels, couplers and end platforms. All carriages share three instanced meshes; tiny details use simple boxes instead of subdivided rounded geometry. The observed canvas uses seven draw calls and 426764 triangles, with five textures. A sampled local frame window remained 16.7 ms median / 33.3 ms p95. This is not a device-independent performance guarantee.

The SVG backing previously darkened meshes because it sits above the canvas. Claimed lanes now relinquish that overlay, allowing the model and its real shadow to remain visible. Keyboard focus styling is restricted to available routes so it cannot obscure a completed claim. Open routes retain their flat printed segments.

Completed destination cards now keep an angled green COMPLETED ink mark and check, in addition to the animated punch hole and live point seal. A low-thinking agent completed Portland–Phoenix through the SF–LA purple lane: three cards/trains spent, score 14→18, trains 37→34, and the 11-point ticket stamped. Desktop and 768px tablet checks found no ticket overlap or console errors. Root repeated the claim after the overlay correction and checked the models at full board scale. Evidence includes `carriages-and-completed-ticket.png`, the unaltered screenshot crops `completed-ticket-closeup.png` and `carriage-closeup.png`, and `stamp-fixture-qa.md` in `artifacts/route-network/`.

Follow-up validation: lint, full typecheck and production build pass. The change is visual; no additional trivial tests were introduced. Final result: **passed**.

## September 9: route contrast, Printables fleet, and animation continuity

Payment choices now retain only the fewest locomotives for each ordinary color; an all-wild choice appears once when no ordinary cards can contribute. The payment tests apply every offered option through the real game rules and check deductions. Route notices sit above route midpoints and disappear when actions become unavailable. Pinned/hovered cards retain saturated usable routes, tint usable neutral tracks to the selected color, fade unusable tracks, and lower the contiguous dark backing from 48% to 6% opacity.

The eight source Printables train models are extracted and simplified with provenance and CC BY-NC 4.0 attribution in `apps/ui/static/game-assets/trains/ATTRIBUTION.md`. Five distinct shapes are assigned to the five player colors. Shared geometry, materials, camera, and model matrices make the flying claim pieces match their permanent board counterparts. Models tilt an additional 20 degrees to expose their sides, use player-colored bodies and lighter roofs, and keep dark chassis/wheels. The complete asset is about 450 KB (127 KB gzipped); only claimed cars are drawn in five instanced batches. The fleet browser sample reported 9 draw calls, 16.7 ms median and 17.6 ms p95 frame intervals on this machine; this is not a cross-device performance guarantee.

The hand reserves its final new-color slot before a draw flies in, preserving the destination angle, size, and final count. Ticket transfers use the expanded final rail layout before animation; completed-ticket filtering reserves its space. Flights remain until receiving components render. Claim cards morph into renders of the actual train meshes and crossfade at the exact shared destination pose. The low-thinking browser agent's retests of existing/new colors, ticket keep, first completion, claim landing, market reset, and entrance are recorded in `artifacts/route-network/animation-b-audit.md`. No further endpoint jump was observed in the sampled retests.

Final production-preview checks at 1600×1000 and 768×1024: all five player plaques and 36 city labels present, no horizontal overflow on tablet, route selection stays pinned after the pointer leaves the hand, neutral usable routes acquire the selected color, an unaffordable route rejects in place without a dialog, and feedback sits above the route. The fleet screenshot is a labeled debug fixture for model/complete-ticket comparison, not a played match. The previous live two-player match evidence remains above.

Validation: 50 tests / 1,708 assertions passed; Svelte and server type checks passed with zero diagnostics; lint and production build passed. Run Svelte checking and building sequentially: both generate `.svelte-kit` files, and simultaneous runs can produce inconsistent runtime IDs. The final sequential build was verified in the browser. Evidence: `printables-train-fleet.png`, `selected-card-routes.png`, `route-anchored-message.png`, and retained agent retest captures under `artifacts/route-network/`.
