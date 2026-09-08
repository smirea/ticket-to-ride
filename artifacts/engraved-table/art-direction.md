# Ticket to Travel: illustrated ticket language

Edit each existing destination illustration into one very wide 3:1 Victorian railway ticket face. Preserve its optimistic painterly landscape, local landmarks, warm sunlight, turquoise water, conifers, and terracotta scenery. The landscape fills the entire ticket, with no separate white side panel or cropped thumbnail.

Use the same thin double-line antique-brass engraved border, modest corner flourishes, and warm ivory paper edge on every face. Across the top 24% reserve a softly feathered pale ivory sky/cartouche, integrated into the painting rather than a solid banner. Set the exact city pair as one centered horizontal line in large, bold, dark navy Victorian book serif lettering (Clarendon/Caslon character), title case, joined by a long em dash. Fit the full title between 7% and 93% width; for the longest names use slightly narrower letterforms, never abbreviate or add another line. The lettering must remain readable at a rendered width of 260px. No other text.

Keep scenery visible across the lower 76%. Leave the lower-right 17% calm enough for a separate burgundy clay points seal. Do not draw the seal, any point number, a numeral, icon, placeholder circle, or extra typography in the ticket image. The UI overlays the seal and value. No outer drop shadow or table background; deliver only a straight-on rectangular ticket face at 3:1, ideally 1536x512.

Use the existing ticket file as the edit target. Every image must contain its exact city pair. Save final assets as local WebPs in apps/ui/static/game-assets/atlas/tickets-engraved/<ticket-id>.webp. Preserve the originals in atlas/tickets/. Record generation prompts, source paths, generated source paths, final paths, and visual/text QA for every asset.

The points seal is separate: a plain, deep oxblood terracotta/clay impression with a thin raised antique-gold rim, irregular handmade edge, matte fired-clay pores and a subtly recessed blank center. Warm top-left light, restrained shallow relief, genuinely transparent surround, no letters, numbers, ribbons, symbols, or backing paper. The UI renders all point numbers.

## Clay seal production

Built-in image generation produced `/Users/stefan/.codex/generated_images/01a081c6-ca88-7f23-bc0b-7b67699faf3d/exec-c4b4db69-f922-4ddf-af99-98d66de1f861.png`. It was visually checked for a blank burgundy center, gold raised rim, handmade clay texture, and transparent surround, then converted with cwebp to `apps/ui/static/game-assets/atlas/points-clay-seal.webp` at 256×256. The same image is consumed by PointsSeal in destination tickets and player stats. All numbers are live UI text.

Exact generation prompt: “Use case: product-mockup. Asset type: transparent game UI points seal. Generate ONE plain old-time Victorian fired-clay railway ticket seal, straight overhead, centered, circular deep oxblood burgundy terracotta with a slightly irregular hand-pressed edge, a thin raised antique-gold rim and a smooth subtly recessed BLANK center, tiny matte clay pores and warm top-left light. Charming upper-class Victorian board game material, restrained shallow relief, crisp silhouette. Actual transparent background outside the object, no backing paper, no table, NO numbers, NO letters, NO symbols, NO ribbons, no text anywhere. The center must be perfectly usable for a white number added later by the UI. Fill about85%of a square image; object should remain clear when scaled to42px. Material should look like a burgundy clay stamp impression rather than a shiny wax drip. Output a transparent PNG.”

## Runtime assets

All 30 final ticket faces were uniformly resized with cwebp to 1152×384 at quality 88 after visual approval. Total ticket image transfer size fell from 8,054,158 to 4,525,636 bytes (44% smaller). The original generated source files remain at the paths recorded in batch-a.md, batch-b.md, and batch-c.md. Original pre-lettering artwork remains in atlas/tickets/.
