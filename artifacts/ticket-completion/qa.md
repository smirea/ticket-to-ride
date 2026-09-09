# Card sizing, atlas labels and ticket completion — September 9, 2026

## Browser coverage

- Five players and all nine hand groups fit at 1440×900 and 768×1024 without horizontal overflow. Hand, market and deck faces measured identically: 97×138.562px on desktop, 70×100px on portrait tablet.
- Enlarged serif labels are horizontally centered at every hub. Balanced two-line labels and above/below placement removed text collisions in both tested layouts. Calgary moved below its circle to avoid the player plaque.
- GPS options above and below their anchor both keep the close X on the opposite side; actual close clicks worked.
- Root clicked the physical middle marker of San Francisco–Los Angeles in the two-ticket stamp fixture. Claim committed three purple cards, then exactly one Portland–Phoenix celebration traversed eleven owned carriages and inserted the completed ticket before Chicago–Santa Fe.
- A second reviewer repeated the completion three times using keyboard route selection. No duplicate ticket, stuck interaction or console error was observed. The already-complete train-fleet fixture did not replay a celebration.

## Resolved during review

- Sprite-sheet bounds are larger than a cropped carriage. The wave now scales around a dedicated route anchor, rather than using the sheet's bounding-box center.
- Presenting the ticket beside its old slot obscured part of the west-coast route. It now enlarges below the atlas, keeping the cities and carriage wave visible.
- CSS rotation transitions conflicted with the ticket-list FLIP animation. Rotation transitions are disabled during insertion; the final slot is measured after its animations settle. The floating paper holds its final pose for two paint frames before reveal.
- Status previously changed to the opponent during the local completion. It now shows the viewer and “Connected” throughout the celebration, returning to the opponent after landing.

`landing-verified.json` contains read-only browser samples from an actual pointer-triggered claim. In the final overlay sample, x/y differ from the hidden receiving ticket by under0.001px; width/height differ by under0.017px. The next sample reveals that ticket with unchanged bounds. Sampling verifies the handoff; it is not an FPS benchmark. The final production build was also exercised through an actual pointer claim: wave and stamp rendered, one completed ticket settled first, and zero overlays/inert regions remained. The retained stage screenshots come from that final production run; its console was clean.

## Validation

56 tests pass, including shortest owned path selection, reverse traversal and rejection of opponent shortcuts. Svelte check has zero errors/warnings. Oxlint and production build pass. The animation uses browser transforms on cached SVG sprites, with no frame-by-frame layout reads; reduced motion settles completion directly.
