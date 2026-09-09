# Final Chrome QA

Train fleet fixture, current dev6090. Market fully dealt before final capture. Chrome zoom reset through native UI to100%; final screenshots are exact1600×1000 desktop and768×1024 tablet, with no capture padding.

- All five player colors, vertical status, scoring legend left numbers1–6, lake artwork and complete yellow OklahomaCity–ElPaso markers visible.
- Hand-card title attributes absent. Hand and market bottom shadows remain uncut on both layouts.
- Prior actual pointer tests verified transparent hand padding, zoom controls, route switching, and lower edge clicks.
- Point badges scale correctly on nested g.hint-paper: computed entrance scale0.996→settlednone; exit samples0.909,0.833,0.776,0.730,0.697,0.675 then node removed. transform-box is fill-box with centered origin. Parent route-hint separately fades. Earlier opacity-only concern inspected only the parent and was an incorrect inference; resolved by child transform evidence.
