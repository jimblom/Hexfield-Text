import * as vscode from 'vscode';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function jumpToTodayCommand(): void {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = toISODate(today);
  const todayDayName = DAY_NAMES[today.getDay()];

  const document = editor.document;

  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i).text;
    // Match headings that mention today's day name or today's ISO date.
    if (line.startsWith('#') && (line.includes(todayDayName) || line.includes(todayISO))) {
      const position = new vscode.Position(i, 0);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.AtTop);
      return;
    }
  }

  vscode.window.showInformationMessage(`No section found for ${todayDayName} in this file.`);
}
