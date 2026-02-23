// Phase 2 — Dynamic due date proximity colorization via the Decoration API.
//
// The decorator scans hexfield-markdown documents for [YYYY-MM-DD] tokens,
// computes proximity relative to today, and applies one of four colors that
// mirror Hexfield Deck's board badge colors exactly:
//
//   Overdue  (date < today)   → Red    (#F44747)
//   Today                     → Orange (#CE9178)
//   Within 3 days             → Yellow (#CCA700)
//   Future                    → Gray   (#858585)
//
// The decorator is debounced at 500ms and re-runs on every document change.

import * as vscode from 'vscode';

export class DueDateDecorator {
  dispose(): void {
    // Phase 2: clean up TextEditorDecorationType instances
  }
}
