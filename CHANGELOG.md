# Changelog

All notable changes to Hexfield Text are documented here. Dates are in `YYYY-MM-DD` format.

---

## [0.2.0] — 2026-03-12

### Added

- **Done-task strikethrough** — `[x]` task lines render with strikethrough text and a muted foreground color. Configurable via `hexfield.colors.doneTask`.

- **Frontmatter block highlight** — the YAML frontmatter block receives a subtle background tint to visually separate it from task content.

- **Line comments** — `// comment text` syntax is now supported inline on any task line. Everything from `//` to end of line renders in comment green (`#6A9955`, matching VS Code Dark+ C/C++ comment color). `://` in URLs is excluded. Configurable via `hexfield.colors.lineComment`.

- **Hover tooltips** — hovering Hexfield tokens shows contextual information:
  - Due dates — human-readable proximity ("3 days overdue", "Due today", "Due in 5 days — Friday, March 15")
  - Time estimates — expanded form (`est:90m` → "1h 30m")
  - Project tags — configured color and URL link (from `hexfield-deck.projects`)

- **Project tag autocomplete** — typing `#` in a Hexfield planner file offers completions from `hexfield-deck.projects` config and tags already present in the document. Partial input is replaced, not appended.

- **`Hexfield: Insert Date` command** — opens a quick-pick with preset options (today, tomorrow, end of week, next Monday, and more) and inserts `[YYYY-MM-DD]` at the cursor. Only available in Hexfield planner files.

- **`Hexfield: Jump to Today` command** — scrolls to the day-section heading matching today's date. Only available in Hexfield planner files.

- **Snippet pack** — seven snippets for `hexfield-markdown` files: `hfm` (frontmatter), `hfd` (day section), `hft` (full task line), `est` (estimate with preset choice list), `phi` / `pme` / `plo` (priority markers).

- **Status bar task summary** — when a Hexfield planner file is active, a summary appears in the right status bar showing overdue date count, in-progress task count, and open task count. Updates within 500ms of edits.

### Fixed

- **Markdown links on `[/]` lines** — `[text](url)` links on the same line as an in-progress checkbox now render correctly. The `[/]` grammar pattern is now anchored to the list item checkbox position via lookbehind, preventing interference with the markdown grammar's link detection.

### Internal

- Introduced `HexfieldCompletionService` provider architecture (`src/completions/`). Completions are implemented as focused `HexfieldSubProvider` classes; the service registers once with VS Code and fans out. Trigger characters are derived automatically from active providers. Supersedes PR #3.

---

## [0.1.0] — 2026-03-01

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

