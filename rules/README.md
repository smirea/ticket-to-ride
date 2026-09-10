# Ticket to Ride rules and map archive

Inventory checked on **2026-09-10**: **55 folders**, **49 with all three requested files**, and **6 missing a downloadable rules PDF**. Every folder has an original Markdown implementation brief, a map/layout reference PNG, and source metadata. This collection is not yet a complete implementation dataset.

Use [catalog.json](catalog.json) to choose an entry and its prerequisite rules. [AGENTS.md](AGENTS.md) describes how to use the assets. Existing [default.md](default.md) is retained unchanged; it is not the inventory or a substitute for edition-specific PDFs.

## Scope and sources

[BoardGameGeek's official family](https://boardgamegeek.com/boardgamefamily/17/game-ticket-to-ride-official) is the catalog cross-check; [Days of Wonder](https://www.daysofwonder.com/universe/ticket-to-ride/) is the preferred rulebook source. All 46 products returned by the BGG family API are accounted for in the manifest. Unlock! Game Adventures is excluded as a separate escape-game system. Track Switcher is included from publisher material. Language-only reprints, cosmetic train sets, and fan-made maps are excluded. Individual sides of double-sided boards are separate entries. Switzerland 2007 is an alias of the Switzerland map entry; meaningful rules editions remain separate.

`rules.pdf` is a downloaded source document, not a generated placeholder. `rules.md` is a concise, original implementation brief, **not a full rulebook transcription or parser dump**. `<name>-map.png` is a real board photograph, publisher image, or PDF illustration. Modules without a new map reuse a compatible base-map reference; Card Game and Track Switcher use layout references. Every source, transformation, limitation, and file hash is recorded in `sources.json`.

## Known missing material

- [Deutschland 1902](deutschland-1902/rules.md): Original standalone expansion PDF unavailable; public mirror DNS failed and BGG download is blocked. Later combined edition is supplemental only.
- [Les Aventuriers du Rail Express](express/rules.md): Identified BGG English rules files, but downloads require access unavailable in this session.
- [Retailer Demo: USA](demo-usa/rules.md): No publisher PDF located. Community discussion includes house rules, which are not substituted for authoritative rules.
- [Retailer Demo: Europe](demo-europe/rules.md): No publisher PDF located. Community discussion includes house rules, which are not substituted for authoritative rules.
- [Italia: Milite Ignoto 1921–2021](italia-milite-ignoto/rules.md): Only photographed rule leaflet located; no downloadable publisher PDF.
- [Legendary Characters](legendary-characters/rules.md): Physical rules card documented, but no downloadable PDF located.

BGG catalog and image APIs were accessible, but file downloads were blocked by a browser verification challenge. No empty PDFs or substitutes have been used to conceal these gaps. Deutschland 1902 includes a clearly labeled later combined-edition PDF as supplemental material. Milite Ignoto includes a photographed rule leaflet. The Europe bonus-ticket promos use the anniversary PDF that explicitly covers them.

Legacy includes public starter rules, errata, and FAQ, not sealed campaign content. Track Switcher lacks the full puzzle deck. Most rulebooks do not enumerate every ticket or route: card inventories and machine-readable graphs still need verification. Some map photographs contain placed pieces; consult their quality notes before tracing.

## PDF parsing

[Firecrawl pdf-inspector](https://github.com/firecrawl/pdf-inspector) 1.19.0 is installed locally in `.cache/rules-tools` and exercised against the archive. It extracts text without a cloud service. The inspection report records page counts, OCR recommendations, encoding flags, and extracted character counts; it does not contain full extracted rulebook text. Diagram semantics and multi-column reading order still require visual review.

Recreate the isolated tools and run the inspection from the repository root:

```sh
uv venv .cache/rules-tools
uv pip install --python .cache/rules-tools/bin/python pdf-inspector==1.19.0 pymupdf==1.28.2 pillow==12.3.0
.cache/rules-tools/bin/python rules/inspect_assets.py
```

The recorded run checked 53 PDF files (51 unique documents) and 56 PNGs with no integrity or rendering errors. Median parser time was 20 ms. OCR was recommended only for printable board/ticket pages in Stay at Home and the B&B ticket sheet; no encoding issues were reported. These signals do not establish correct diagram interpretation.

See [inspection.json](inspection.json) for the measured results. This is a local research dependency, not an application runtime dependency.

## Index

### Standalone and edition variants

| Entry                                                              | Assets         | Prerequisite rules |
| ------------------------------------------------------------------ | -------------- | ------------------ |
| [Deutschland](deutschland/rules.md)                                | PDF / MD / PNG | Standalone         |
| [Europe (refreshed)](europe/rules.md)                              | PDF / MD / PNG | Standalone         |
| [Europe 15th Anniversary](europe-15th-anniversary/rules.md)        | PDF / MD / PNG | Standalone         |
| [Europe Classic](europe-classic/rules.md)                          | PDF / MD / PNG | Standalone         |
| [Germany](germany/rules.md)                                        | PDF / MD / PNG | Standalone         |
| [Märklin](marklin/rules.md)                                        | PDF / MD / PNG | Standalone         |
| [Nordic Countries](nordic-countries/rules.md)                      | PDF / MD / PNG | Standalone         |
| [Northern Lights](northern-lights/rules.md)                        | PDF / MD / PNG | Standalone         |
| [Rails & Sails: Great Lakes](rails-and-sails-great-lakes/rules.md) | PDF / MD / PNG | Standalone         |
| [Rails & Sails: World](rails-and-sails-world/rules.md)             | PDF / MD / PNG | Standalone         |
| [USA (refreshed)](usa/rules.md)                                    | PDF / MD / PNG | Standalone         |
| [USA 10th Anniversary](usa-10th-anniversary/rules.md)              | PDF / MD / PNG | usa-classic        |
| [USA Classic](usa-classic/rules.md)                                | PDF / MD / PNG | Standalone         |

### Map expansions

| Entry                                               | Assets         | Prerequisite rules |
| --------------------------------------------------- | -------------- | ------------------ |
| [B&B Vol Liefde](b-and-b-vol-liefde/rules.md)       | PDF / MD / PNG | usa-classic        |
| [France](france/rules.md)                           | PDF / MD / PNG | usa-classic        |
| [Iberia](iberia/rules.md)                           | PDF / MD / PNG | usa-classic        |
| [India](india/rules.md)                             | PDF / MD / PNG | usa-classic        |
| [Italy](italy/rules.md)                             | PDF / MD / PNG | usa-classic        |
| [Japan](japan/rules.md)                             | PDF / MD / PNG | usa-classic        |
| [Legendary Asia](legendary-asia/rules.md)           | PDF / MD / PNG | usa-classic        |
| [Nederland](nederland/rules.md)                     | PDF / MD / PNG | usa-classic        |
| [Old West](old-west/rules.md)                       | PDF / MD / PNG | usa-classic        |
| [Pennsylvania](pennsylvania/rules.md)               | PDF / MD / PNG | usa-classic        |
| [Poland](poland/rules.md)                           | PDF / MD / PNG | usa-classic        |
| [South Korea](south-korea/rules.md)                 | PDF / MD / PNG | usa-classic        |
| [Stay At Home](stay-at-home/rules.md)               | PDF / MD / PNG | usa-classic        |
| [Switzerland](switzerland/rules.md)                 | PDF / MD / PNG | usa-classic        |
| [Team Asia](team-asia/rules.md)                     | PDF / MD / PNG | usa-classic        |
| [The Heart Of Africa](the-heart-of-africa/rules.md) | PDF / MD / PNG | usa-classic        |
| [United Kingdom](united-kingdom/rules.md)           | PDF / MD / PNG | usa-classic        |

### City games

| Entry                                               | Assets                     | Prerequisite rules |
| --------------------------------------------------- | -------------------------- | ------------------ |
| [Amsterdam](amsterdam/rules.md)                     | PDF / MD / PNG             | Standalone         |
| [Berlin](berlin/rules.md)                           | PDF / MD / PNG             | Standalone         |
| [Les Aventuriers du Rail Express](express/rules.md) | **PDF missing** / MD / PNG | Standalone         |
| [London](london/rules.md)                           | PDF / MD / PNG             | Standalone         |
| [New York](new-york/rules.md)                       | PDF / MD / PNG             | Standalone         |
| [Paris](paris/rules.md)                             | PDF / MD / PNG             | Standalone         |
| [San Francisco](san-francisco/rules.md)             | PDF / MD / PNG             | Standalone         |

### Family games

| Entry                                                 | Assets         | Prerequisite rules |
| ----------------------------------------------------- | -------------- | ------------------ |
| [First Journey Europe](first-journey-europe/rules.md) | PDF / MD / PNG | Standalone         |
| [First Journey Usa](first-journey-usa/rules.md)       | PDF / MD / PNG | Standalone         |
| [Ghost Train](ghost-train/rules.md)                   | PDF / MD / PNG | Standalone         |

### Modules and promos

| Entry                                                                   | Assets                     | Prerequisite rules |
| ----------------------------------------------------------------------- | -------------------------- | ------------------ |
| [Alvin And Dexter](alvin-and-dexter/rules.md)                           | PDF / MD / PNG             | usa-classic        |
| [Deutschland 1902](deutschland-1902/rules.md)                           | **PDF missing** / MD / PNG | deutschland        |
| [Dice Expansion](dice-expansion/rules.md)                               | PDF / MD / PNG             | usa-classic        |
| [Europa 1912](europa-1912/rules.md)                                     | PDF / MD / PNG             | europe-classic     |
| [Legendary Characters](legendary-characters/rules.md)                   | **PDF missing** / MD / PNG | usa-classic        |
| [London–København / Ticket to Ride with Max](london-kobenhavn/rules.md) | PDF / MD / PNG             | europe-classic     |
| [Mystery Train](mystery-train/rules.md)                                 | PDF / MD / PNG             | usa-classic        |
| [Orient Express](orient-express/rules.md)                               | PDF / MD / PNG             | europe-classic     |
| [USA 1910](usa-1910/rules.md)                                           | PDF / MD / PNG             | usa-classic        |

### Special formats

| Entry                                                       | Assets         | Prerequisite rules |
| ----------------------------------------------------------- | -------------- | ------------------ |
| [Card Game](card-game/rules.md)                             | PDF / MD / PNG | Standalone         |
| [Legacy: Legends of the West](legends-of-the-west/rules.md) | PDF / MD / PNG | Standalone         |
| [Track Switcher](track-switcher/rules.md)                   | PDF / MD / PNG | Standalone         |

### Rare and demo maps

| Entry                                                            | Assets                     | Prerequisite rules |
| ---------------------------------------------------------------- | -------------------------- | ------------------ |
| [Retailer Demo: Europe](demo-europe/rules.md)                    | **PDF missing** / MD / PNG | Standalone         |
| [Retailer Demo: USA](demo-usa/rules.md)                          | **PDF missing** / MD / PNG | Standalone         |
| [Italia: Milite Ignoto 1921–2021](italia-milite-ignoto/rules.md) | **PDF missing** / MD / PNG | italy              |

Source PDFs and images retain their original copyrights. Download availability does not grant permission to redistribute their artwork in an implemented game.
