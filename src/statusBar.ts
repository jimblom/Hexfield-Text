import * as vscode from 'vscode';

function countOverdueDates(text: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const re = /\[(\d{4}-\d{2}-\d{2})\]/g;
  let count = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const [year, month, day] = m[1].split('-').map(Number);
    const due = new Date(year, month - 1, day);
    if (due < today) count++;
  }
  return count;
}

/**
 * Status bar item shown when a Hexfield planner file is active.
 * Displays counts of overdue dates, in-progress tasks, and open tasks.
 */
export class HexfieldStatusBar implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      'hexfield.summary',
      vscode.StatusBarAlignment.Right,
      100,
    );
    this.item.name = 'Hexfield Task Summary';
  }

  update(document: vscode.TextDocument): void {
    const text = document.getText();
    const open = (text.match(/^[ \t]*-[ \t]+\[ \]/gm) ?? []).length;
    const inProgress = (text.match(/^[ \t]*-[ \t]+\[\/\]/gm) ?? []).length;
    const overdue = countOverdueDates(text);

    const parts: string[] = [];
    if (overdue > 0) parts.push(`$(warning) ${overdue} overdue`);
    if (inProgress > 0) parts.push(`$(sync~spin) ${inProgress} active`);
    parts.push(`$(circle-outline) ${open} open`);

    this.item.text = `$(tasklist) ${parts.join('  ')}`;
    this.item.tooltip = new vscode.MarkdownString(
      [
        '**Hexfield Task Summary**',
        '',
        `- Overdue: **${overdue}**`,
        `- In progress: **${inProgress}**`,
        `- Open: **${open}**`,
      ].join('\n'),
    );
    this.item.show();
  }

  hide(): void {
    this.item.hide();
  }

  dispose(): void {
    this.item.dispose();
  }
}
