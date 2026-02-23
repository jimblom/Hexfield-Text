import * as vscode from 'vscode';

const HEXFIELD_LANGUAGE_ID = 'hexfield-markdown';
const MARKDOWN_LANGUAGE_ID = 'markdown';

/**
 * Matches the YAML frontmatter block at the very start of a file.
 * Captures the block body (everything between the opening and closing ---).
 */
const FRONTMATTER_RE = /\A---\r?\n([\s\S]*?)\r?\n---/;

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
 * file contains `type: hexfield-planner` frontmatter.
 */
async function promoteIfHexfield(document: vscode.TextDocument): Promise<void> {
  if (document.languageId !== MARKDOWN_LANGUAGE_ID) {
    return;
  }
  if (hasHexfieldFrontmatter(document)) {
    try {
      await vscode.languages.setTextDocumentLanguage(document, HEXFIELD_LANGUAGE_ID);
    } catch {
      // Document may have been closed or is not promotable — ignore silently.
    }
  }
}

/**
 * Demotes a hexfield-markdown document back to markdown when the
 * `type: hexfield-planner` frontmatter field has been removed.
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
  // Process any .md documents that are already open when the extension activates.
  for (const document of vscode.workspace.textDocuments) {
    promoteIfHexfield(document);
  }

  // Promote freshly opened markdown files.
  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(promoteIfHexfield));

  // Re-evaluate language ID when document content changes (e.g., frontmatter added/removed).
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      const { document } = event;
      if (document.languageId === MARKDOWN_LANGUAGE_ID) {
        promoteIfHexfield(document);
      } else if (document.languageId === HEXFIELD_LANGUAGE_ID) {
        demoteIfNotHexfield(document);
      }
    }),
  );

  // Catch files that were already open when VS Code started but the extension had
  // not yet activated — they appear via onDidChangeActiveTextEditor.
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        promoteIfHexfield(editor.document);
      }
    }),
  );
}

export function deactivate(): void {
  // Nothing to clean up — all disposables are tracked via context.subscriptions.
}
