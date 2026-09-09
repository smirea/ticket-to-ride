# GPS isolation and plaque integration check

Chrome UI checks on dev6090, 1440×900. No source edits or DOM event injection.

- Keyboard-focused Seattle–Calgary gray4 showed all eight minimal ordinary-color payments with seven points (`focused-options.png`). This is focus coverage, not pure pointer-hover coverage: the documented CUA API exposes no hover/mousemove or raw CDP capability.
- Eleven Tab presses stayed inside the eight payment choices plus Cancel and wrapped correctly. Header, sidebar, board and tray were inert.
- Pointer clicks on settings, a ticket, the hand, map background and market did not activate underlying controls or dismiss the menu.
- A pointer click on the red pin stem, away from its circular head, selected four red cards and settled at +7 points and -4 trains.
- Unaffordable Los Angeles–El Paso showed 15 points plus “can't claim” on keyboard focus. Enter did not create an additional denial popup (`focused-cannot-claim.png`).
- Cancel and Escape restored interaction after the short exit transition; the settled DOM had zero dialogs and zero inert regions. Settings could then open normally. Console logs were clean.
- Five-player plaque integration correctly showed one completed and one unfinished ticket for the local fixture player, and two unfinished tickets for opponents with zero completed groups omitted (`../player-plaque/count-split.png`).

## Reported issue

Focus the yellow payment pin, then click the inert map background. The GPS menu remains open but the yellow hand preview loses its raised state and all cards return neutral. Evidence: `yellow-focus.png`, `yellow-after-outside-click.png`. This is an outside-click/focus-loss reproduction, not a claim about pointer-only hover. Reported to root for disposition.

**Resolved:** root prevented the shield pointerdown default. Retest clicks on map, settings, ticket, hand and market all retained focus on “Claim with 4 yellow cars,” kept exactly the yellow hand group raised, and left the menu open. Evidence: `outside-click-fixed.png`. No unresolved issue remains in this tested scope; pure hover-only behavior remains unverified because no documented native hover input is exposed.
