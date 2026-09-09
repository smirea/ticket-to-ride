# Ticket to Ride train meshes

These meshes are derived from **Ticket to Ride Train Cars** by **NOT your favorite engineer (@JamPogo_630758)**:

- Source: https://www.printables.com/model/523392-ticket-to-ride-train-cars
- Source download: `TtR Overdetailed Train Cars.3mf`
- Source SHA-256: `038137a5800c785dcf36ff0b1aaecadee8d3cbd5a5d4944f3f69086cdac99db2`
- License: **Creative Commons Attribution–NonCommercial 4.0 International**, https://creativecommons.org/licenses/by-nc/4.0/
- The source credits remixes of **Train Set** by **Adam**, https://www.printables.com/model/470454, and **JFehr11**'s train model, https://www.thingiverse.com/thing:3001841.

The author is not affiliated with or endorsing Ticket to Travel. The Creative Commons noncommercial license applies to these derived train assets; the application's code license does not replace it.

## Changes

Eight distinct cars were extracted from the original printable assemblies; repeated printing copies, station models, and unrelated accessories were omitted. Original component transforms were applied, meshes were centered with their floor at Z=0, and all dimensions were uniformly divided by their original 26 mm length, with a final uniform recenter/normalization after simplification. Thus X is the longitudinal axis with length 1; Y is the centered width; Z is up. Original proportions and component boundaries remain.

Quadric mesh reduction and removal of degenerate faces make the models suitable for repeated real-time rendering. Final triangle counts are 3,376 carriage, 3,376 passenger, 3,536 boxcar, 2,782 flatbed, 3,710 coal, 3,338 caboose, 3,282 hopper, and 3,328 tanker. Upper-body detail is retained to preserve coherent roofs, windows and silhouettes. The formatted complete asset is 867,042 bytes (217,379 bytes gzipped). Colors are assigned to complete original components: player-colored upper bodies and roofs, dark underframes/wheels or coal. No procedural substitute train geometry was added.

## Offline mesh source and runtime sprites

`scripts/assets/printables-trains.json` retains all eight normalized source meshes and their material/component metadata. It is used only by the offline baker; the app does not load or render mesh geometry.

The runtime uses five transparent lossless WebP sprite sheets, one per current player color. Each sheet contains 36 headings in a 6×6 grid of 192px cells. These images are rasterized from the actual source geometry with creased vertex normals, matte player-colored roofs/bodywork, dark underframes/coal, fixed lighting, and soft contact shadows. Rendering uses an offline NumPy depth buffer with 3× supersampling and Pillow downsampling; no browser renderer or Three.js is used.

`carriage-sprites.json` defines dimensions, anchor, heading step, projected model length, URLs, and model/color mapping. Frame `i` points `i × 10°` clockwise from screen-right. Its anchor is `(96,96)`, the projected ground center. The car's longitudinal axis is 128px for every heading; all other dimensions preserve its original proportions through uniform frame scaling. The 28° oblique view is baked into the sprite, so runtime placement needs only scaling and translation. Claim animation and the board should use the same frame.

All eight source models remain available for future player choices; current sprites map red→carriage, blue→passenger, green→flatbed, yellow→boxcar, and black→coal.

## Reproduction

From the repository root, with the source 3MF downloaded separately:

```sh
uv run --python 3.12 scripts/convert-printables-trains.py '/path/to/TtR Overdetailed Train Cars.3mf'
```

The conversion script declares pinned isolated build dependencies, with no new runtime dependency. The original 3MF is preserved outside the repository.

Bake the runtime sheets and visual contact sheet:

```sh
uv run --python 3.12 scripts/bake-carriages.py
```

The baker declares pinned isolated NumPy/Pillow build dependencies. The generated sprite sheets are derivatives of the same licensed model and retain the attribution and noncommercial license above.
