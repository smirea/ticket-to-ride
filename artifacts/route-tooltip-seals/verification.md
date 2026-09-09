# Route tooltip refinement — September 9, 2026

Verified the running debug fixtures in Chrome with native CDP pointer movement at 1600×1000. These are targeted UI checks, not a full game replay.

- Seattle–Calgary with the full-table hand: eight payment rows in one paper tooltip, one score seal centered vertically on its left edge.
- Initial hand: one score seal and “can't claim”, with no payment rows or duplicate notice.
- Hand hover: relevant colored routes stay colored, neutral markers remain #9b9f94, and each preview shows its score inside one seal plus colored payment icons.
- Tooltip SVG is a direct child of body, fixed to the viewport at z-index 1000, escaping the tilted atlas and all tabletop stacking contexts. Pointer events remain disabled.
- Native pointer entrance/exit samples in motion-check.json show scale/opacity interpolation and removal only after the exit transition. Sample delays are incremental, not absolute timestamps.
- Resizing to 900×1200 updates the overlay to the full viewport; the tooltip remains within it.
- Zoom controls are absent.
- Shared seal numerals optically centered; zero ticket groups omitted. Separate agent checked initial and train-fleet ticket counters, including the green completed icon and journal-style unfinished icon (../count-alignment/refined.png).

Validation: ui:check (zero errors/warnings), lint, production UI build and server typecheck all passed.
