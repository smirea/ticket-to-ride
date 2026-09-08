# Live two-player browser playtest — Bert

Date: 2026-09-08. Room Y74NR5, finished revision 128. Bert (blue, DEBUG_ID=qa-live-b) played against independent agent Ada (red). All moves used visible browser controls, actual keyboard or mouse. No fixture, API gameplay, or game-state injection was used.

## Result

Bert won 128–101 after a complete game from lobby through final standings. Bert used 43 of 45 trains, triggered the final round at 2 remaining, and took the last turn after Ada. Countdown progressed 2 → 1 → 0. Final two-card draw ended the game and opened standings.

| Player | Routes | Tickets | Longest bonus | Total | Completed tickets | Longest path |
| ------ | -----: | ------: | ------------: | ----: | ----------------: | -----------: |
| Bert   |     60 |      58 |            10 |   128 |                 4 |           35 |
| Ada    |     46 |      55 |             0 |   101 |                 5 |           27 |

Bert tickets reconcile: Los Angeles–New York 21 + Helena–Los Angeles 8 + Calgary–Salt Lake City 7 + Seattle–New York 22 = 58. All four became visibly completed. Route score 60 + tickets 58 + longest 10 = 128. Ada's displayed breakdown sums to 101.

Screenshot: [Final standings](live-b-results.png).

## Verified interactions

- Joined via lobby using lowercase/spaced code `y74 nr5`; normalized to Y74NR5. Set Bert and blue color, ready up, live host start.
- Opening ticket selection: two selections enabled Keep; kept two tickets. Midgame draw displayed keep-at-least-one gate; selected and kept two additional tickets. No train cards changed from ticket draws.
- Card pin while waiting, destination preview pin, settings open/atlas off/on/resume, history open/close, zoom in/fit.
- Reload reconnect preserved player identity, room, hand, tickets, scores, claimed routes and current turn.
- Repeated two face-up draws, two blind draws, mixed face-up/blind draws, and face-up locomotive as sole draw. Second-pick face-up locomotive disabled. Route/ticket actions disabled midway through card draw. Hand counts and market refill matched draws.
- Colored and gray claims, automatic single-payment path, wild substitution, keyboard route Enter and actual coordinate mouse claim.
- Actual mouse marker: Omaha–Chicago blue4 at CSS (1176,414) claimed route, spent blue3+wild1, added 7 points, removed 4 trains, passed turn. An earlier wrongly scaled coordinate hit blank map and caused no game action.
- Multi-payment gray chooser: Denver–Santa Fe2 offered red2 vs white2. Escape dismissed; reopening and keyboard Enter on white2 spent exactly two ivory, preserving red2+blue1, adding 2 points/removing 2 trains.
- Seattle–Calgary4 offered green3+wild1 vs purple3+wild1. Mouse selection of purple option spent precisely purple3+wild1 and preserved green3; route/ticket completion correct.
- Explicit optional all-wild payment: Seattle–Portland1 offered red/yellow/green/purple/black/wild. Mouse selected locomotive despite ten ordinary cards available. Wild1→0; ordinary hand remained red2/yellow1/green3/purple3/black1. Added one point, removed one train, passed turn.
- Parallel restriction before fix correctly prevented claim even with sufficient cards, but falsely said not enough and open. After root's fix, counterpart routes visibly/AX labeled unavailable parallel route and disabled.
- Final game actions disabled, standings winner/order/breakdown correct. Final draw retained two newly drawn cards.

## Findings and limits

1. Finished-room layout adds a giant final-whistle hero above the game, duplicating navigation and pushing the map/hand below viewport. Result panel remains readable. Reported to root with final screenshot.
2. Finished action ticket still says Your turn and 0 turns remaining under Journey complete. Singular countdown also reads 1 turns remaining. Reported to root.
3. During live code edits, a pending ticket selection and a payment chooser each reset before submission. Immediate reselection worked. These coincided with HMR, so they were not classified as production gameplay failures.
4. Console inspection returned nine Svelte `derived_inert` warnings at 2026-09-08T23:02:00.705Z: reading a derived belonging to a destroyed effect may produce stale values. Reported source is React DevTools extension installHook.js. No error-level logs returned. HMR was active.

Animations were visually inspected at claim/market states, and transient action disabling was observed. This was not frame-by-frame proof of every animation. Pointer-hover exit/stationary re-entry, touch input, every route, every payment combination, deck exhaustion/reshuffle, and disconnected-client timeout behavior were not exhaustively tested by Bert. Tablet testing was not performed by this agent. Viewport override 1440×900 was requested, but browser zoom yielded observed CSS 1800×1125 at devicePixelRatio 0.8; screenshots reflect that live environment.
