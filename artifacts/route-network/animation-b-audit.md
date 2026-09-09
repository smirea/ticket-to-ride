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
