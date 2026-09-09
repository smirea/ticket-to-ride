# Logbook and route feedback QA — September 9, 2026

The logbook agent played real solo turns at normal speed on the dev build: kept two tickets, drew a green face-up card and a blind card, observed Maya draw a locomotive, and claimed Denver–Santa Fe using one red carriage and one locomotive. The log grouped the two draws, concealed the blind card color behind a deck icon, showed the exact mixed payment and right-aligned score seal, and colored player names. Route-row focus highlighted the route and endpoints; own ticket-chip focus previewed its destination. Escape closed the book. Browser console was clean.

Screenshots: `solo-route-preview.png`, `solo-ticket-preview.png`.

Root also loaded the production build at port 6092, opened the book, clicked the actual middle marker of Helena–Salt Lake City in the claim fixture, and verified the settled journal recorded three purple carriages and a score seal of four. Production console was clean.

The GPS critic's focused eight-option stack, full-stem click, exclusive interaction, cancellation, denial state and five-player tablet checks are documented in `../gps-isolation/critic.md`. An outside-click focus loss was fixed and retested. Pure mouse-hover movement was not exercised because the available browser tool exposes no documented hover input; equivalent focus previews and real pointer clicks were tested.

Validation: 54 tests passed, Svelte check had zero errors/warnings, Oxlint passed, production build and server typecheck passed. Legacy history lacking an exact locomotive count retains only its recorded color; redacted destinations are not guessed.
