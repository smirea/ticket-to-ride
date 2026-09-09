# Shared-city ticket preview

Production UI check, 1600×1000, five players and twelve owned tickets:

- Pointer activation of Los Angeles revealed its three tickets together and drew three connections, highlighting Los Angeles, Chicago, New York and Miami.
- Moving/clicking onto empty atlas space cleared all traces, raised states and dimming; the original twelve-ticket order returned.
- Escape dismissed the preview. Enter on the city restored all three tickets and connections.
- Opening the Seattle–Calgary GPS menu and clicking Los Angeles left the menu open with zero ticket traces or raised tickets. The board remained inert; Cancel restored interaction.
- Production console was clean. The browser control provides pointer clicks and keyboard input, so mouse-only movement without a click was not independently isolated; pointer-enter/leave handlers and keyboard activation share the same preview function.

56 tests pass; Svelte check has zero errors/warnings; Oxlint and production build pass. Ticket ownership and ordering are unchanged in game state; preview sorting is local and transient.
