# Payment fan browser QA

Checked in Chrome using visible game controls, keyboard focus, actual head-to-head pointer drags, and actual claim clicks. Fixtures supply reproducible hands; these checks are not a new full multiplayer match.

- Desktop, 1600×1000: all eight ordinary options have exposed 72px circular targets. Each focus preview raises the matching card and dims the other eight. Dragging from green to blue also exercises actual pointer entry without dismissing the fan.
- An ordinary blue payment claimed Los Angeles–Phoenix: blue cards 4→1, trains 45→42, score 0→4.
- Right-edge Montréal–Boston choices stayed within x1093–1584 and y208–443. Switching directly to Vancouver–Seattle updated the route and point seal. Outside pointerdown and Escape dismissed the fan after its exit animation.
- Portrait tablet, 768×1024: Winnipeg–Sault Ste. Marie offered eight payments of four colored cards plus two locomotives. Every head stayed inside x261–752, y228–463. Pointer and focus previews raised exactly the selected color and locomotives, dimming the other seven cards.
- Clicking the tablet's blue mixed payment spent four blue cards and two locomotives: total cards 34→28, trains 45→39, score 0→15. The intended route became claimed.
- Different option counts: the Atlas fixture switched Seattle–Portland → Seattle–Calgary → Seattle–Portland → Seattle–Calgary with exactly 3→2→3→2 pins. Restored previews remained correct. Clicking the mixed option spent blue 3 + locomotive 1 and left red 4 + yellow 2; score 24→31 and trains 32→28. No stale-option rendering error occurred.
- Final browser warnings/errors: none. Pin counts and icons remained legible; the redundant route notice is hidden while the point seal is present.

Evidence: `fan-desktop.png`, `fan-closeup.png`, and `fan-tablet-mixed.png`. The desktop and tablet bounds above were measured; every possible route/viewport orientation was not exhaustively tested. Development HMR resets during build/check commands were excluded from gameplay findings.
