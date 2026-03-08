import * as vscode from 'vscode';

interface ProjectConfig {
  color?: string;
  url?: string;
}

function getProjectsConfig(): Record<string, ProjectConfig> {
  return (
    vscode.workspace
      .getConfiguration('hexfield-deck')
      .get<Record<string, ProjectConfig>>('projects') ?? {}
  );
}

function getProximityLabel(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = dateStr.split('-').map(Number);
  const due = new Date(year, month - 1, day);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000);

  const formatted = due.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  if (diffDays < 0) {
    const n = Math.abs(diffDays);
    return `**Overdue** — ${n} day${n !== 1 ? 's' : ''} ago (${formatted})`;
  }
  if (diffDays === 0) return '**Due today**';
  if (diffDays === 1) return `**Due tomorrow** — ${formatted}`;
  return `**Due in ${diffDays} days** — ${formatted}`;
}

function parseEstimateLabel(value: string, unit: string): string {
  const n = parseFloat(value);
  if (unit === 'h') {
    const hours = Math.floor(n);
    const mins = Math.round((n - hours) * 60);
    if (mins === 0) return `**${hours} hour${hours !== 1 ? 's' : ''}**`;
    return `**${hours}h ${mins}m**`;
  }
  // unit === 'm'
  const totalMins = Math.round(n);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours === 0) return `**${mins} minute${mins !== 1 ? 's' : ''}**`;
  if (mins === 0) return `**${hours} hour${hours !== 1 ? 's' : ''}**`;
  return `**${hours}h ${mins}m**`;
}

export class HexfieldHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.Hover | undefined {
    const line = document.lineAt(position.line).text;
    const col = position.character;

    // Due date: [YYYY-MM-DD]
    const dateRe = /\[(\d{4}-\d{2}-\d{2})\]/g;
    let m: RegExpExecArray | null;
    while ((m = dateRe.exec(line)) !== null) {
      if (col >= m.index && col < m.index + m[0].length) {
        return new vscode.Hover(new vscode.MarkdownString(getProximityLabel(m[1])));
      }
    }

    // Time estimate: est:Xh or est:Xm
    const estRe = /\best:(\d+(?:\.\d+)?)([hm])\b/g;
    while ((m = estRe.exec(line)) !== null) {
      if (col >= m.index && col < m.index + m[0].length) {
        return new vscode.Hover(
          new vscode.MarkdownString(parseEstimateLabel(m[1], m[2])),
        );
      }
    }

    // Project tag: #tagname
    const tagRe = /(?<!\S)#([a-zA-Z][a-zA-Z0-9_-]*)/g;
    while ((m = tagRe.exec(line)) !== null) {
      if (col >= m.index && col < m.index + m[0].length) {
        const tagName = m[1];
        const proj = getProjectsConfig()[tagName];
        const lines: string[] = [`**#${tagName}**`];
        if (proj?.color) lines.push(`Color: \`${proj.color}\``);
        if (proj?.url) {
          const md = new vscode.MarkdownString(lines.join('  \n'));
          md.appendMarkdown(`  \n[Open project](${proj.url})`);
          md.isTrusted = true;
          return new vscode.Hover(md);
        }
        return new vscode.Hover(new vscode.MarkdownString(lines.join('  \n')));
      }
    }

    return undefined;
  }
}
