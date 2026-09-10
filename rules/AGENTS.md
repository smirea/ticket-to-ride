# Using the rules archive

Start with README.md and catalog.json. This archive contains geographic maps only; do not add separate folders for ticket packs, shared-map modules, card-only games, or puzzles. Catalog IDs remain stable; the `folder` field gives the `map-<name>` directory. Choose one `map-<name>` folder and read its rules.md, sources.json, source PDF, and listed prerequisite rules. Markdown files contain parsed rulebook text and linked original page images. Parsing can misorder columns or miss image-only text; consult the linked page whenever interpretation is unclear. The source PDF and applicable publisher errata govern rule details.

Keep one active folder per canonical map/game mode. Store alternate printing and anniversary rulebooks as supplemental files in that folder. Retailer demos and incomplete source kits belong only in catalog.json deferred entries, not asset folders.

A `source-kit-present` status means a published rulebook, parsed Markdown, and board reference exist. It does not mean the map is implemented or that all cards, route data, or campaign content are available. Resolve the entry's implementation gaps before claiming completeness. Missing PDFs must remain explicit; do not rename a related edition's rulebook to conceal a missing source.

Keep edition setup, decks, end conditions, tie rules, route restrictions, and bonuses separate. Expansions often supply only rule changes. A prerequisite points to shared rules, not permission to inherit every mechanic or proof that every physical base set is compatible.

Use the map reference to identify geography. Check its source and quality notes before tracing: some images are photographs with pieces, rulebook illustrations, or illustrations with setup annotations. Validate city labels, parallel tracks, lengths, colors, ferries, tunnels, border endpoints, and inset connections. Ticket decks and non-ticket cards generally need additional source material; do not invent their contents.

For each implemented entry, keep a short record of supported variants, verified component data, unresolved questions, and evidence for unusual rule behavior. Use meaningful gameplay scenarios to check new mechanics. Preserve the original downloaded PDFs and image provenance.

Regenerate parsed text and page images with parse_rulebooks.py. After changing assets or Markdown, update their byte counts and SHA-256 hashes in sources.json and run inspect_assets.py using the environment described in README.md. The inspection checks file integrity and PDF readability; visual and semantic review remain separate.
