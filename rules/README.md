# Ticket to Ride map rules archive

Inventory checked on **2026-09-10**: **44 map folders**, **40 with PDF, Markdown, and PNG**, and **4 missing a downloadable rules PDF**.

Each geographic map lives in `rules/map-<name>/`, with `rules.pdf`, `rules.md`, `<name>-map.png`, and `sources.json`. The image filename retains the map name without the folder prefix. [catalog.json](catalog.json) records stable map IDs, explicit folder paths, prerequisite rules, and source coverage. [AGENTS.md](AGENTS.md) explains how to use the assets. Existing [default.md](default.md) remains the shared reference.

## Scope

Keep geographic maps: standalone editions, Map Collection sides, city games, family games, campaign maps, print-and-play maps, and demos. Classic, refreshed, and anniversary map editions remain separate to preserve their source rules and artwork. Expansions that reuse an existing board, ticket-only promos, Card Game, and Track Switcher have no asset folders. Their exclusion is recorded in the catalog.

[BoardGameGeek's official family](https://boardgamegeek.com/boardgamefamily/17/game-ticket-to-ride-official) provides the inventory cross-check; [Days of Wonder](https://www.daysofwonder.com/universe/ticket-to-ride/) is the preferred rulebook source. Both sides of double-sided maps have separate entries. Switzerland 2007 is an alias of the Switzerland entry. Fan maps and cosmetic accessories are outside scope.

Source PDFs are preserved in full, including shared rules when the publisher combines them with map rules. Markdown files are concise original implementation briefs, not full rulebook transcriptions. Map PNGs are real board photographs or publisher/PDF illustrations. Sources, image transformations, limitations, and hashes are recorded in each folder's metadata.

## Known missing material

- [Retailer Demo: Europe](map-demo-europe/rules.md): No publisher PDF located. Community discussion includes house rules, which are not substituted for authoritative rules.
- [Retailer Demo: USA](map-demo-usa/rules.md): No publisher PDF located. Community discussion includes house rules, which are not substituted for authoritative rules.
- [Les Aventuriers du Rail Express](map-express/rules.md): Identified BGG English rules files, but downloads require access unavailable in this session.
- [Italia: Milite Ignoto 1921–2021](map-italia-milite-ignoto/rules.md): Only photographed rule leaflet located; no downloadable publisher PDF.

BGG catalog and image APIs were accessible during collection, but file downloads were blocked by browser verification. Milite Ignoto includes a photographed rule leaflet. Missing PDFs remain explicit.

Legacy includes public starter rules, errata, and FAQ, not sealed campaign content. Most rulebooks do not enumerate every ticket or route: card inventories and machine-readable graphs still need verification. Some photographs contain placed pieces; consult the quality notes before tracing.

## PDF parsing

[Firecrawl pdf-inspector](https://github.com/firecrawl/pdf-inspector) 1.19.0 is installed locally in `.cache/rules-tools` and exercised against the archive. It extracts text without a cloud service. The inspection report records page counts, OCR recommendations, encoding flags, and extracted character counts; it does not contain full extracted rulebook text. Diagram semantics and multi-column reading order still require visual review.

Recreate the isolated tools and run the inspection from the repository root:

```sh
uv venv .cache/rules-tools
uv pip install --python .cache/rules-tools/bin/python pdf-inspector==1.19.0 pymupdf==1.28.2 pillow==12.3.0
.cache/rules-tools/bin/python rules/inspect_assets.py
```

See [inspection.json](inspection.json) for the measured results. This is a local research dependency, not an application runtime dependency.

## Index

### City games

| Map                                                     | Assets                     | Prerequisite rules |
| ------------------------------------------------------- | -------------------------- | ------------------ |
| [Amsterdam](map-amsterdam/rules.md)                     | PDF / MD / PNG             | Standalone         |
| [Berlin](map-berlin/rules.md)                           | PDF / MD / PNG             | Standalone         |
| [Les Aventuriers du Rail Express](map-express/rules.md) | **PDF missing** / MD / PNG | Standalone         |
| [London](map-london/rules.md)                           | PDF / MD / PNG             | Standalone         |
| [New York](map-new-york/rules.md)                       | PDF / MD / PNG             | Standalone         |
| [Paris](map-paris/rules.md)                             | PDF / MD / PNG             | Standalone         |
| [San Francisco](map-san-francisco/rules.md)             | PDF / MD / PNG             | Standalone         |

### Map expansions

| Map                                                     | Assets         | Prerequisite rules                      |
| ------------------------------------------------------- | -------------- | --------------------------------------- |
| [B&B Vol Liefde](map-b-and-b-vol-liefde/rules.md)       | PDF / MD / PNG | [usa-classic](map-usa-classic/rules.md) |
| [France](map-france/rules.md)                           | PDF / MD / PNG | [usa-classic](map-usa-classic/rules.md) |
| [Iberia](map-iberia/rules.md)                           | PDF / MD / PNG | [usa-classic](map-usa-classic/rules.md) |
| [India](map-india/rules.md)                             | PDF / MD / PNG | [usa-classic](map-usa-classic/rules.md) |
| [Italy](map-italy/rules.md)                             | PDF / MD / PNG | [usa-classic](map-usa-classic/rules.md) |
| [Japan](map-japan/rules.md)                             | PDF / MD / PNG | [usa-classic](map-usa-classic/rules.md) |
| [Legendary Asia](map-legendary-asia/rules.md)           | PDF / MD / PNG | [usa-classic](map-usa-classic/rules.md) |
| [Nederland](map-nederland/rules.md)                     | PDF / MD / PNG | [usa-classic](map-usa-classic/rules.md) |
| [Old West](map-old-west/rules.md)                       | PDF / MD / PNG | [usa-classic](map-usa-classic/rules.md) |
| [Pennsylvania](map-pennsylvania/rules.md)               | PDF / MD / PNG | [usa-classic](map-usa-classic/rules.md) |
| [Poland](map-poland/rules.md)                           | PDF / MD / PNG | [usa-classic](map-usa-classic/rules.md) |
| [South Korea](map-south-korea/rules.md)                 | PDF / MD / PNG | [usa-classic](map-usa-classic/rules.md) |
| [Stay At Home](map-stay-at-home/rules.md)               | PDF / MD / PNG | [usa-classic](map-usa-classic/rules.md) |
| [Switzerland](map-switzerland/rules.md)                 | PDF / MD / PNG | [usa-classic](map-usa-classic/rules.md) |
| [Team Asia](map-team-asia/rules.md)                     | PDF / MD / PNG | [usa-classic](map-usa-classic/rules.md) |
| [The Heart Of Africa](map-the-heart-of-africa/rules.md) | PDF / MD / PNG | [usa-classic](map-usa-classic/rules.md) |
| [United Kingdom](map-united-kingdom/rules.md)           | PDF / MD / PNG | [usa-classic](map-usa-classic/rules.md) |

### Rare and demo maps

| Map                                                                  | Assets                     | Prerequisite rules          |
| -------------------------------------------------------------------- | -------------------------- | --------------------------- |
| [Retailer Demo: Europe](map-demo-europe/rules.md)                    | **PDF missing** / MD / PNG | Standalone                  |
| [Retailer Demo: USA](map-demo-usa/rules.md)                          | **PDF missing** / MD / PNG | Standalone                  |
| [Italia: Milite Ignoto 1921–2021](map-italia-milite-ignoto/rules.md) | **PDF missing** / MD / PNG | [italy](map-italy/rules.md) |

### Standalone and edition variants

| Map                                                                    | Assets         | Prerequisite rules                      |
| ---------------------------------------------------------------------- | -------------- | --------------------------------------- |
| [Deutschland](map-deutschland/rules.md)                                | PDF / MD / PNG | Standalone                              |
| [Europe (refreshed)](map-europe/rules.md)                              | PDF / MD / PNG | Standalone                              |
| [Europe 15th Anniversary](map-europe-15th-anniversary/rules.md)        | PDF / MD / PNG | Standalone                              |
| [Europe Classic](map-europe-classic/rules.md)                          | PDF / MD / PNG | Standalone                              |
| [Germany](map-germany/rules.md)                                        | PDF / MD / PNG | Standalone                              |
| [Märklin](map-marklin/rules.md)                                        | PDF / MD / PNG | Standalone                              |
| [Nordic Countries](map-nordic-countries/rules.md)                      | PDF / MD / PNG | Standalone                              |
| [Northern Lights](map-northern-lights/rules.md)                        | PDF / MD / PNG | Standalone                              |
| [Rails & Sails: Great Lakes](map-rails-and-sails-great-lakes/rules.md) | PDF / MD / PNG | Standalone                              |
| [Rails & Sails: World](map-rails-and-sails-world/rules.md)             | PDF / MD / PNG | Standalone                              |
| [USA (refreshed)](map-usa/rules.md)                                    | PDF / MD / PNG | Standalone                              |
| [USA 10th Anniversary](map-usa-10th-anniversary/rules.md)              | PDF / MD / PNG | [usa-classic](map-usa-classic/rules.md) |
| [USA Classic](map-usa-classic/rules.md)                                | PDF / MD / PNG | Standalone                              |

### Family games

| Map                                                       | Assets         | Prerequisite rules |
| --------------------------------------------------------- | -------------- | ------------------ |
| [First Journey Europe](map-first-journey-europe/rules.md) | PDF / MD / PNG | Standalone         |
| [First Journey Usa](map-first-journey-usa/rules.md)       | PDF / MD / PNG | Standalone         |
| [Ghost Train](map-ghost-train/rules.md)                   | PDF / MD / PNG | Standalone         |

### Special formats

| Map                                                             | Assets         | Prerequisite rules |
| --------------------------------------------------------------- | -------------- | ------------------ |
| [Legacy: Legends of the West](map-legends-of-the-west/rules.md) | PDF / MD / PNG | Standalone         |

Source PDFs and images retain their original copyrights. Download availability does not grant permission to redistribute their artwork in an implemented game.
