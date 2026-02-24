import * as vscode from 'vscode';
import { DueDateDecorator } from './decorators';

const HEXFIELD_LANGUAGE_ID = 'hexfield-markdown';
const MARKDOWN_LANGUAGE_ID = 'markdown';

/**
 * Matches the YAML frontmatter block at the very start of a file.
 * No multiline flag — ^ anchors to the start of the string (the sliced head).
 * Capture group 1 is the block body between the opening and closing ---.
 */
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

/**
 * Matches the `type: hexfield-planner` line anywhere within a frontmatter block body.
 */
const HEXFIELD_TYPE_RE = /^type:\s*hexfield-planner\s*$/m;

/**
 * Returns true when the document has `type: hexfield-planner` in its YAML frontmatter.
 * Only the first 2 KB are scanned — frontmatter is always at the top of the file.
 */
function hasHexfieldFrontmatter(document: vscode.TextDocument): boolean {
  if (!document.fileName.endsWith('.md')) {
    return false;
  }
  const head = document.getText().slice(0, 2048);
  const match = FRONTMATTER_RE.exec(head);
  if (!match) {
    return false;
  }
  return HEXFIELD_TYPE_RE.test(match[1]);
}

/**
 * Promotes a markdown document to the hexfield-markdown language ID when the
 * file contains `type: hexfield-planner` frontmatter. After promotion, immediately
 * applies due date decorations if the document is visible.
 */
async function promoteIfHexfield(
  document: vscode.TextDocument,
  decorator: DueDateDecorator,
): Promise<void> {
  if (document.languageId !== MARKDOWN_LANGUAGE_ID) {
    return;
  }
  if (!hasHexfieldFrontmatter(document)) {
    return;
  }
  try {
    const promoted = await vscode.languages.setTextDocumentLanguage(document, HEXFIELD_LANGUAGE_ID);
    // Apply decorations immediately after promotion so dates are colored on first open.
    const editor = vscode.window.visibleTextEditors.find((e) => e.document === promoted);
    if (editor) {
      decorator.decorate(editor);
    }
  } catch {
    // Document may have been closed or is not promotable — ignore silently.
  }
}

/**
 * Demotes a hexfield-markdown document back to markdown when the
 * `type: hexfield-planner` frontmatter field has been removed or changed.
 */
async function demoteIfNotHexfield(document: vscode.TextDocument): Promise<void> {
  if (document.languageId !== HEXFIELD_LANGUAGE_ID) {
    return;
  }
  if (!hasHexfieldFrontmatter(document)) {
    try {
      await vscode.languages.setTextDocumentLanguage(document, MARKDOWN_LANGUAGE_ID);
    } catch {
      // Document may have been closed — ignore silently.
    }
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const decorator = new DueDateDecorator();
  context.subscriptions.push(decorator);

  // Decorate the active editor immediately if it's already hexfield-markdown
  // (e.g., extension activated after the file was already open and promoted).
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor?.document.languageId === HEXFIELD_LANGUAGE_ID) {
    decorator.decorate(activeEditor);
  }

  // Process any .md documents already open when the extension activates.
  for (const document of vscode.workspace.textDocuments) {
    promoteIfHexfield(document, decorator);
  }

  // Promote freshly opened markdown files.
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((doc) => promoteIfHexfield(doc, decorator)),
  );

  // Debounce timer for re-decorating on content change (500ms, per spec).
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  // Re-evaluate language ID and re-apply decorations when document content changes.
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      const { document } = event;
      if (document.languageId === MARKDOWN_LANGUAGE_ID) {
        promoteIfHexfield(document, decorator);
      } else if (document.languageId === HEXFIELD_LANGUAGE_ID) {
        demoteIfNotHexfield(document);
        const editor = vscode.window.visibleTextEditors.find((e) => e.document === document);
        if (editor) {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => decorator.decorate(editor), 500);
        }
      }
    }),
  );

  // Decorate and/or promote when the user switches to a different editor tab.
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (!editor) {
        return;
      }
      if (editor.document.languageId === HEXFIELD_LANGUAGE_ID) {
        decorator.decorate(editor);
      } else {
        promoteIfHexfield(editor.document, decorator);
      }
    }),
  );
}

export function deactivate(): void {
  // Nothing to clean up — all disposables are tracked via context.subscriptions.
}
