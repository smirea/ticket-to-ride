# Tabletop interaction QA

Date: 2026-09-08

## Implemented direction

The status uses the supplied ticket silhouette, plain cream paper, and a separate avatar/turn stub. It sits above the destination collection. Ticket selection slides onto the left of the atlas, below existing tickets during the game. Kept tickets move to their measured collection positions before the selector leaves; its position is frozen during transfer to prevent a layout jump. Selection outlines follow the paper cutouts, and previews clear on pointer leave or blur.

Carriages have stronger color tints and eight distinct SVG symbols. The locomotive has a newly generated eight-color sky. The five market slots share a fitted, thin-edged storage tray. Stable card identities replace slot/color keys. Drawing moves one card into the hand, shifts the surviving market cards, then brings in the replacement. A three-locomotive reset clears the old market before refilling sequentially. Outgoing drawn cards stay hidden through their entire outro.

Route clicks claim directly through the existing shared XState rules. Hovering routes raises the matching hand cards and shows an arced payment/points notice. Insufficient claims jiggle the route and show a fading red message. Successful claims lift the payment cards, transform them into player-colored train pieces, then place them on the route. Hovering or pinning a hand color filters routes and displays points/wild requirements. Settings/results retain their dialogs; route-payment dialogs are removed.

All 309 markers share one physical size. Arc-length placement, tailored city approaches, and small visual offsets for Omaha/Kansas City keep marker footprints and route hit paths separated. Continuous translucent dark backing improves contrast. The actual game graph, lengths, and scoring are unchanged.

## Browser evidence

CUA checks covered production and debug fixtures at 1586×992, 1280×720, 1024×768, and 768×1024. Screenshots are in `artifacts/current-table/`:

- `production-selection.png`: fresh five-player game with the entire map and three opening tickets.
- `production-desktop.png`: actual five-player game after opening selection and card draws.
- `tablet-full-table.png`: five players, twelve stacked tickets, and all nine hand types at 1024×768.
- `portrait-ticket-selection.png`: two held tickets plus all three new offers at 768×1024.

The dense ticket collection intentionally overlaps. Hover/focus raises a full ticket; large collections retain internal scrolling. Card counts, ticket values, and destination names remain UI text, not baked into art. Generated locomotive provenance is in `artifacts/current-table/card-art.md`.

## Gameplay and corrections

A low-thinking subagent exercised direct valid/invalid route clicks, pinned hand selection, face-up and blind draws, opening ticket selection, midgame ticket selection, and the three-locomotive reset. A red Boston–New York claim deducted two cards/trains and awarded two points. Face-up then blind draws added exactly two cards and ended the turn. Opening selection required two tickets; midgame selection required one; final ticket collections contained no duplicates.

Root verified all 309 SVG marker centers with `document.elementFromPoint`: zero wrong route targets at 1280×720 after separating route approaches. The original audit found twelve wrong targets. The geometry agent additionally verified zero overlapping marker rectangles and zero crossing route centerlines; those checks are now regression tests.

Root claimed San Francisco–Los Angeles in the completion fixture: three claim-flight elements, zero open dialogs, then one completed ticket, 18 route points, 34 trains, and no remaining flights. A development warning from a nonreactive animation-element binding was fixed and the claim was repeated with no new warnings.

The reset playtest caught a drawn card becoming visible again during its outro. Its hidden identity now persists until settlement. A second boundary fix waits for all outgoing market transitions to finish before the first refill card enters. Root observed one initial draw flight and exactly one new card in the final hand. The final market has five cards.

Ticket-transfer measurement confirmed the selector's rectangle stays identical before/after Keep while the receiving tickets remain hidden until landing. Both opening and midgame transfers finished with the correct unique ticket counts. Pointer leave/blur cleanup is implemented; the available automated browser controls did not provide a hover-only pointer movement check.

## Performance and validation

The board remains instanced Three.js geometry; the dark route backing is batched. Production diagnostics reported 16 draw calls, 311116 triangles, five textures, and thirteen geometries. Existing pixel-ratio caps, visibility pausing, disposal, and reduced-motion handling remain. Card/selection animations use transforms and opacity; they do not advance the authoritative game rules independently.

- `bun run test`: 45 passing tests, including three route geometry regressions.
- `bun run typecheck`: no errors or warnings.
- `bun run lint`: passes.
- `bun run build`: passes.
- Production startup consumes the fresh-game query without the router initialization error.
- Final browser checks reported no new console errors/warnings.
