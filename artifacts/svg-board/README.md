# Static SVG atlas verification

The atlas uses the unchanged `usa-relief-v3.webp` image, with CSS `rotateX(9deg) rotateZ(-0.65deg)`. Routes, labels, hit areas, and directional carriage images share one SVG coordinate system. Three.js, its types, terrain warping, WebGL rendering, ambient shaders, and runtime model capture have been removed. The model source is retained only for offline sprite baking.

The five player models have 36 baked directions each. SVG cropping reuses five predecoded WebP sheets; the same component draws both the flying carriage and its permanent board counterpart. See `../carriage-bake/README.md` for generation and geometry checks.

## Browser checks

- Root tested actual six-car and three-car claims at 1600×1000, including card payment, hand reflow, arrival, final placement, and score/train updates.
- The first flight check exposed an approximately 20px endpoint mismatch caused by CSS perspective. Replacing perspective with a fixed CSS 3D rotation preserved the tabletop tilt and made flight endpoints match permanent positions. The final three-car check measured less than 0.03 CSS px difference between each flight anchor and its target marker center.
- `claim-flight-arriving.png` and `claim-flight-settled.png` show the corrected endpoint before and after settlement. Browser warning/error logs were empty.
- The independent desktop/portrait check and its icon regression fix are documented in `critic.md`. It covers all five carriage styles, twelve tickets, five players, route pins, card filtering, zoom, pan, Fit map, and zero canvas elements.
- This pass uses targeted fixtures and a short real multiplayer regression. The earlier full-game report remains separate; no universal frame-rate claim is made.

## Validation

Svelte check: zero errors/warnings. Bun: 48 tests passed, including full authoritative games, route payment rules, and route geometry. The two removed tests covered only the deleted terrain-warp renderer. Oxlint and production build passed.

## Native 3D assessment

A cross-browser native model element is not a suitable baseline for this desktop/tablet app. WebKit documents its expansion in [Safari 27](https://webkit.org/blog/17974/web-technology-sessions-at-wwdc26/); [`model-viewer` itself depends on Three.js](https://github.com/google/model-viewer/blob/master/packages/model-viewer/README.md). Baked views preserve the supplied models without reintroducing a runtime 3D engine.
