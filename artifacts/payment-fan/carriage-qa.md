# Claimed carriage QA

- Preserved all eight original Printables models and original component transforms. Increased upper-body detail to retain roofs/windows instead of collapsing their silhouette.
- Removed triangle-selected roof tint. Complete upper bodies and roofs now use player color; wheel frames and coal remain dark. Shared material is matte to avoid chalky highlights.
- Replaced global tilt with local gentle roll and terrain-following pitch. Nine footprint samples determine floor clearance. Claim sprites use the same matrix/material helper as the live renderer.
- Projected bounding-box convex hulls use actual model bounds, the same camera and pose, and 1.25 SVG-unit padding. The UI masks route graphics beneath these hulls while preserving city labels.

## Validation

- Svelte check: 0 errors, 0 warnings.
- All eight mesh assets: finite coordinates, triangle indices in range, nonzero triangle area, longitudinal extent exactly 1 (within 1e-6), and floor Z=0.
- Exhaustive ground check: transformed every vertex of all eight models at every segment of all 100 routes. Minimum vertex-to-terrain clearance +0.01912798 world units (caboose, Boston–New York red, segment 2). No geometry below terrain.
- Five-player Train fleet fixture inspected at fit and zoom: red coach, blue passenger, green flatbed, yellow boxcar, black coal; no white roofs or end-up poses. Adjacent route graphics no longer cross over claimed models.
- Browser warnings/errors: none.
- Live fleet counters: 9 draw calls, 7 geometries, 254,906 rendered triangles. Initial 180-frame sample median16.70ms/p9548.90ms included loading/HMR; it is not a steady-state performance benchmark.
- Formatted JSON: 867,042 bytes; gzip: 217,379 bytes. Conversion script emits compact JSON before repository formatting.

Evidence: `carriages-final.png` (all five models) and `carriage-closeup.png` (zoomed west/central area).
