# Offline carriage sprite verification

Generated with `uv run --python 3.12 scripts/bake-carriages.py` from the eight preserved Printables models in `scripts/assets/printables-trains.json`. No Three.js dependency, browser renderer, external raster service, or procedural replacement train is involved. Five current player models are baked; all eight mesh sources remain available offline.

- Five lossless transparent WebP sheets, each 1152×1152, contain 36 192×192 heading cells.
- Three-times supersampled depth-buffer rasterization, creased vertex normals, fixed matte lighting, player-colored roofs, dark frames/coal, and soft contact shadows.
- Every one of 180 frames has a nonempty alpha bounding box entirely inside its cell. No sprite or shadow touches a cell edge.
- Ground anchor is 96,96. Heading angles advance 10° clockwise from right. Uniform frame scaling fixes the projected longitudinal axis at 128px at every heading.
- Numerical projection check: maximum angle error below 1e-12 degrees and maximum length error below 1e-12px.
- Combined sheet size: 1,298,344 bytes. Runtime needs five reusable image decodes, with no mesh data or GPU contexts.
- `contact-sheet.png` was inspected after generation: all five colors and silhouettes remain distinct, roof colors coherent, windows/underframes visible, edges antialiased. It shows six representative headings for every player model.

For runtime SVG cropping, frame index is `round(((angle %360)+360)%360 /10)%36`; column is `index%6`, row is `floor(index/6)`. The cropped frame's 192×192 viewport uses the anchor 96,96 and scale `(routeMarkerLength - 1.2)/128`. Use the exact same heading frame/scale in claim animation and final board placement.
