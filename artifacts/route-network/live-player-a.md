# Ada: live two-player browser playtest

Played the complete 45-train game against the separate Bert agent in private room Y74NR5. Ada hosted as red using DEBUG_ID=qa-live-a; Bert joined as blue. Every gameplay action used visible browser UI (mouse clicks or keyboard activation); no API calls or game-state mutation. Normal animation remained enabled. Finished at room revision 128.

## Result and reconciliation

- Bert won 128 = 60 route points + 58 destination points + 10 longest-route bonus. Four completed tickets; longest path 35; 2 trains left.
- Ada scored 101 = 46 route points + 55 destination points + 0 bonus. Five completed tickets; longest path 27; 7 trains left.
- Ada destinations: Duluth–El Paso 10, San Francisco–Atlanta 17, Chicago–New Orleans 7, Los Angeles–Chicago 16, Kansas City–Houston 5. Sum 55, all visibly marked Connected.
- Final round began after Bert reached 2 trains. Ada saw 2 turns remaining; the first card draw did not decrement it; the second draw ended Ada's turn and decremented to 1. Bert's final two-card draw opened final standings on both clients.

## Verified interactions

- Host a two-player lobby, ready/unready toggle, readiness start gate, start game, independent identities and live handoff.
- Opening destination selection: minimum two gate, select/deselect, keep, opponent choosing state.
- Owned destination pin/unpin; keyboard focus switches preview between tickets and clears on leaving. Hand color selection toggles correctly.
- Unaffordable keyboard route activation gives not-enough feedback and spends nothing.
- Gray route choices: multiple viable colors show chooser; selected white payment preserves orange cards; one viable color auto-claims; gray one-car chooser works. Bert separately tested Escape/reopen and all-locomotive payment.
- Colored claims and exact train/card/point changes, including locomotive supplementation.
- Real screenshot-guided mouse route claims: Santa Fe–El Paso at [805,735], and west-coast San Francisco–Los Angeles yellow at [330,676]. Both succeeded. Parallel SF–LA purple then reported unavailable parallel route.
- Face-up locomotive consumes whole turn; two ordinary face-up cards; two blind cards; first draw locks incompatible actions; second-pick face-up locomotive unavailable.
- Midgame and late-game destination draws, minimum-one gate, selecting multiple, immediate completion of an already-connected newly-kept ticket.
- Completed/unfinished ticket filter hides and restores completed tickets.
- History reflects route/draw/keep actions. Settings open/resume works. Reload reconnects same room, identity, hand, tickets, and claims. Map zoom/fit controls exercised.
- Finished game disables card draws and route claims; final standings close successfully.
- Browser console: no warning or error entries reported by tab.dev.logs at completion.

## Findings

- Pre-fix gray routes automatically picked payment; re-tested after update and chooser behaved correctly.
- Pre-fix parallel restriction used misleading not-enough feedback (Bert's reproduction). Post-fix SF–LA parallel visibly reports unavailable parallel route.
- SVG group bounding-box clicks can land off curved paths; actual marker coordinate clicks and keyboard activation worked. Root separately audited marker hit targets and fixed the ticket overlay interception.
- Minor copy: history says “kept 1 destination tickets”; final countdown says “1 turns remaining”.
- After closing final standings, action ticket still says “0 turns remaining” and “Bert’s turn” alongside “Journey complete”. No obvious standings reopen control appeared in the board or settings; settings only offers Resume. This was observed but not further investigated after root requested no more game actions.

## Evidence

- live-a-early-game.png
- live-a-corridor.png
- live-a-gray-choice.png
- live-a-mouse-claim.png
- live-a-west-coast-mouse.png
- live-a-ticket-completed.png
- live-a-all-tickets.png
- live-a-final-round.png
- live-a-game-over.png

Screenshots live in this directory. Temporary browser viewport was requested as 1440×900; browser zoom made the actual CSS viewport 1800×1125. No direct hover API was available in the CUA surface; keyboard preview and mouse click/pin behavior were covered, but a dedicated hover-only/mouseleave check was not claimed. Deck exhaustion/reshuffle and negative-ticket endgame scoring were not reached in this game.

## Postgame fix verification

Reloaded the same completed Y74NR5 room as Ada after the fixes. The full board layout remains in place instead of the separate room-finished wrapper. Closed the automatically-opened standings: the action ticket shows Journey complete, with no remaining-turn counter or active-player turn label. Clicked the new trophy button (Show final standings): standings reopened with unchanged Bert128/Ada101 scoring. Console warnings/errors remained empty. Evidence: live-a-postgame-fixed.png. The previously reported postgame turn-label and standings-reopen issues are resolved.
