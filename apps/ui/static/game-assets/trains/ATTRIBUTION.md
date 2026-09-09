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

Quadric mesh reduction and removal of degenerate faces make the models suitable for repeated real-time rendering. Final triangle counts are 1,876 carriage, 1,876 passenger, 1,876 boxcar, 1,882 flatbed, 1,888 coal, 1,888 caboose, 2,020 hopper, and 2,972 tanker. The last two retain additional constrained detail rather than forcing further silhouette loss. The complete asset is 449,687 bytes (127,090 bytes gzipped). Colors are assigned to existing geometry: player-colored upper bodies, dark underframes/wheels or coal, and lighter player-tinted trim on upward-facing roof/rim surfaces. No procedural substitute train geometry was added.

## Runtime file

`printables-trains.json` contains `{version, sourceSha256, coordinates, models}`. Every model contains `{id, name, sourceAssembly, sourceObjects, sourceTriangles, triangles, parts}`. Each part contains `{material, sourceObject, positions, indices}`. Positions are flat XYZ floats, indices describe triangles, and material is `body`, `trim`, or `dark`. Compute normals once when loading. Body vertices should use the player's color; trim vertices use a lighter tint of that player color and dark vertices retain their own palette color.

Model order: carriage, passenger, boxcar, flatbed, coal, caboose, hopper, tanker. All eight are retained so future player choices can use distinct silhouettes.

## Reproduction

From the repository root, with the source 3MF downloaded separately:

```sh
uv run --python 3.12 scripts/convert-printables-trains.py '/path/to/TtR Overdetailed Train Cars.3mf'
```

The conversion script declares pinned isolated build dependencies, with no new runtime dependency. The original 3MF is preserved outside the repository.
