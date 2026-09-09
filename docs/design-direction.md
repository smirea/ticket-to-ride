# Ticket to Travel — current design and motion brief

This is the current interpretation of the user's feedback across the complete design conversation, updated September 9, 2026. Later feedback supersedes earlier alternatives. Use it to critique the running experience, not merely to check whether individual features exist.

## Character and composition

An optimistic, charming, industrious Victorian upper-class travel game: an exquisite illustrated atlas resting at a slight angle on a physical table. Whimsical, warm and finely crafted, never cheap, generic, sterile, neon, cluttered or cartoonishly bouncy. Rich illustration, parchment, restrained brass, enamel, clay point seals, real thickness and soft contact shadows. All pieces should feel placed by hand and belonging to the same world. Legibility and gameplay take priority over decoration.

The atlas is the hero. Tickets and player plaques lightly rest on its edges; the player's fanned hand casts a floating shadow and slightly overlaps the bottom; the market is a fitted tabletop storage tray. Components can touch and overlap deliberately. Avoid dashboard-like empty gutters, repeated instructional headings, large blocking panels and gratuitous prose. No labels reading destination tickets / your train cards / face-up train cards / your turn paragraphs on the board. Small functional copy is acceptable when needed to act or recover.

Desktop and tablets only, including portrait tablets, minimum layout width 768px. No phone layouts, drawers, hidden city names, phone map modes, or mobile-first compromises. Support all five players and many destination tickets gracefully. Whole-app entry, lobby, waiting room, settings, history and results must belong to the tabletop world too.

## Board and routes

Use the existing static painted atlas image directly, without terrain distortion or animated water/trees. CSS rotateX/rotateZ provides the slight physical tilt and layered shadows give the board thickness. No Three.js or runtime 3D engine. Keep the established exact physical-board city coordinates and route arcs, uniform carriage/marker lengths, near-touching route segments, and clear gaps at city hubs. Double and triple lanes must remain individually legible and clickable along their full lengths. City circles are slightly larger, with larger readable atlas serif labels horizontally centered on each hub. Long names can wrap to two balanced lines; place labels above or below to avoid nearby names and player plaques.

Unclaimed routes are flat printed placeholders, clearly saturated and distinguishable against the terrain. A translucent dark backing connects visually with city halos into one network. The backing fades when filtering by a hand card. Selected-card filtering retains the colors of useful routes and dims only irrelevant routes; usable gray routes can take the selected card's color.

Use the latest reference's color symbols consistently on cards and in route-marker centers: red flame, orange ring, yellow hourglass/bowtie, green clover, blue spiral, purple droplet, black diamond, white asterisk. Symbols share subtle ivory/white treatment with a faint dark edge. Gray routes have no color symbol. No written color tags on cards.

Claimed routes must look like unmistakably physical carriages, colored by owner and using distinct player shapes baked from the imported Printables models. Coherent roofs, windows, wheel geometry and shadows; no white roof patches, end-up train poses, clipped/submerged geometry, or paths drawing over trains. Align their anchors to the printed routes. Reuse directional sprite sheets with consistent scale, lighting and baked shadows.

No boats, animated water, wind-reactive trees or Living atlas setting. The user explicitly withdrew those effects and asked for the image as-is. Board/city text must not be selectable.

## Route selection and payment

Hover/focus a route: lift relevant hand cards, dim the rest, and show the same compact enamel tooltip used by hand-card hints. Stack every minimal payment option, each with score/seal, colored carriage count/icon and optional locomotive count/icon. If unaffordable, show only score/seal and “can't claim”. Clicking an unaffordable route adds no popup or duplicate feedback.

One legal payment claims directly. Multiple payments use the latest fanned GPS-style enamel pins, all originating at the route's actual midpoint. Each pin shows colored carriage icons and exact counts, plus a recognizable locomotive icon when needed. Hover/focus a pin previews exactly those cards in the hand. Pins remain exposed, stable targets, fit at edges and on tablets, and scale in/out. While open, only the GPS menu is interactive: underlying header, tickets, board, hand and market are inert. Keep the close X on the opposite side of the route anchor from the options, including when the fan flips below a northern route. Trap keyboard focus within the pins and Cancel; Escape/Cancel restore the table. Outside clicks neither dismiss the menu nor clear the focused pin preview. No old rectangular payment dialog. Keep only the least-locomotive payment for each ordinary color; do not offer wasteful variants. An all-wild option occurs once when appropriate.

Hand-card hover highlights useful routes; clicking pins that filter until toggled/cleared. Hover and selection must not fight, oscillate, unexpectedly clear, or mask the actual route hit targets. Invisible padding must never block atlas controls or routes. Native title tooltips are unwanted on route/cost/card interactions; retain useful accessible names.

## Destination tickets

Wide rectangular physical rail tickets, slightly angled and overlapping the board, stacking when there are many. Full-bleed destination illustrations include consistently designed city names as part of the artwork. Clay point seals are image assets; their numbers are rendered by UI, never baked into artwork. Keep the established beautiful destination art, do not replace it with generic blank cards.

Ticket contours include punched/notched edges; selected outlines follow that contour. Hover/focus gives obvious destination-endpoint and connecting-map feedback, which clears when the pointer leaves the real ticket silhouette. Hovering/focusing a city with owned tickets previews every matching ticket and all their destination connections together. Temporarily fan matching tickets to the front, including completed ones; restore the normal order and scroll position when leaving. Cities without owned tickets do nothing, and the GPS payment menu keeps its exclusive interaction. Ticket connections and endpoint markers render above every other map layer, including carriages, labels and route hints. Draw all connection underlays before their foreground lines so simultaneous previews remain visible at crossings; the overlay never intercepts pointer input. Replace the unfinished filter with a centered completed/unfinished count pair using the same icons as the player plaques. Completed tickets stay at the top, subtly desaturated with a legible stamp. Newly completed tickets lift and enlarge into view below the atlas, highlight both endpoint cities, and trace the shortest owned connection with an ordered scale wave through every carriage. Then slap the completion stamp on, reserve the new top slot, move the other tickets, and fly the ticket into that exact final pose. Celebrate multiple new completions serially; do not replay on initial load. Reduced motion settles directly.

Ticket selection is to the left of the atlas, resting on it slightly; during later draws it appears below owned tickets, with existing and offered tickets visible together. Board and column can resize to accommodate it. No selected-count chatter. Keep minimum-required selection clear through restrained functional state.

Keeping tickets is a sequence: fly selected tickets into their final positions in the owned stack, then slide the offer container out. Account for the final stack height and completed-first order before motion begins. Never pop tickets in at the end, lose their location, or jump the whole sidebar.

## Hand and market

The fanned hand uses different illustrated car designs for every ordinary color. Colors are unmistakable and accessible through the shared symbols. Locomotive art is a real steam engine with a multicolor sky, visually distinct from carriages. The original navy mountain-and-rail card back is retained; no text-heavy replacement back.

The market tray has a thin crafted rim, exact space for five cards, no conspicuous empty interior area, and a physical deck compartment. Hand cards, all five market cards and the deck share one physical face size, calculated to fit the full nine-color hand with readable spacing at desktop and tablet widths. Do not label it with unnecessary prose. Counts and availability must be understandable without clutter.

Drawing a card: reserve the hand's exact final shape first (including a new-color slot), fly the card into that position at its final scale and angle, then settle seamlessly. For a face-up draw, remove the chosen card into the hand, slide remaining market cards, then deal the replacement at the end. No duplicate flashes, extra phantom cards or abrupt reordering. A three-locomotive reset removes all five cards, then deals five replacements in order, with the final count correct.

Claiming a route: gather the spent cards above the hand, transform into sprites of the correct player's actual carriage models, fly/place those cars onto the route, and blend into the identical permanent sprites without position, angle, size, color or visibility jumps. The hand's final remaining fan must be prepared too.

## Status, players and supporting pieces

One small functional action ticket above the destination tickets. Use the notched outer ticket silhouette with no busy background art. Center the action message. The vertical stub contains only the player name in larger type, without an avatar or turn wording. Vibrant for the viewer's turn, muted for opponents. It should say what is currently happening, including draw two, ticket selection, final round and finished game, without stale messages.

Player plaques lightly overlap the top board edge, with portrait and vertical player name on the trailing right edge. Three metric rows: score and clay seal; unfinished/completed ticket counts with distinct icons and zero groups omitted; remaining carriages and cards in hand. The whole plaque uses that player's color, with no tiny color strip below the portrait. Raise the active plaque and rotate a detailed 30px brass steampunk gear overlapping its bottom-left corner. All five must fit. In multiplayer, expose completed-ticket counts without revealing private destinations.

A small engraved scoring reference at the end of the ticket column, outside the map, shows route lengths 1–6 with carriage icons and scores 1,2,4,7,10,15. It must remain fitted around many tickets and tablet layouts.

The history is a paper logbook with a book icon, never an undo arrow. Group two draws into one concise turn row, color player names, use colored carriage/locomotive icons for face-up draws and a deck icon for blind draws. Show recorded route payments with correct colors and score seals right-aligned. Hover/focus route rows and known own destination entries previews their map geometry; never infer hidden destinations or unrecorded locomotive counts. Settings/history/results should use restrained physical pieces, concise readable content, consistent shadows and gentle motion. Endgame should feel like an earned arrival; standings are clear, final scores agree, and the player can close/reopen results without losing the table.

## Motion requirements and acceptance

Every entrance and interaction is intentional. Board, selector, cards, tickets, plaques and tray arrive rather than pop. Hover effects suggest a light lift/tactile response with stable hit areas. Prefer short, polished sequences, calm easing and a tiny amount of whimsical personality; avoid springy toy-like excess, sluggish locks or animations that delay every decision unnecessarily.

No pop-ins at animation endpoints. Receiving elements must already have their final geometry. Keep flying elements until the real element is rendered, without duplicates. Interrupted, rapid, rejected, remote and repeated actions must unwind cleanly. Remote opponent actions should read as coherent turns, not unexplained jumps or stale availability. Preserve hover/focus across sensible updates; clear it when no longer relevant.

Use SVG, Svelte, CSS transforms and browser animations. Bake models offline; do not load meshes, create canvas/WebGL contexts, capture carriage images at runtime or run an ambient frame loop. Use the same sprite frame and affine transform for flight and settled placement; the CSS tilt should not introduce a projective endpoint mismatch. Avoid per-frame DOM layout, redundant rerenders and expensive unbounded effects. Respect reduced motion. Distinguish intentional animation time, network latency, layout shift, and frame stutter. Do not declare smoothness from a screenshot or a startup FPS sample alone.

## Superseded directions

The former Three.js, elevated-terrain and living-map requirements are superseded by a static atlas and CSS tilt. Do not reopen the four initial visual concepts (modern, futuristic, two Victorian) or restore Railbound branding. The selected atlas/tabletop is established. Do not add phone UX, written train-color tags, boats, rectangular payment dialogs, arbitrary all-wild/wasteful payment options, hand-positioned error copy, pale train roof triangles, old color symbols, or section-heading prose. The earlier generic no-route-popups request now allows only the latest fanned pins for genuinely multiple payment choices.

## Critic protocol for the current pass

Two independent browser players must play a real two-player game from entry/lobby through final scoring. Use actual UI controls and authoritative turns, not API/state manipulation or shortened fake games. Use normal animation speed. Aim to complete tickets, claim varied lengths and neutral/parallel routes, draw tickets midgame, and trigger final round normally. Capture representative screens before critique, and measure/observe timing where possible.

Audit every surface encountered and supplement missing cases with separate labeled fixtures afterward: full five-player/many-ticket layout, market reset, all colors/shapes, tablet, reduced motion, and failures. For each finding log ID, severity, step/state, exact reproduction, screenshot, expected spirit, observed problem, timing evidence, and suggested smallest coherent fix. Do not call a tool automation limitation an app bug without evidence. Report serious blockers immediately; share cumulative prioritized findings while continuing the match.

Root resolves every finding explicitly: fix and retest, combine a duplicate, reject with concrete design rationale, or identify a real blocker. Iterate with both critics on changed interactions and a final whole-table review. Satisfaction means no observed blocking/major usability defect, no reproducible endpoint jump or severe stutter left unresolved, and both critics accept the overall visual/motion coherence within documented tested coverage. It is not a promise of perfection on every device.

## Icon and turn-indicator refinement

Visible score, carriage and locomotive units use icons everywhere, including route notices, journal entries and rules. Keep descriptive screen-reader labels. Reuse the GPS payment pin's TrainPieceIcon for locomotive imagery and carriage units; do not introduce alternate train icons. The full visible payment-pin silhouette, including its stem, selects and previews that option. The central score seal is 50px with a 26px numeral (twice its original size). The status-ticket stub contains only a larger vertical player name, with no avatar or turn wording. A 30px brass steampunk gear overlaps the active player plaque's bottom-left corner, fades between turns, and remains static under reduced motion.
