# SVG board — Bert live regression

Actual UI in room 62DNEV on port 6090, using the existing Bert identity `critique-bert-retest`.

- Ada claimed Santa Fe–El Paso with two orange cards. Bert's observer view settled at Ada 4 points, 41 trains, zero cards.
- Bert claimed Nashville–Atlanta with one orange card through the payment pin. The authoritative result was 3 points, 42 trains, one blue card. Ada observed from the other client.
- The rendered board contains zero canvas elements. Claimed trains are SVG image elements referencing directional carriage WebP sheets.
- A separate cached reconnect showed all seven existing train groups at opacity 1 and transform none in 15 immediate DOM samples. No repeated arrival was observed. All claim states and counts persisted.
- Browser warning/error logs were empty. Evidence: remote-b-settled.png.

Timing limitation: Ada's first route had one legal payment and auto-claimed before this observer capture began. A development build reload interrupted the initial coordination. This report verifies remote settlement and reconnect behavior, not an independently sampled remote fly transition. Ada's report covers the reciprocal observation; screenshot-loop timing must not be treated as proof of frame rate.
