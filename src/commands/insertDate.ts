import * as vscode from 'vscode';

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** Returns the next occurrence of targetDay (0=Sun…6=Sat), always in the future. */
function nextWeekday(date: Date, targetDay: number): Date {
  const d = new Date(date);
  const current = d.getDay();
  const diff = (targetDay - current + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}

export async function insertDateCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const options = [
    { label: 'Today', date: today },
    { label: 'Tomorrow', date: addDays(today, 1) },
    { label: 'End of week (Friday)', date: nextWeekday(today, 5) },
    { label: 'Next Monday', date: nextWeekday(today, 1) },
    { label: 'In 1 week', date: addDays(today, 7) },
    { label: 'In 2 weeks', date: addDays(today, 14) },
    { label: 'In 1 month', date: addDays(today, 30) },
  ].map((o) => ({
    label: o.label,
    description: toISODate(o.date),
    isoDate: toISODate(o.date),
  }));

  const picked = await vscode.window.showQuickPick(options, {
    placeHolder: 'Select a date to insert',
    matchOnDescription: true,
  });

  if (!picked) return;

  const token = `[${picked.isoDate}]`;
  editor.edit((editBuilder) => {
    for (const selection of editor.selections) {
      editBuilder.insert(selection.active, token);
    }
  });
}
