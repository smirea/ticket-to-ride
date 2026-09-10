# Ticket to Ride map/game-mode sources

**34 canonical map/game-mode entries.** Every active folder has a published rulebook, parsed Markdown, and a geographic board reference. There are no demo folders, missing-PDF placeholders, or separate classic/anniversary map targets.

Use [catalog.json](catalog.json) to select a map and [AGENTS.md](AGENTS.md) for implementation guidance. Each entry lives in `rules/map-<name>/` with `rules.pdf`, `rules.md`, `<name>-map.png`, and `sources.json`. Existing [default.md](default.md) remains a shared reference.

## Inclusion and deduplication

This is a game-mode research roster, not a collector's edition inventory. It includes official standalone maps, Map Collection sides, city games, First Journey/other family maps, and official print-and-play maps. Non-map expansions, fan maps, retailer demos, and incomplete source collections are excluded from active folders.

USA and Europe each have one canonical folder. Their classic and anniversary rulebooks are supplemental editions within that folder, not extra map targets. The original Deutschland rules are an alternate edition under Germany. Märklin remains a separate game mode because it uses moving passengers and merchandise, unlike Germany's passenger collection. Nordic Countries and Northern Lights likewise have distinct rules and maps. Different sides of a Map Collection remain distinct targets.

[BoardGameGeek's official family](https://boardgamegeek.com/boardgamefamily/17/game-ticket-to-ride-official) supplied the dated inventory cross-check; [Days of Wonder](https://www.daysofwonder.com/universe/ticket-to-ride/) supplied most rulebooks. The catalog records exclusions and consolidated editions so excluded products cannot accidentally reappear as duplicate implementation targets.

## Completeness boundary

`source-kit-present` means the published rules and board reference are available, not that the game is implementation-ready. `rules.md` contains the page-by-page pdf-inspector output from the local `rules.pdf`, with linked page images preserving all diagrams and tables. Multilingual PDFs retain all their pages. Most ticket/card decks and machine-readable route graphs still need transcription and verification during implementation. Some board references contain pieces or printed annotations; consult their quality notes. The PDFs are preserved as published, including shared base rules where present.

## Deferred or excluded source collections

- **Retailer Demo: USA**: Retailer demonstration board, not a full game-mode target; rules missing.
- **Retailer Demo: Europe**: Retailer demonstration board, not a full game-mode target; rules missing.
- **Les Aventuriers du Rail Express**: Legitimate compact retail game, but its rulebook has not been retrieved.
- **Italia: Milite Ignoto 1921–2021**: Limited commemorative edition with incomplete rules and component sources.
- **Legacy: Legends of the West**: Legitimate campaign game, but public starter rules omit sealed campaign rules and maps.

These records have no active asset folders. Express and Legacy are legitimate game modes but should only enter the active roster once their required source material is collected.

## PDF parsing

Run `parse_rulebooks.py` to regenerate all primary rulebook Markdown and `images/rules-page-*.png` references. It uses pdf-inspector for text and PyMuPDF for original page images, including vector diagrams. Supplemental edition PDFs remain separate source files. Pages without extracted text remain available as linked images; OCR is not enabled.

[Firecrawl pdf-inspector](https://github.com/firecrawl/pdf-inspector) 1.19.0 is installed locally in `.cache/rules-tools` and exercised against the archive. It extracts text without a cloud service. The inspection report records page counts, OCR recommendations, encoding flags, and extracted character counts. Parsed text is stored separately in each map’s `rules.md`. Diagram semantics and multi-column reading order still require visual review.

Recreate the isolated tools and run the inspection from the repository root:

```sh
uv venv .cache/rules-tools
uv pip install --python .cache/rules-tools/bin/python pdf-inspector==1.19.0 pymupdf==1.28.2 pillow==12.3.0
.cache/rules-tools/bin/python rules/parse_rulebooks.py
.cache/rules-tools/bin/python rules/inspect_assets.py
```

See [inspection.json](inspection.json) for the measured results. This is a local research dependency, not an application runtime dependency.

## Maps

### City games

- [Amsterdam](map-amsterdam/rules.md) · [PDF](map-amsterdam/rules.pdf)
- [Berlin](map-berlin/rules.md) · [PDF](map-berlin/rules.pdf)
- [London](map-london/rules.md) · [PDF](map-london/rules.pdf)
- [New York](map-new-york/rules.md) · [PDF](map-new-york/rules.pdf)
- [Paris](map-paris/rules.md) · [PDF](map-paris/rules.pdf)
- [San Francisco](map-san-francisco/rules.md) · [PDF](map-san-francisco/rules.pdf)

### Map expansions

- [B&B Vol Liefde](map-b-and-b-vol-liefde/rules.md) · [PDF](map-b-and-b-vol-liefde/rules.pdf)
- [France](map-france/rules.md) · [PDF](map-france/rules.pdf)
- [Iberia](map-iberia/rules.md) · [PDF](map-iberia/rules.pdf)
- [India](map-india/rules.md) · [PDF](map-india/rules.pdf)
- [Italy](map-italy/rules.md) · [PDF](map-italy/rules.pdf)
- [Japan](map-japan/rules.md) · [PDF](map-japan/rules.pdf)
- [Legendary Asia](map-legendary-asia/rules.md) · [PDF](map-legendary-asia/rules.pdf)
- [Nederland](map-nederland/rules.md) · [PDF](map-nederland/rules.pdf)
- [Old West](map-old-west/rules.md) · [PDF](map-old-west/rules.pdf)
- [Pennsylvania](map-pennsylvania/rules.md) · [PDF](map-pennsylvania/rules.pdf)
- [Poland](map-poland/rules.md) · [PDF](map-poland/rules.pdf)
- [South Korea](map-south-korea/rules.md) · [PDF](map-south-korea/rules.pdf)
- [Stay At Home](map-stay-at-home/rules.md) · [PDF](map-stay-at-home/rules.pdf)
- [Switzerland](map-switzerland/rules.md) · [PDF](map-switzerland/rules.pdf)
- [Team Asia](map-team-asia/rules.md) · [PDF](map-team-asia/rules.pdf)
- [The Heart Of Africa](map-the-heart-of-africa/rules.md) · [PDF](map-the-heart-of-africa/rules.pdf)
- [United Kingdom](map-united-kingdom/rules.md) · [PDF](map-united-kingdom/rules.pdf)

### Standalone maps

- [Europe](map-europe/rules.md) · [PDF](map-europe/rules.pdf)
- [Germany](map-germany/rules.md) · [PDF](map-germany/rules.pdf)
- [Märklin](map-marklin/rules.md) · [PDF](map-marklin/rules.pdf)
- [Nordic Countries](map-nordic-countries/rules.md) · [PDF](map-nordic-countries/rules.pdf)
- [Northern Lights](map-northern-lights/rules.md) · [PDF](map-northern-lights/rules.pdf)
- [Rails & Sails: Great Lakes](map-rails-and-sails-great-lakes/rules.md) · [PDF](map-rails-and-sails-great-lakes/rules.pdf)
- [Rails & Sails: World](map-rails-and-sails-world/rules.md) · [PDF](map-rails-and-sails-world/rules.pdf)
- [USA](map-usa/rules.md) · [PDF](map-usa/rules.pdf)

### Family games

- [First Journey Europe](map-first-journey-europe/rules.md) · [PDF](map-first-journey-europe/rules.pdf)
- [First Journey Usa](map-first-journey-usa/rules.md) · [PDF](map-first-journey-usa/rules.pdf)
- [Ghost Train](map-ghost-train/rules.md) · [PDF](map-ghost-train/rules.pdf)

Source PDFs and images retain their original copyrights.
