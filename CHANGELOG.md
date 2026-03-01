# Changelog

All notable changes to Hexfield Text are documented here. Dates are in `YYYY-MM-DD` format.

---

## [1.0.0] — 2026-02-28

Initial public release.

### Added

- **Language promotion** — `.md` files with `type: hexfield-planner` in their YAML frontmatter are promoted to the `hexfield-markdown` language mode. Removing or changing the field reverts immediately — no VS Code reload needed.

- **TextMate grammar** — an injection grammar colorizes Hexfield tokens inside markdown list items, paragraphs, and other block-level scopes where a top-level grammar include cannot reach:
  - Project tags (`#project`)
  - Priority markers (`!!!` / `!!` / `!`)
  - Time estimates (`est:2h`, `est:30m`)
  - In-progress checkbox (`[/]`)
  - Frontmatter keys (`type`, `week`, `year`, `quarter`, `tags`, `startDate`, `endDate`)

- **Decoration API — theme-independent token colors** — all inline tokens are colored via VS Code's Decoration API rather than relying on theme scope mappings. Colors are absolute; no theme (Dracula, One Dark, etc.) can override them:
  - Project tags — blue pill border (`#569CD6` default)
  - Priority HIGH / MED / LOW — red / yellow / green
  - Time estimates — teal
  - In-progress checkbox (`[/]`) — orange
  - Due dates — dynamically colored by proximity to today:
    - Overdue → red (`#F44747`)
    - Today → orange (`#CE9178`)
    - Within 3 days → yellow (`#CCA700`)
    - Future → gray (`#858585`)

- **Per-project tag colors** — `#project-tag` tokens read `hexfield-deck.projects.<name>.color` from VS Code settings. Each project renders in its configured color with a matching pill border. Tags without a configured color fall back to the `hexfield.colors.projectTag` default.

- **Shared configuration namespace** — all 10 token colors are user-configurable under `hexfield.colors.*`. This namespace is shared with Hexfield Deck; configure colors once and every installed Hexfield component responds. Changes take effect live with no reload.

- **Ecosystem documentation** — README and User Guide document the Hexfield component model: the shared file format, shared configuration architecture, and design principles for independently-installable components.

- Published to VS Code Marketplace as `jimblom.hexfield-text`.

---

## Development milestones (pre-release)

### [0.2.0] — 2026-02-24

- Decoration API for dynamic due date proximity coloring
- Debounced re-decoration (500ms) on document change
- Language de-promotion when frontmatter field is removed

### [0.1.0] — 2026-02-23

- Extension scaffold, language promotion logic, TextMate grammar
- Zero false-positive colorization on regular markdown files
