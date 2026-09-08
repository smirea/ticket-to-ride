# Route network trace

The city centers and all 100 route lanes were manually traced from the user-supplied 1024 × 683 board photograph (`codex-clipboard-07b02d41-5aac-4935-a191-97e33654f286.png`). The scoring border is excluded with source bounds x40–985, y45–640, normalized to the existing 1000 × 620 board coordinate system.

`apps/ui/src/lib/game/board/route-trace.ts` preserves the measured source-pixel coordinates. Straight lanes use two endpoints. Curved lanes use explicit cubic Bézier control points fitted visually to the photograph. These are faithful manual curve fits, not a claim of pixel-identical automated vectorization. Each parallel route has its own measured lane; no synthetic sinusoid, parallel offset, or length-driven curve inflation remains. Several crowded endpoints were shortened by 3–5 source pixels to keep adjacent routes' rectangular footprints separate.

The shared game map/rules remain unchanged. Only the board's visual city coordinates are replaced. The reference uses a yellow Salt Lake City–Denver lane where this game's existing rules specify orange; the game's rule color is retained.

Marker centers advance by equal arc length. Marker lengths are shared within each route and follow the reference's slight printed-size variation across routes: 27.56–38.30 board units, with a constant 8.8-unit width. Gaps between adjacent centers minus car length measure 0.90–1.08 units. They are intentionally almost touching. City clearance remains above 9 units from every car's rectangular footprint to every city center.

Exports:

- `routePoint(route, t)` traverses the traced first-to-last marker edges at constant distance.
- `routeMarkerT` and `routeMarkerPoint` preserve their existing signatures.
- `routeMarkerLength(route)` supplies the length for both SVG and Three.js cars.
- `routeSvgPath(route)` exposes the exact measured lane as an SVG path.
- `routeOutlinePath(route)` extends that path to both city centers for one visually contiguous network halo.

Validation: all 100 hit centerlines are noncrossing; rectangles from different routes do not overlap; every city's car clearance and all adjacent-car gap bounds pass geometry tests. `reference-trace.svg` and its PNG render are geometry-only inspection artifacts, not final UI screenshots. The PNG's text rasterization is limited by the local ImageMagick font backend; route geometry is unaffected.
