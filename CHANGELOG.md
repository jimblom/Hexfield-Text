# Changelog

All notable changes to Hexfield Text are documented here. Dates are in `YYYY-MM-DD` format.

---

## [1.0.1] — 2026-02-27

### Changed

- **Breaking:** color settings migrated from `hexfield-text.colors.*` to the shared `hexfield.colors.*` namespace. If you have customized colors, rename the keys in your `settings.json` (e.g. `hexfield-text.colors.projectTag` → `hexfield.colors.projectTag`). This aligns with Hexfield Deck's upcoming adoption of the same namespace so both extensions share one settings group.

---

## [1.0.0] — 2026-02-27

### Added

- **User-configurable due date colors** — `hexfield-text.colors.dueDateOverdue`, `dueDateToday`, `dueDateSoon`, `dueDateFuture` settings in VS Code preferences
- Due date decorator rebuilds automatically when color settings change (no reload needed)
- Extension published to VS Code Marketplace as `jimblom.hexfield-text`

---

## [0.2.0] — 2026-02-24

### Added

- **Decoration API** — dynamic due date proximity coloring (`[YYYY-MM-DD]` tokens)
- Four proximity buckets: overdue → red, today → orange, within 3 days → yellow, future → gray
- Colors mirror Hexfield Deck board badge colors exactly
- Debounced re-decoration (500ms) on every document change
- Language de-promotion — removing `type: hexfield-planner` from frontmatter while a file is open immediately reverts colorization

---

## [0.1.0] — 2026-02-23

### Added

- Initial release
- Custom language ID (`hexfield-markdown`) promoted from `.md` files containing `type: hexfield-planner` in YAML frontmatter
- TextMate grammar (`hexfield-deck.tmLanguage.json`) scoped to `hexfield-markdown` only:
  - Project tags (`#tag`) — blue
  - Due date brackets (`[YYYY-MM-DD]`) — default gray (overridden by Decoration API)
  - Priority HIGH / MED / LOW (`!!!` / `!!` / `!`) — red / yellow / green
  - Time estimates (`est:Xh`, `est:Xm`) — teal
  - In-progress checkbox (`[/]`) — orange
  - Frontmatter keys (`type`, `week`, `year`, `quarter`, `tags`, `startDate`, `endDate`) — purple
- Zero false-positive colorization on regular markdown files
