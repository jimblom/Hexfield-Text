// Dynamic due date proximity colorization via the VS Code Decoration API.
//
// Scans hexfield-markdown documents for [YYYY-MM-DD] tokens, computes proximity
// relative to today, and applies one of four colors that mirror Hexfield Deck's
// board badge colors exactly:
//
//   Overdue  (date < today)       → Red    (#F44747)
//   Today    (date === today)     → Orange (#CE9178)
//   Soon     (1–3 days from now)  → Yellow (#CCA700)
//   Future   (> 3 days from now)  → Gray   (#858585)
//
// The decorator is debounced at 500ms by the caller and re-runs on every
// document change. All TextEditorDecorationType instances are disposed when
// the extension deactivates.

import * as vscode from 'vscode';

/** Matches `[YYYY-MM-DD]` anywhere in a document. Capture group 1 is the date string. */
const DATE_BRACKET_RE = /\[(\d{4}-\d{2}-\d{2})\]/g;

type Proximity = 'overdue' | 'today' | 'soon' | 'future';

/** Colors mirror Hexfield Deck board badge colors exactly. */
const PROXIMITY_COLORS: Record<Proximity, string> = {
  overdue: '#F44747', // Red
  today: '#CE9178', // Orange
  soon: '#CCA700', // Yellow
  future: '#858585', // Gray
};

/**
 * Computes proximity of an ISO date string (YYYY-MM-DD) relative to today.
 * Today's date is evaluated at call time so decorations always reflect the
 * current calendar day — no stale state across midnight.
 */
function getProximity(dateStr: string): Proximity {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, month, day] = dateStr.split('-').map(Number);
  const due = new Date(year, month - 1, day);

  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'today';
  if (diffDays <= 3) return 'soon';
  return 'future';
}

/**
 * Scans hexfield-markdown documents for `[YYYY-MM-DD]` tokens and applies
 * proximity-based foreground color decorations. Implements vscode.Disposable
 * so the four TextEditorDecorationType instances are cleaned up on deactivation.
 */
export class DueDateDecorator implements vscode.Disposable {
  private readonly decorationTypes: Record<Proximity, vscode.TextEditorDecorationType>;

  constructor() {
    this.decorationTypes = {
      overdue: vscode.window.createTextEditorDecorationType({
        color: PROXIMITY_COLORS.overdue,
      }),
      today: vscode.window.createTextEditorDecorationType({
        color: PROXIMITY_COLORS.today,
      }),
      soon: vscode.window.createTextEditorDecorationType({
        color: PROXIMITY_COLORS.soon,
      }),
      future: vscode.window.createTextEditorDecorationType({
        color: PROXIMITY_COLORS.future,
      }),
    };
  }

  /**
   * Applies due date proximity decorations to the given editor.
   * Safe to call on any editor — silently no-ops if no date tokens are found.
   */
  decorate(editor: vscode.TextEditor): void {
    const buckets: Record<Proximity, vscode.Range[]> = {
      overdue: [],
      today: [],
      soon: [],
      future: [],
    };

    const text = editor.document.getText();
    DATE_BRACKET_RE.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = DATE_BRACKET_RE.exec(text)) !== null) {
      const proximity = getProximity(match[1]);
      const start = editor.document.positionAt(match.index);
      const end = editor.document.positionAt(match.index + match[0].length);
      buckets[proximity].push(new vscode.Range(start, end));
    }

    for (const prox of Object.keys(buckets) as Proximity[]) {
      editor.setDecorations(this.decorationTypes[prox], buckets[prox]);
    }
  }

  dispose(): void {
    for (const type of Object.values(this.decorationTypes)) {
      type.dispose();
    }
  }
}
