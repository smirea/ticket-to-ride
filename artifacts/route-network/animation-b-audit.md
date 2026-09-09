# Browser animation audit — 2026-09-09

A low-thinking QA agent exercised the real browser controls and sampled consecutive screenshots. It found and retested five endpoint defects: misplaced existing-color cards, new-color pop-ins, ticket-stack expansion after landing, horizontal-to-angled claim model swaps, and first-completion filter layout shifts. Market reset and table entrance animations showed no additional endpoint defect. Retained screenshots capture the important retest frames; intermediate capture sequences were discarded.

## Retest after receipt, ticket rail, and filter fixes

Retested latest6090 after reload. Existing Black, new Ivory, ticket keep, and first completion filter now pass sampled endpoint comparison.

- Existing Black flight carries final count5, rotates to hand angle and converges on the correct slot. Previous70px/upright mismatch is gone. Flight briefly draws above neighboring Ivory before normal hand z-order resumes. Evidence: animation-b-retest-black-near.png and -final.png.
- New Ivory carries count1 and the correct paper shape. Purple has its final two-slot angle before arrival; Ivory converges continuously into the reserved slot without a second faded-in copy. Evidence: animation-b-retest-new-near.png and -final.png.
- Ticket keep now uses final full-size rail positions during transfer; map does not shift when chooser closes. Evidence: animation-b-retest-ticket-near.png and -final.png.
- First completion filter appears in reserved space. Portland–Phoenix ticket stays around y240 before and after completion; no30px shift. Evidence: animation-b-retest-filter-before.png and -after.png.

Browser screenshots are sampled frames rather than a full frame-time recording. Eight key receipt/ticket retest frames are retained.

## Claim model retest

Browser-only Ticket stamp fixture, SF–LA three purple. Captured 27 consecutive screenshots after keyboard activation. The cards now morph into modeled train sprites and follow the curved route poses; sampled landing/handoff frames show no obvious position or rotation pop. Claim succeeds: 14→18 points, 37→34 trains, purple 3 removed, Portland–Phoenix completed. No perceptible preparation pause was observed, but CUA screenshot sampling is not a frame-time profile and cannot certify the precise 220 ms crossfade or pixel-perfect registration.

Two findings sent to root: cream roofs dominated both flying and preexisting claimed train models, weakening player color; a stale “not enough to claim” hint remained after the claim during Maya’s turn. Root reports the hint fixed and model tilt/material correction underway; these evidence frames precede those follow-up corrections. HMR subsequently reset the debug fixture.

Evidence: animation-b-claim-model-morph.png, animation-b-claim-model-landing.png, animation-b-claim-model-handoff.png, animation-b-claim-model-final.png.

## Actual pointer route audit

Current dev6090, all route activations below used actual tab.click coordinates, not keyboard. Claim scenario SF–LA purple center [380,732], SF-end [342,683], and LA-end [434,773] each succeeded after fixture reset: 0→4 points,45→42 trains,purple3→0. Full table LA–Phoenix gray center [595,789] opened payment chooser.

Regular new single-player: Vancouver–Seattle [401,255] opened chooser; switching to Seattle–Portland [375,326] first only dismissed old chooser, second same click opened new chooser. Reported to root as concrete two-click switching issue. Pinning Black hand card first did not prevent gray chooser opening. After first Yellow draw, banner “Draw one more card” and routes disabled; [401,255] correctly did nothing but no supplementary feedback. Evidence pointer-b-draw-one-gated.png. Browser inventory contained only QA game tabs, so user’s exact session was unavailable.

Zoom attempts were inconclusive during active HMR/layout edits; no reliable zoomed-route assertion yet.

## Pointer fixes retest

One-click route switching now passes: Vancouver–Seattle [401,265] then Seattle–Portland [375,337], choose black, claims Seattle–Portland and deducts Black4→3,45→44 trains,0→1 points. First-draw route click now shows “Draw one more card first”; evidence pointer-b-draw-notice-fixed.png.

Confirmed separate zoom bug using read-only DOM geometry: Zoom in rect x334.53,y871.67,w39.65,h38.52. elementFromPoint at its center returns .hand-scroll, not button. Hand-scroll starts y870.27 with40px transparent top padding (hand-cards starts910.27); map toolbar y870.34–912.70. Pointer-events:auto on padding intercepts entire toolbar. Reported root; awaiting fix to verify zoomed routes.

## Hand padding fix verified

After HMR, zoom center elementFromPoint returns button. Actual [354,891] increases board width2015.55→2519.43px and enables Zoom out. With full hand and1.25x zoom, lower-edge LA–Phoenix [685,889] opens chooser; SF–LA center [424,803] switches chooser. Independent Full table reset then SF–LA first marker [370,755] completes claim (4pt,42trains,31cards). Read-only DOM confirms endpoint hits marker-anchor rect. Evidence pointer-b-zoom-fixed.png. No remaining failure in requested pointer set.
