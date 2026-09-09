# Ocean margin edit

Built-in image generation edited `usa-relief-v3.webp` into `apps/ui/static/game-assets/atlas/usa-relief-v4.webp`. The original remains available. The selected output is 1594 × 986 and was encoded as WebP quality 94 without cropping or geometric modification.

Generated source: `/Users/stefan/.codex/generated_images/01a081c6-ca88-7f23-bc0b-7b67699faf3d/exec-b9350c03-0cab-4ac4-bc44-e04f4f289ded.png`.

The map's container, aspect ratio, CSS tilt, and surrounding tabletop layout are unchanged. The regenerated image has about 15–16 additional normalized map units of water on each side, approximately 20 screen pixels per side on the 1300px-wide desktop atlas.

SIFT landmark matching found 3,858 matches; RANSAC retained 3,846 with a median residual of 0.43 source-image pixels. The measured horizontal registration is `newX = 15.744 + oldX * 0.96932` in the board's 1000-unit coordinate system. Vertical registration differs by less than a quarter map unit and remains unchanged. Both cities and all route control points pass through the same registration function; route markers, claimed carriages, hit areas, ticket highlights, payment pins, and claim flights inherit it.

Existing route geometry tests pass: no marker collisions, city clearance maintained, and no crossing hit paths.

Browser verification at 1600 × 1000: the atlas loads the v4 artwork; clicking the adjusted San Francisco–Los Angeles route spends three purple cards, places three aligned red carriages, and updates the player to 4 score / 42 trains. The five-player fleet screenshot `desktop.png` shows both coastlines, routes, and all five carriage styles registered to the extended artwork. Svelte check reports zero errors/warnings; lint and the production build pass.

## Final prompt

Edit target: the attached existing Ticket to Travel atlas artwork. Precise outpainting only. Keep the entire original illustration intact, with the same geography, mountain silhouettes, forest and lake locations, lighting, texture, detail, camera angle, and colors. Extend the canvas horizontally by approximately 2% of the original width on EACH side (about 32 additional pixels left and 32 right for this 1591 x 988 source, target approximately 1655 x 988). Fill only the newly added left and right narrow strips with seamless continuation of the existing rich turquoise-blue ocean and subtle painterly water texture. Do not expand the landmass into the new strips. Keep the original image centered and at its original vertical size. Do not add top or bottom padding. The result is the same atlas with just a little more breathing room of ocean along the two vertical edges. Preserve the composition extremely faithfully: absolutely no rearranging/repainting of the central landmass, no changed coastlines, no new mountains or trees, no changes to lake/river coordinates. No text, no route lines, no dots, no symbols, no frame, no tabletop, no boats. Output one high-quality wide landscape game-board background image, retaining all the existing fine illustrated detail.
