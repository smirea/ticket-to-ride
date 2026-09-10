# Using the rules archive

Start with README.md and catalog.json. Choose one folder and read its rules.md, sources.json, source PDF, and listed prerequisite rules. Markdown files are original orientation notes, not complete rules. The source PDF and applicable publisher errata govern rule details.

A `three-required-assets-present` status means PDF, Markdown, and PNG exist. It does not mean the map is implemented or that all cards, route data, or campaign content are available. Resolve the entry's implementation gaps before claiming completeness. Missing PDFs must remain explicit; do not rename a related edition's rulebook to conceal a missing source.

Keep edition setup, decks, end conditions, tie rules, route restrictions, and bonuses separate. Expansions often supply only rule changes. A prerequisite points to shared rules, not permission to inherit every mechanic or proof that every physical base set is compatible.

Use the map reference to identify geography. Check its source and quality notes before tracing: some images are photographs with pieces, rulebook illustrations, or reused base boards. Validate city labels, parallel tracks, lengths, colors, ferries, tunnels, border endpoints, and inset connections. Ticket decks and non-ticket cards generally need additional source material; do not invent their contents.

For each implemented entry, keep a short record of supported variants, verified component data, unresolved questions, and evidence for unusual rule behavior. Use meaningful gameplay scenarios to check new mechanics. Preserve the original downloaded PDFs and image provenance.

After changing assets or briefs, update their byte counts and SHA-256 hashes in sources.json and run inspect_assets.py using the environment described in README.md. The inspection checks file integrity and PDF readability; visual and semantic review remain separate.
