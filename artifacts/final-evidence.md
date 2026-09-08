# Atlas correction evidence

## Requested skill source

https://github.com/majidmanzarpour/threejs-game-skills at `e5f301d548bb18c530afbece78cd25082f4cda9c`.

Read director, AAA graphics builder (visual scorecard, authoring recipes, technical art and shader cookbook), UI designer, gameplay systems, debug profiler, QA release, release checks, visual harness and evidence manifest. Viewed all three calibration anchors. No additional provider credentials were available; built-in ImageGen supplied the atlas asset.

Browser work used CUA. The repository's standalone Playwright canvas inspector was not run. Its pixel-statistics algorithm was adapted offline to crops of actual CUA screenshots, and renderer budgets came from the application's DOM-exposed Three.js diagnostics. These are equivalent measurements for the stated crops, not a claim that the external harness ran.

## Asset

`apps/ui/static/game-assets/atlas/usa-relief-v2.webp`: 1591 × 988, 626,270 bytes. Built-in ImageGen used the selected modern reference and a city-coordinate geography guide. Three iterations aligned the Great Lakes and Gulf coast. No text, numbers, routes, city dots, trains or boats are baked into the artwork.

Final corrective prompt: “Keep exact illustrated atlas style and geography above 70% unchanged. Extend southern land shoreline (50%,100%), (53%,94%), (60%,91%), (65%,90%), (70%,88%), (75%,85%), (80%,83%), (87%,98%). New Orleans 62%,86% and Miami 87%,93% safely on land. Add matching parchment lowlands, tiny forests, extended Mississippi delta. Preserve exquisite relief detail, palette, straight-down rectangular framing; no text, labels, dots, markers, routes, trains or boats.”

The authored illustration is the texture on a shallow relief mesh. It is not a collection of individually modelled mountains. Routes, boats and selected moving trees are real Three.js geometry.

## Evidence set

| File under atlas-v2/        | Captured state                                                           |
| --------------------------- | ------------------------------------------------------------------------ |
| desktop.png                 | Reference-matched two-player Atlas fixture, 1586 × 992                   |
| desktop-production.png      | Real five-player game after draws and AI claims, 1586 × 992              |
| mobile-production.png       | Fresh production five-player game after opening tickets, 390 × 844       |
| mobile-overview.png         | Restored production game, automatic full-atlas fit, 390 × 844            |
| motion-a.png / motion-b.png | Same unpaused desktop game with no input between captures                |
| metrics.json                | Pixel measurements, production renderer counts, local development timing |

Desktop crop entropy 7.33 bits, edge density 0.787, luminance contrast 115.6 and dominant color share 0.048. Phone crop: 7.46, 0.701, 104.8 and 0.045. Dense illustration explains the high edge density; these numbers are not aesthetic scores. The two motion crops have 119,561 changed pixels above a two-channel-value threshold out of 762,500 pixels.

## Scorecard

Genre equivalents: hero = atlas; constraints = route geometry and ownership; interactables = tickets, train cards and cities. No enemies or unrelated props were introduced. Scores are qualitative, calibrated against the supplied anchors, across the declared desktop/phone evidence. “Before” refers to the previous implementation screenshots retained under docs/design/2026-09-08/implementation.

| Category             | Before | After | Evidence                                                            |
| -------------------- | -----: | ----: | ------------------------------------------------------------------- |
| Art direction        |    1.5 |   2.5 | Coherent paper, illustrated terrain, carriage cards and navy ink    |
| Hero / atlas         |      1 |   2.5 | Authored relief illustration, physical edge and slight perspective  |
| Constraints / routes |      2 |     2 | Real network, parallel spacing, stronger pieces, readable ownership |
| Interactables        |      2 |   2.5 | Distinct card subjects, endpoint previews, verified payment         |
| World / environment  |      1 |   2.5 | Detailed mountains, forests, coasts and animated water              |
| Materials / textures |    1.5 |   2.5 | Shared pigmented pieces, illustrated paper, modest texture budget   |
| Lighting / render    |    1.5 |   2.5 | Route contact shadows and table depth without post-processing       |
| Motion / feedback    |      2 |     2 | Restrained ambient movement and route settling; no physics added    |
| UI / HUD             |    1.5 |   2.5 | Removed unwanted labels, strong hierarchy, responsive collections   |
| Performance evidence |      2 |   2.5 | Final renderer counts, local frame sample, real production play     |

After average: 2.4. No automatic failures identified in the declared captures. These scores support this corrective pass; they are not a claim of exact reference reproduction or showcase quality.

## Performance tradeoff and release checks

14 draw calls, 289,004 triangles, 12 geometries, 5 textures. Below the supplied starting budgets (desktop 300 calls/750k triangles; mobile 150/300k), but close to the mobile triangle budget. Compared with the earlier 17 calls/84,388 triangles, bevelled pieces and the textured relief increase geometry while reducing calls. Desktop DPR cap 2; mobile cap 1.5. Shadow maps use 2048 or 1024 at initialization. Shadows update on changes; geometry and textures are disposed on teardown.

Local development 180-frame timing: median 16.70 ms, p95 17.60 ms. Production counts and clean console were verified separately; no physical low-end-device timing was collected.

All 42 tests / 1,599 assertions, production build, zero-error typecheck, lint, formatting and diff checks passed. The low-thinking playtest agent successfully drew cards and claimed Phoenix–Santa Fe. Production direct initialization, five-player AI turns and saved-game restore passed. Detailed findings and coverage limits are recorded in design-qa.md.
