# Ada design critique — frozen production baseline

I read `docs/design-direction.md` completely. This is a new, full 45-train, two-player game in room **6X5XJK**, with Ada (red) and a separate Bert agent (blue). The baseline runs on the frozen production preview at port 6092. All game actions use the visible browser UI with normal motion. The full baseline match and focused post-fix retests are complete. Findings below describe the baseline; the final section records qualified acceptance.

## A01 — P2: waiting room breaks the tabletop visual language

- Reproduction: home → multiplayer → host a two-player room → Ready up.
- Evidence: `waiting-room.png`.
- Expected: supporting pieces should belong to the crafted Victorian table, with minimal functional copy.
- Actual: generic dashboard cards, badge pills, a large settings form, and exposed seed, revision and snapshot timestamps dominate the waiting room.
- Timing: static composition, not animation or performance.
- Small fix: use a paper roster with colored portrait pieces and a compact room-code ticket; move diagnostic fields into an advanced/debug disclosure.
- Status: resolved and verified in the focused retest below.

## A02 — P2: stale readiness confirmation contradicts room state

- Reproduction: the host selects Ready up before the guest joins; the guest then joins and readies.
- Evidence: `A02-stale-ready.png`. The DOM simultaneously reported “You are ready to play,” a “Ready up” button, and “Every player must be ready to start.”
- Expected: current readiness should be unambiguous.
- Actual: joining resets host readiness while the previous green success banner survives.
- Timing: remote state update, not animation.
- Small fix: derive the confirmation from current readiness or clear it when membership/readiness changes.
- Status: resolved and verified in the focused retest below.

## Motion observations

For the four-car El Paso–Dallas claim (three red cards plus a locomotive), screenshots began 308 ms after the keyboard action. Subsequent frames were captured at 350, 387, 474, 522, 565, 598 and 632 ms (`claim4-0.png` through `claim4-7.png`). The first frame already shows cards lifting; the 522 ms frame shows the gather/morph underway. This sample does not support a severe preflight pause on this machine. The sequence settled correctly at 15 route points, 35 trains and one card. Still images cannot establish continuous frame rate or eliminate every endpoint jump.

A remote claim sample began after settlement, so it provides no evidence about animation continuity. No defect is asserted from it.

## Interaction coverage so far

Opening selection enforced the two-ticket minimum. Face-up pairs, blind pairs, a whole-turn locomotive, exact gray-route payment and ordinary turn handoffs worked. The Los Angeles–Phoenix payment pins offered three green cards or two yellow cards plus a locomotive, with a clear exact-hand preview. An unaffordable Los Angeles–El Paso claim gave local feedback without spending cards or opening a payment choice. Settings and history opened and closed without losing the table. The browser warning/error log was empty at the midgame checkpoint.

Winnipeg–Houston completed after the Winnipeg–Duluth claim, at 32 route points and 21 trains. Its muted artwork, green stamp, title and point value are readable in `first-destination-completed.png`. Midgame selection correctly required at least one ticket. I kept Los Angeles–Chicago and already-connected Kansas City–Houston, bringing the collection to four (`midgame-ticket-offer.png`). An apparent pause while Bert selected tickets was not a stuck action; no full observer status capture was obtained during that state, so no clarity defect is asserted.

## Completed baseline and score reconciliation

The real 45-train match finished normally. Bert's Vancouver–Calgary claim left two trains and triggered a clear two-turn countdown. Ada took the next turn, the countdown became one, and Bert's final Vancouver–Seattle claim ended the game.

| Player | Route points | Ticket points | Longest bonus | Total |
| ------ | -----------: | ------------: | ------------: | ----: |
| Ada    |           52 |            54 |            10 |   116 |
| Bert   |           62 |            41 |            10 |   113 |

Both players had a longest path of 28 and correctly received the bonus. Ada's four completed tickets total 21 + 12 + 16 + 5 = 54. Bert's three completed tickets total 13 + 17 + 11 = 41. Evidence: `final-round.png`, `final-standings.png`, `final-table.png`.

Closing the results preserved the full tabletop. The trophy reopened the standings. The finished status no longer showed a turn countdown. Browser warning/error logs were empty at the end. No new major functional or static-layout defect was observed during the match beyond A01 and A02.

Mouse clicks successfully selected several eastern routes. A click on the whole curved Las Vegas–Los Angeles SVG group hit its bounding-box center and did not activate the actual marker; keyboard activation succeeded. This is recorded as an automation targeting limitation, not a product defect. Route-marker coordinate tests remain the appropriate evidence for hit targets.

## Focused verification plan (completed below)

After refreshing the production preview: retest A01/A02 by readying the host before a guest joins, play a few real turns to observe updated remote arrivals, and inspect portrait tablet, five-player and large-ticket fixtures. Continuous animation smoothness and fixes owned by the other critic/root will be judged from their corresponding frame evidence rather than inferred from these static screenshots.

## Focused retest — updated production preview

A01 and A02 are resolved in the inspected build. The revised waiting room uses paper surfaces, portrait pieces and a compact room-code ticket; advanced diagnostics are tucked away. In fresh room **62DNEV**, I readied Ada before Bert joined. His arrival changed Ada to Waiting and displayed “The table changed. Please ready up again.” The ready count and action agreed, with no stale success message. Evidence: `retest-host-ready.png`, `retest-ready-reset.png`.

The revised results preserved the correct 116–113 score after reload, and closing/reopening worked. In the fresh live game, an actual Denver–Santa Fe marker click at (682, 458) opened the payment pins. Spending two green cards settled at two points, 43 trains and two remaining orange cards. Evidence: `retest-live-payment.png`, `retest-live-claim-settled.png`.

I observed Bert's Montréal–Boston claim and retained representative frames `retest-remote-0.png`, `retest-remote-28.png`, `retest-remote-29.png` and `retest-remote-30.png`. The transition from unclaimed route to blue carriages and correct turn/count changes is visible. Sampling was about 200 ms apart, so this is evidence of correct arrival and settlement, not a continuous frame-rate measurement. Bert independently captured the reciprocal arrival at finer timing.

### Desktop and portrait tablet

The Full table fixture was inspected at **1440×900** and **768×1024**, with five players, twelve tickets and 34 train cards across all nine hand groups. There was no horizontal overflow. Player plaques, city labels, market cards, hand counts and the scoring reference remained available. All ticket titles were reachable; the stack scrolls when its allotted space is exhausted.

A portrait midgame offer kept all three new tickets and Keep button readable. The existing collection scrolled independently to its lower tickets. Selecting and keeping a new ticket worked. The visible title of a stacked ticket could be clicked to pin its preview. Settings and history opened, remained readable, and closed normally. Evidence: `retest-full-table-portrait-settled.png`, `retest-portrait-ticket-title-click.png`, `retest-portrait-midgame-offer.png`, `retest-portrait-existing-tickets-scroll.png`, `retest-portrait-settings.png`, `retest-portrait-history.png`, `retest-full-table-desktop.png`.

At the portrait map edge, an actual Vancouver–Seattle marker click at (301, 225) opened all eight ordinary-color payment choices. The fan, costs and cancel control stayed inside the viewport; exact hand preview worked and cancel restored the table. Evidence: `retest-portrait-edge-payment.png`. Pointer-only hover without a click was not separately exercised by this agent; ticket click/keyboard preview and actual marker clicks were exercised.

### Critic acceptance

I am satisfied with the corrected waiting-room/readiness flow, the tested tabletop composition, the crowded desktop/portrait layouts, ticket access and supporting controls. No observed major or blocking issue remains in my tested scope. A01 and A02 are closed. The end-to-end baseline reached final scoring under normal rules, and focused post-fix tests passed with an empty warning/error console. Animation-wide acceptance should also incorporate the parent and Bert's finer frame samples; I do not claim every frame or every possible state was tested.
