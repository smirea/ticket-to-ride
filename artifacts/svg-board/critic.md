# SVG board regression review

Tested the actual UI on dev port 6090 in Chrome at 1440×900 and 768×1024, using Full table and Train fleet fixtures. These are fixture checks, not a second real multiplayer match.

## Defect found and fixed during review

**S01 — major visual regression, resolved:** selecting Orange in the Train fleet showed oversized locomotive shapes over the southeast map. Reproduced at both dimensions; deselecting cleared them. The nested route-cost icon SVG had CSS sizing but no explicit viewport dimensions. Root added width/height attributes. Retest showed normal small icons (about 11.6×8.3 px at portrait size), with no large shapes. Before: `filter-portrait.png`, `filter-desktop.png`. After: `filter-portrait-fixed.png`, `filter-desktop-fixed.png`.

## Qualified pass

- Read-only DOM inspection found **zero canvas elements** throughout the inspected states; the fleet used SVG image elements.
- Atlas, city labels, routes and all five baked player-color carriage sets remained registered at rest and through zoom, pan and Fit map. Representative evidence: `train-fleet-desktop-final.png`, `fleet-zoom.png`, `fleet-pan.png`, `train-fleet-portrait-settled.png`.
- Full table fit five player plaques, twelve ticket titles, the full hand and market at both sizes without horizontal overflow. The completed ticket stamp/title/value remained readable. Evidence: `full-table-desktop.png`, `full-table-portrait.png`.
- Actual marker-coordinate clicks opened route payment pins on the curved Seattle–Calgary route at desktop and Vancouver–Seattle near the portrait map edge. All eight payment choices and Cancel were available. Evidence: `route-pins-desktop.png`, `route-pins-portrait.png`.
- Selected-card filtering and deselection worked after S01 was fixed. Settings had no Living atlas toggle. Console warning/error logs were empty.
- The small decorative gear beside the local player's train count is close to the two-digit number at 768 px, but I did not observe overlap or clipping.

No unresolved major defect remains in this checked scope. This is not a universal frame-rate claim or an audit of every baked direction. Root owns claim-flight endpoint validation; this review does not treat fixture loading as evidence of real multiplayer arrival behavior.

## Narrow live multiplayer regression

Revisited real room **62DNEV** on dev 6090 using Ada's actual identity `critique-ada-retest-0909` (the non-retest identity belongs to the earlier completed game). Existing claimed routes loaded in their settled positions. Ada claimed Santa Fe–El Paso with two orange cards: 4 points, 41 trains, zero cards; Denver–El Paso completed. Bert replied with Nashville–Atlanta: 3 points, 42 trains, one card. Both clients agreed on the handoff and counts. The DOM contained the new blue WebP carriage and still zero canvases. Evidence: `live-ada-claim.png`, `live-reply-settled.png`.

A production build briefly blanked the dev page; the parent confirmed the build interruption and one reload recovered the same game. This was not treated as a game-action defect. Remote arrival timing was not conclusively captured: the single-payment Ada claim had no intermediate payment pause, and concurrent browser capture/action calls appeared serialized. Before/after settlement is verified; smoothness of the live arrival is not asserted. Console warning/error logs remained empty after recovery.
