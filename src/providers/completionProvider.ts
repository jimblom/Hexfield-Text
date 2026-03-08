import * as vscode from 'vscode';

interface ProjectConfig {
  color?: string;
}

function getProjectsConfig(): Record<string, ProjectConfig> {
  return (
    vscode.workspace
      .getConfiguration('hexfield-deck')
      .get<Record<string, ProjectConfig>>('projects') ?? {}
  );
}

/** Collect all #tags used in the document (from config and from the file itself). */
function getDocumentTags(document: vscode.TextDocument): string[] {
  const text = document.getText();
  const re = /(?<!\S)#([a-zA-Z][a-zA-Z0-9_-]*)/g;
  const tags = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    tags.add(m[1]);
  }
  return [...tags];
}

export class HexfieldCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.CompletionItem[] {
    const linePrefix = document.lineAt(position).text.slice(0, position.character);

    // Project tag completions — trigger after '#'
    if (/(?<!\S)#$/.test(linePrefix)) {
      return this.tagCompletions(document);
    }

    // Estimate completions — trigger after 'est:'
    if (/\best:$/.test(linePrefix)) {
      return this.estimateCompletions();
    }

    // Checkbox completions — trigger after '['
    if (/\[$/.test(linePrefix)) {
      return this.checkboxCompletions();
    }

    return [];
  }

  private tagCompletions(document: vscode.TextDocument): vscode.CompletionItem[] {
    const configProjects = Object.keys(getProjectsConfig());
    const docTags = getDocumentTags(document);
    const all = [...new Set([...configProjects, ...docTags])].sort();

    return all.map((name) => {
      const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Value);
      item.detail = 'Hexfield project tag';
      const color = getProjectsConfig()[name]?.color;
      if (color) {
        item.documentation = new vscode.MarkdownString(`Color: \`${color}\``);
      }
      return item;
    });
  }

  private estimateCompletions(): vscode.CompletionItem[] {
    const presets: [string, string][] = [
      ['15m', '15 minutes'],
      ['30m', '30 minutes'],
      ['1h', '1 hour'],
      ['2h', '2 hours'],
      ['4h', '4 hours'],
      ['8h', '8 hours (full day)'],
    ];
    return presets.map(([value, label]) => {
      const item = new vscode.CompletionItem(value, vscode.CompletionItemKind.Unit);
      item.detail = label;
      item.insertText = value;
      return item;
    });
  }

  private checkboxCompletions(): vscode.CompletionItem[] {
    const states: [string, string][] = [
      ['[ ]', 'Open task'],
      ['[/]', 'In-progress task'],
      ['[x]', 'Done task'],
    ];
    return states.map(([value, label]) => {
      const item = new vscode.CompletionItem(value, vscode.CompletionItemKind.Enum);
      item.detail = label;
      item.insertText = value;
      return item;
    });
  }
}
