# Ticket to Travel — current design and motion brief

This is the current interpretation of the user's feedback across the complete design conversation, updated September 9, 2026. Later feedback supersedes earlier alternatives. Use it to critique the running experience, not merely to check whether individual features exist.

## Character and composition

An optimistic, charming, industrious Victorian upper-class travel game: an exquisite illustrated atlas resting at a slight angle on a physical table. Whimsical, warm and finely crafted, never cheap, generic, sterile, neon, cluttered or cartoonishly bouncy. Rich illustration, parchment, restrained brass, enamel, clay point seals, real thickness and soft contact shadows. All pieces should feel placed by hand and belonging to the same world. Legibility and gameplay take priority over decoration.

The atlas is the hero. Tickets and player plaques lightly rest on its edges; the player's fanned hand casts a floating shadow and slightly overlaps the bottom; the market is a fitted tabletop storage tray. Components can touch and overlap deliberately. Avoid dashboard-like empty gutters, repeated instructional headings, large blocking panels and gratuitous prose. No labels reading destination tickets / your train cards / face-up train cards / your turn paragraphs on the board. Small functional copy is acceptable when needed to act or recover.

Desktop and tablets only, including portrait tablets, minimum layout width 768px. No phone layouts, drawers, hidden city names, phone map modes, or mobile-first compromises. Support all five players and many destination tickets gracefully. Whole-app entry, lobby, waiting room, settings, history and results must belong to the tabletop world too.

## Board and routes

Three.js terrain with a consistent painted atlas, restrained dimensional height, no warped corners, readable coastline and city registration. Keep the established exact physical-board city coordinates and route arcs, uniform carriage/marker lengths, near-touching route segments, and clear gaps at city hubs. Double and triple lanes must remain individually legible and clickable along their full lengths.

Unclaimed routes are flat printed placeholders, clearly saturated and distinguishable against the terrain. A translucent dark backing connects visually with city halos into one network. The backing fades when filtering by a hand card. Selected-card filtering retains the colors of useful routes and dims only irrelevant routes; usable gray routes can take the selected card's color.

Use the latest reference's color symbols consistently on cards and in route-marker centers: red flame, orange ring, yellow hourglass/bowtie, green clover, blue spiral, purple droplet, black diamond, white asterisk. Symbols share subtle ivory/white treatment with a faint dark edge. Gray routes have no color symbol. No written color tags on cards.

Claimed routes must be unmistakably physical 3D carriages, colored by owner and using distinct player shapes from the imported Printables models. Coherent roofs, windows, wheel geometry and shadows; no white roof patches, end-up train poses, clipped/submerged geometry, or paths drawing over trains. Terrain alignment must look plausible without impairing recognition. Reuse instancing and shared materials.

No boats: earlier animated-boat requests were explicitly withdrawn. Ambient water and trees may move slowly; pointer response should feel like a gentle breeze, never distract from route selection. Board/city text must not be selectable.

## Route selection and payment

Hover a route: lift relevant hand cards, dim the rest, and show points above that route. If unaffordable, show a concise above-route notice. If locomotives are required, show their count. Clicking an unaffordable route jiggles that route and briefly shows red feedback there, without a blocking dialog or spending anything.

One legal payment claims directly. Multiple payments use the latest fanned GPS-style enamel pins, all originating at the route's actual midpoint. Each pin shows colored carriage icons and exact counts, plus a recognizable locomotive icon when needed. Hover/focus a pin previews exactly those cards in the hand. Pins remain exposed, stable targets, fit at edges and on tablets, scale in/out, and can dismiss or switch routes with one interaction. No old rectangular payment dialog. Keep only the least-locomotive payment for each ordinary color; do not offer wasteful variants. An all-wild option occurs once when appropriate.

Hand-card hover highlights useful routes; clicking pins that filter until toggled/cleared. Hover and selection must not fight, oscillate, unexpectedly clear, or mask the actual route hit targets. Invisible padding must never block atlas controls or routes. Native title tooltips are unwanted on route/cost/card interactions; retain useful accessible names.

## Destination tickets

Wide rectangular physical rail tickets, slightly angled and overlapping the board, stacking when there are many. Full-bleed destination illustrations include consistently designed city names as part of the artwork. Clay point seals are image assets; their numbers are rendered by UI, never baked into artwork. Keep the established beautiful destination art, do not replace it with generic blank cards.

Ticket contours include punched/notched edges; selected outlines follow that contour. Hover/focus gives obvious destination-endpoint and connecting-map feedback, which clears when the pointer leaves the real ticket silhouette. Completed tickets show the physical punch/stamp animation and remain clearly marked completed; their illustration is subtly desaturated while the stamp stays legible.

Ticket selection is to the left of the atlas, resting on it slightly; during later draws it appears below owned tickets, with existing and offered tickets visible together. Board and column can resize to accommodate it. No selected-count chatter. Keep minimum-required selection clear through restrained functional state.

Keeping tickets is a sequence: fly selected tickets into their final positions in the owned stack, then slide the offer container out. Account for the final stack height and completed-ticket filter before motion begins. Never pop tickets in at the end, lose their location, or jump the whole sidebar.

## Hand and market

The fanned hand uses different illustrated car designs for every ordinary color. Colors are unmistakable and accessible through the shared symbols. Locomotive art is a real steam engine with a multicolor sky, visually distinct from carriages. The original navy mountain-and-rail card back is retained; no text-heavy replacement back.

The market tray has a thin crafted rim, exact space for five cards, no conspicuous empty interior area, and a physical deck compartment. Do not label it with unnecessary prose. Counts and availability must be understandable without clutter.

Drawing a card: reserve the hand's exact final shape first (including a new-color slot), fly the card into that position at its final scale and angle, then settle seamlessly. For a face-up draw, remove the chosen card into the hand, slide remaining market cards, then deal the replacement at the end. No duplicate flashes, extra phantom cards or abrupt reordering. A three-locomotive reset removes all five cards, then deals five replacements in order, with the final count correct.

Claiming a route: gather the spent cards above the hand, transform into the correct player's actual carriage models, fly/place those cars onto the route, and blend into the permanent meshes without position, angle, size, color or visibility jumps. The hand's final remaining fan must be prepared too.

## Status, players and supporting pieces

One small functional action ticket above the destination tickets. Use the notched outer ticket silhouette with no busy background art. Center the action message. The vertical stub contains only vertical Your turn / Name's turn text, without an avatar. Vibrant for the viewer's turn, muted for opponents. It should say what is currently happening, including draw two, ticket selection, final round and finished game, without stale messages.

Player plaques lightly overlap the top board edge, with portrait, name, clay-seal points icon/count, carriage icon/trains count and little prose. The whole plaque uses that player's color, no tiny color strip below the portrait. Raise the active player's plaque and rotate a small brass gear at its bottom right. All five must fit.

A small engraved scoring reference at the end of the ticket column, outside the map, shows route lengths 1–6 with carriage icons and scores 1,2,4,7,10,15. It must remain fitted around many tickets and tablet layouts.

Settings/history/results should use restrained physical pieces, concise readable content, consistent shadows and gentle motion. Endgame should feel like an earned arrival; standings are clear, final scores agree, and the player can close/reopen results without losing the table.

## Motion requirements and acceptance

Every entrance and interaction is intentional. Board, selector, cards, tickets, plaques and tray arrive rather than pop. Hover effects suggest a light lift/tactile response with stable hit areas. Prefer short, polished sequences, calm easing and a tiny amount of whimsical personality; avoid springy toy-like excess, sluggish locks or animations that delay every decision unnecessarily.

No pop-ins at animation endpoints. Receiving elements must already have their final geometry. Keep flying elements until the real element is rendered, without duplicates. Interrupted, rapid, rejected, remote and repeated actions must unwind cleanly. Remote opponent actions should read as coherent turns, not unexplained jumps or stale availability. Preserve hover/focus across sensible updates; clear it when no longer relevant.

Use Svelte/CSS transforms for paper and simple motions, shaders/instanced Three.js where that improves actual performance. Avoid unnecessary WebGL contexts, per-frame DOM layout, redundant rerenders and expensive unbounded visual effects. Pause ambient work when hidden; respect reduced motion. Distinguish intentional animation time, network latency, layout shift, and frame stutter. Do not declare smoothness from a screenshot or a startup FPS sample alone.

## Superseded directions

Do not reopen the four initial visual concepts (modern, futuristic, two Victorian) or restore Railbound branding. The selected atlas/tabletop is established. Do not add phone UX, written train-color tags, boats, rectangular payment dialogs, arbitrary all-wild/wasteful payment options, hand-positioned error copy, pale train roof triangles, old color symbols, or section-heading prose. The earlier generic no-route-popups request now allows only the latest fanned pins for genuinely multiple payment choices.

## Critic protocol for the current pass

Two independent browser players must play a real two-player game from entry/lobby through final scoring. Use actual UI controls and authoritative turns, not API/state manipulation or shortened fake games. Use normal animation speed. Aim to complete tickets, claim varied lengths and neutral/parallel routes, draw tickets midgame, and trigger final round normally. Capture representative screens before critique, and measure/observe timing where possible.

Audit every surface encountered and supplement missing cases with separate labeled fixtures afterward: full five-player/many-ticket layout, market reset, all colors/shapes, tablet, reduced motion, and failures. For each finding log ID, severity, step/state, exact reproduction, screenshot, expected spirit, observed problem, timing evidence, and suggested smallest coherent fix. Do not call a tool automation limitation an app bug without evidence. Report serious blockers immediately; share cumulative prioritized findings while continuing the match.

Root resolves every finding explicitly: fix and retest, combine a duplicate, reject with concrete design rationale, or identify a real blocker. Iterate with both critics on changed interactions and a final whole-table review. Satisfaction means no observed blocking/major usability defect, no reproducible endpoint jump or severe stutter left unresolved, and both critics accept the overall visual/motion coherence within documented tested coverage. It is not a promise of perfection on every device.

## Icon and turn-indicator refinement

Visible score, carriage and locomotive units use icons everywhere, including route notices, journal entries and rules. Keep descriptive screen-reader labels. Reuse the GPS payment pin's TrainPieceIcon for locomotive imagery and carriage units; do not introduce alternate train icons. The full visible payment-pin silhouette, including its stem, selects and previews that option. The central score seal is 50px with a 26px numeral (twice its original size). The status-ticket stub contains vertical turn text only, with no avatar. A small brass gear rotates in the active player plaque's bottom-right corner, fades between turns, and remains static under reduced motion.
