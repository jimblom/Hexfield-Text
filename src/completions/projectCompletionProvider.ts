import * as vscode from 'vscode';

/**
 * Matches project tags in a document: #name where name starts with a letter
 * and contains letters, digits, underscores, or hyphens.
 * Must use the global flag; callers reset lastIndex before each use.
 */
const PROJECT_TAG_RE = /(?<!\S)#([a-zA-Z][a-zA-Z0-9_-]*)/g;

/** Returns project names defined in the hexfield-deck.projects configuration. */
function getProjectNamesFromConfig(): string[] {
  const projects =
    vscode.workspace.getConfiguration('hexfield-deck').get<Record<string, unknown>>('projects') ??
    {};
  return Object.keys(projects);
}

/** Returns all unique project names found as #tags in the document. */
function getProjectNamesFromDocument(document: vscode.TextDocument): string[] {
  const text = document.getText();
  const names = new Set<string>();
  PROJECT_TAG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PROJECT_TAG_RE.exec(text)) !== null) {
    names.add(m[1]);
  }
  return [...names];
}

/**
 * Provides autocomplete suggestions for Hexfield project tags (#name).
 *
 * Suggestions are drawn from two sources:
 *   1. Project names defined in the `hexfield-deck.projects` configuration.
 *   2. Project tags already present in the current document.
 *
 * Triggered by the `#` character. The completion range covers the `#` and any
 * partial name already typed so the selected item replaces the partial input.
 */
export class ProjectCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.CompletionItem[] {
    const lineText = document.lineAt(position).text;
    const textBefore = lineText.slice(0, position.character);

    // Only provide completions when the cursor is directly after a # that
    // begins a project tag (optionally with a partial name already typed).
    // The lookbehind mirrors the STATIC_PATTERNS.projectTag regex: the # must
    // be at the start of the line or preceded by whitespace.
    const tagMatch = /(?:^|(?<=\s))#[a-zA-Z0-9_-]*$/.exec(textBefore);
    if (!tagMatch) {
      return [];
    }

    // Range that will be replaced: from the # to the current cursor.
    // tagMatch.index points to # because the lookbehind (?:^|(?<=\s)) is zero-width.
    const tagStart = position.with(undefined, tagMatch.index);
    const replaceRange = new vscode.Range(tagStart, position);

    // Collect project names from both sources, deduplicated.
    const names = new Set<string>([
      ...getProjectNamesFromConfig(),
      ...getProjectNamesFromDocument(document),
    ]);

    return [...names].map((name) => {
      const item = new vscode.CompletionItem(`#${name}`, vscode.CompletionItemKind.Value);
      item.insertText = `#${name}`;
      item.range = replaceRange;
      item.detail = 'Hexfield project tag';
      return item;
    });
  }
}
