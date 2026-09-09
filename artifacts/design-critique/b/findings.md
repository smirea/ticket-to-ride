# Bert — real two-player design critique

Frozen production 6092, room 6X5XJK, Bert blue vs Ada red. Canonical design-direction.md read completely. Normal 45-train game, actual browser UI only.

## B01 — P2: Waiting room loses tabletop character

Repro: Join a room and inspect before start. Evidence: waiting-room.png. Static resting-state issue, not animation timing. Flat dashboard panels, numbered player circles rather than physical portrait plaques, repeated headings, and revision/snapshot/blank Game seed metadata feel administrative. Expected: whole app shares the crafted atlas/tabletop world. Smallest fix: reuse compact ticket/plaque styling for roster and settings, remove technical metadata from ordinary view, reduce repeated headings and empty space. No functional join/ready blocker.

## B02 — P2: Opponent claim lacks readable placing sequence

Ada claimed El Paso–Dallas with four red cards. Evidence: remote-first.png. The first observer frame after the coordinated cue already showed all four permanent trains, updated scores, and “Your move.” Subsequent samples stayed in that final state. The capture began after message and tool latency, so it did not establish the exact arrival frame or prove a pop-in. Root's source review confirmed that the remote client lacked an arrival sequence.

The local claim commits after its flight. This evidence does not establish premature turn enablement. The recommendation is a brief remote placement sequence and action context that do not reveal hidden cards.

## B03 — P2: Spent hand remains during claim and collapses at commit

Repro: claim Seattle–Calgary with three ivory cards and one locomotive. Evidence: claim-hand-midflight.png. Four blue carriages were already flying while the original hand still showed the full ivory and locomotive piles. At commit, those colors disappeared and the remaining fan changed from five slots to three.

To preserve the physical handoff, prepare the remaining fan at lift-off and remove the spent cards as their flying counterparts leave. The final commit should not change the fan geometry again. Screenshot sampling establishes these distinct states, not exact frame intervals.

## Baseline coverage

Entry, join, ready, opening ticket selection, market draws, mixed payment selection, short and long route claims, history, settings, midgame ticket selection, and three completed destinations were exercised through the real interface. The full normal 45-train match reached final scoring. No claim is made about unobserved animation frames or measured frame rate. Final verification is recorded below.

## Completed baseline match

Room 6X5XJK finished through legal UI turns, with no state fixtures or API moves. Bert triggered the final round at two remaining trains, then used the last green card on Vancouver–Seattle and finished with one train. Ada finished with five. The action ticket correctly counted two remaining turns, then one, then Journey complete. Final standings opened automatically; closing and reopening them preserved the finished table.

| Player | Route points | Completed tickets | Longest bonus | Total |
| ------ | -----------: | ----------------: | ------------: | ----: |
| Ada    |           52 |                54 |            10 |   116 |
| Bert   |           62 |                41 |            10 |   113 |

Both displayed longest paths were 28, so both received the bonus. Bert's ticket values reconcile as 13 + 17 + 11 = 41. Ada's reconcile as 21 + 12 + 16 + 5 = 54. The visible totals reconcile exactly. Evidence: final-round.png, results.png, finished-table.png. Browser warning and error log was empty at completion.

Bert exercised route lengths one through four, ordinary and locomotive-assisted payments, face-up ordinary and locomotive draws, blind draws, initial and midgame ticket selection, completion, hand filtering, history, settings, and the final round. Actual marker pointer clicks were used for the later claims. One attempted action while Ada still held the turn was correctly gated; the mistaken handoff was coordination error, not a product defect.

The baseline has three documented design findings (B01–B03), no observed gameplay blocker, and no scoring mismatch. This baseline alone does not certify the full brief. Separately labeled post-fix checks follow below; portrait tablet coverage belongs to Ada’s report, and reduced-motion limitations remain explicit.

The baseline results sheet is readable and unclipped at 1600×1000, but its plain white rounded panel is less integrated with the atlas than the plaques and destination tickets. This is supporting evidence for B01's whole-app styling concern, not a separate gameplay blocker.

## Updated-build verification

A fresh real room, 62DNEV, verified that joining resets readiness: both participants showed Waiting and zero ready. The revised waiting room removed the baseline technical metadata and redundant administrative headings. B01 is improved; the supporting pieces remain readable.

B02 passes within the sampled live sequence. Ada claimed Denver–Santa Fe. Capture began before the server update: at 954 ms the printed route remained, at 1083 ms translucent red train forms appeared, and at 1172 ms the permanent trains were solid. Evidence: retest-remote-arrival.png. This is a restrained arrival rather than an opaque instantaneous replacement. The sampling interval does not establish smooth frame rate.

B03 passes. Bert claimed Montréal–Boston with one red card and one locomotive. At 382 ms the spent cards were gathering while the remaining orange and blue fan already occupied its final slots. Those positions remained stable at 978 ms during flight and 2003 ms after commit. The result was two points, 43 trains, and two remaining cards. Evidence: retest-mixed-midflight.png and retest-mixed-settled.png. The action ticket still read Your move during the flight; root is replacing this with concise current-action wording.

Supplemental Market reset fixture: drawing red from a purple-only hand correctly creates red count one, leaves two surviving locomotives, deals the third locomotive, sweeps the market, and deals five replacements. Deck count reconciles as 98 minus one replacement minus five reset cards = 92. Evidence: retest-third-wild.png. A second red draw increments the existing pile to two and finishes with deck 91. No endpoint defect was confirmed. An initial concern based on an early in-flight sample was withdrawn after the later approach frame showed the card reaching the correct sorted slot.

The Train fleet fixture displayed all five owner colors and models, all ordinary hand colors and locomotive art, and five fitted plaques. No obvious submerged pieces, missing trains, white roof patches, or clipping were observed at the desktop size. Evidence: retest-fleet.png. Warning/error logs remained empty.

Reduced-motion emulation was not available in the browser tool; only viewport override was exposed. Reduced-motion and hidden-tab ambient pause are therefore not independently verified. Screenshot collection timing is not treated as application frame-rate evidence. The final focused build checks are recorded below.

## Final focused check and qualified acceptance

On the final production build, the Full table fixture exercised a pointer preview followed by a six-car Winnipeg–Sault Ste. Marie claim with four blue cards and two locomotives. The action ticket read Placing trains during lift and flight, then returned to the opponent's status. All six paid cards left the hand; the remaining seven ordinary-color piles retained four cards each and stayed in their prepared fan through settlement. Evidence: final-placing-trains.png.

The first captured frame at 293 ms already showed the cards lifting from their raised region. No downward reset was observed, but this is not exact first-frame proof of the revised origin. The final Market reset fixture also verified new red and existing red arrivals into the leftmost slot, with counts one then two. Drawing a card appeared during receipt. The third locomotive was visible before the reset, and five replacements settled correctly. Evidence: final-third-wild.png and final-draw-settled.png. Final browser warning/error log was empty.

Qualified acceptance: within this completed real two-player game and the documented supplemental desktop checks, I have no unresolved observed gameplay blocker, major usability defect, reproducible endpoint jump, or severe stutter. The revised hand, remote arrival, market sequence, and current-action ticket are coherent with the tabletop direction. This is not a claim of universal animation smoothness: screenshot sampling cannot measure frame rate, exact lift-off frames were not captured, and reduced-motion/hidden-tab behavior was not independently verified by this browser agent. Root is checking ambient behavior separately; Ada owns the portrait-tablet pass.
