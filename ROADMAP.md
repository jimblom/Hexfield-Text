# Hexfield Text — Roadmap

> Working document. Milestones are thematic, not time-bound. Priorities TBD.

---

## v0.2 — Visual Completeness

Close the gaps in the current decoration set. Everything here is a natural extension of what v0.1.0 already does.

### Done-task strikethrough
Apply `textDecoration: 'line-through'` to the full text of any `[x]` task line. Makes completed work visually distinct without relying on color alone. The impl plan flagged this as an open question — it's the most obvious missing piece in the current token set.

**Variant:** Also dim the entire `[x]` line (reduced opacity or muted foreground) so done work recedes and open tasks stand out more clearly.

### Richer checkbox state styling
The three checkbox states currently differ only via grammar scopes. Lean into it:

- `[ ]` — default/neutral (already handled)
- `[/]` — orange foreground (already handled)
- `[x]` — strikethrough + dimmed (see above)

Consider whether `[>]` (deferred/rolled) and `[-]` (cancelled) are worth supporting as Hexfield format extensions. Hexfield Deck may already recognize or could recognize them.

### Frontmatter block decoration
The frontmatter keys (`week:`, `year:`, `type:`) are colored purple via grammar. A subtle background highlight on the entire frontmatter block — a very faint tinted region — would make the metadata section visually distinct from task content. Implemented via Decoration API targeting the `---` delimiters and everything between them.

### Estimate unit normalization display
`est:90m` and `est:1.5h` mean the same thing. Both are valid today. Consider whether hover text (see v0.3) should normalize to hours for display, and whether the token color should also cover `est:Xd` (days) if Hexfield Deck adds that unit.

---

## v0.3 — Editor Intelligence

Make the extension actively helpful during editing, not just decorative after the fact.

### Hover tooltips

Register a `HoverProvider` scoped to `hexfield-markdown`. On hover:

- **Due date** `[2026-02-15]` — show human-readable proximity: _"3 days overdue"_, _"Due today"_, _"Due in 5 days (Friday)"_
- **Time estimate** `est:4h` — show expanded form: _"4 hours"_; for `est:90m` — _"1h 30m"_
- **Project tag** `#hexfield` — show project name and color from `hexfield-deck.projects` config if defined; fall back gracefully if not

Low implementation cost, high perceived polish.

### Project tag autocomplete

Register a `CompletionItemProvider` that fires on `#`. Pull the project list from `hexfield-deck.projects` configuration and offer matching entries as completion items, with color swatches in the completion detail field if VS Code supports it.

Fall back to tags already used in the current document if no projects are configured — useful for files with no `hexfield-deck.projects` setup.

### Token insertion completions

Offer completions for the other token types when their prefixes are typed:

- `est:` → suggest `est:30m`, `est:1h`, `est:2h`, `est:4h`, `est:8h` as quick picks
- `!` → suggest `!`, `!!`, `!!!` with labels (Low / Med / High)
- `[` → suggest `[ ]`, `[/]`, `[x]`

### Go-to / Cmd+Click on project tags

Register a `DefinitionProvider` for `#project-tag` tokens. If the project has a `url` in `hexfield-deck.projects` config, open it in the browser. The `url` field is already defined in `ProjectConfig` — this just needs a provider wired up to it.

### Date quick fix — code actions

When the cursor is on an overdue due date, show a lightbulb (code action) with:

- **Update to today** — replaces `[2026-01-15]` with today's date
- **Snooze 1 day / 3 days / 1 week** — bumps the date forward

Makes overdue cleanup frictionless. Implemented via `CodeActionProvider`.

---

## v0.4 — Commands & Active Editing

New planner-file operations exposed as VS Code commands.

### New Hexfield Planner File

Command: `Hexfield: New Weekly Planner`

Generates a new `.md` file pre-populated with the correct frontmatter (`type: hexfield-planner`, `week`, `year`, `startDate`, `endDate` computed from today) and a day-section skeleton for each day of the week. Saves the user from manually writing the scaffold every week.

**Variant:** A monthly planner template alongside the weekly one.

### Insert date at cursor

Command: `Hexfield: Insert Date`

Opens a date picker (or a quick-pick list of: today, tomorrow, end of week, end of month, next week) and inserts the selected date as `[YYYY-MM-DD]` at the current cursor position. Eliminates manually typing dates.

### Snippet pack

Contribute a `contributes.snippets` file for `hexfield-markdown` with:

| Prefix | Expands to |
|---|---|
| `hfm` | Full frontmatter block for current week |
| `hfd` | Day section heading with date |
| `hft` | Full task line: `- [ ] $1 #$2 [$3] $4 est:$5` |
| `hfe` | `est:$1` |
| `!!!` | Priority HIGH (quick muscle-memory entry) |

Snippets require zero runtime code — just a JSON file and a manifest entry.

### Roll incomplete tasks forward

Command: `Hexfield: Roll Incomplete Tasks`

Collects all `[ ]` and `[/]` tasks from a completed week's file and appends them to a target file (today's planner, or a user-selected planner). Useful for weekly review. Probably the most ambitious item in this milestone; needs careful UX design to avoid clobbering things.

---

## v0.5 — Summary & Analytics

Surface aggregate information about the planner file without requiring the user to count or scroll.

### Status bar summary

When a Hexfield planner file is active, show a compact summary in the VS Code status bar:

```
Hexfield: 2 overdue  |  5 open  |  3 in-progress
```

Clicking it could open the task summary panel (see below) or jump to the first overdue item.

### Task summary panel

Command: `Hexfield: Show Task Summary`

Opens a VS Code output panel or webview with tasks from the active file, organized by:

- Status (overdue / today / in-progress / open / done)
- Or by project tag

Useful for daily standup — a flat view of what's in flight.

### Estimate aggregation

Show total `est:` time for the active file (or active day section) somewhere visible — status bar, hover on day headings, or a dedicated command. Useful for capacity planning: if Monday has `est:12h` of tasks, something needs to move.

**Implementation note:** Day section totals are the most useful granularity. Requires parsing section structure, not just scanning tokens.

---

## v0.6 — Navigation & Outline

Better movement through large planner files.

### Outline view integration

VS Code's Outline panel (and breadcrumbs) already picks up markdown headings. Enrich this for Hexfield files:

- Show task counts per day section in the outline label: `Monday (3 open, 1 overdue)`
- Potentially show in-progress and done counts too

This may require a `DocumentSymbolProvider` that overrides the default markdown one for `hexfield-markdown` files.

### Task tree view panel

A dedicated VS Code sidebar panel (activity bar icon) showing all tasks in the active planner file, grouped by:

- **Day** (default)
- **Project tag**
- **Status**

Clicking a task jumps to its line in the editor. Like a mini kanban list for the editor without being a full board view — that's Hexfield Deck's job.

**Scope note:** This is the most VS Code UI surface area of any item on this roadmap. Worth doing eventually; probably not v0.6 if other things are higher priority.

### Jump to today's section

Command: `Hexfield: Jump to Today`

In a weekly planner, jumps the cursor to the day-section heading that matches today's date. Simple but useful — weekly files get long.

---

## v0.7 — Ecosystem Integration

Tighter coupling with Hexfield Deck and the broader Hexfield format.

### Open in Hexfield Deck board

Command: `Hexfield: Open in Board`

When editing a planner file in Hexfield Text, this command opens the same file in Hexfield Deck's board view side-by-side. Requires Hexfield Deck to expose a command that accepts a file URI — a small coordination change between the two extensions.

### Shared project palette

If `hexfield-deck.projects` has projects with colors, surface a color-consistent experience across both extensions with zero extra configuration. This is already largely true in v0.1.0 — but document it explicitly and ensure edge cases (project added in one extension, missing in the other) are handled gracefully.

### Format compatibility validation

Light linting: when a task line has tokens in an unusual order, or a date token doesn't match `[YYYY-MM-DD]` exactly, show a diagnostic (warning squiggle) with a suggested correction. Keeps files clean and compatible with Hexfield Deck's parser.

---

## Horizon / Unscoped

Ideas that are interesting but need more thought before committing to a milestone.

- **Multi-file task rollup** — aggregate tasks across all planner files in a workspace folder, not just the active one. Useful for monthly reviews; complex to do well.
- **Recurring task support** — a `recur:weekly` token that Hexfield Text tracks and could help generate next week's file. Requires format design work in Hexfield Deck first.
- **Time tracking integration** — `started:` / `ended:` tokens for actual time logged vs. estimated. Big format change; better as a separate Hexfield component.
- **Obsidian plugin port** — the impl plan lists this as a non-goal for Hexfield Text specifically. If Hexfield Deck ever ships an Obsidian plugin, a companion Obsidian plugin for Hexfield Text would follow naturally.
- **Light theme color defaults** — the current defaults are optimized for dark themes (VS Code Dark+, One Dark). A separate default palette for light themes would make the extension usable across more setups.

---

## Implementation Complexity Reference

| Feature | Complexity | VS Code API Surface |
|---|---|---|
| Done-task strikethrough | Low | Decoration API |
| Frontmatter block highlight | Low | Decoration API |
| Hover tooltips | Low | `HoverProvider` |
| Snippets | Low | `contributes.snippets` |
| Status bar summary | Low | `StatusBarItem` |
| Token autocomplete | Medium | `CompletionItemProvider` |
| Jump to today | Low | `TextEditorRevealType` |
| Date quick fix | Medium | `CodeActionProvider` |
| Insert date command | Medium | `QuickPick`, `TextEdit` |
| New planner file command | Medium | `WorkspaceEdit`, templates |
| Go-to on project tags | Medium | `DefinitionProvider` |
| Estimate aggregation | Medium | Document scanning + section parsing |
| Outline view enrichment | Medium | `DocumentSymbolProvider` |
| Open in Hexfield Deck | Medium | Extension-to-extension commands |
| Task summary panel | High | Output panel or Webview |
| Task tree view | High | `TreeDataProvider`, activity bar |
| Roll tasks forward | High | Multi-file edit, UX design |
| Format validation | High | `DiagnosticCollection`, parser |

---

*Last updated: 2026-03-07*
