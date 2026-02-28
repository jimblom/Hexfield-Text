// Hexfield inline token colorization via the VS Code Decoration API.
//
// Handles two categories of tokens:
//
// STATIC tokens — fixed color regardless of context:
//   Project tag   #project        → Blue   (#569CD6)
//   Priority HIGH !!!             → Red    (#F44747)
//   Priority MED  !!              → Yellow (#CCA700)
//   Priority LOW  !               → Green  (#89D185)
//   Time estimate est:2h / est:30m → Teal  (#4EC9B0)
//   In-progress   [/]             → Orange (#CE9178)
//
// DYNAMIC tokens — color computed at runtime relative to today:
//   Due date [YYYY-MM-DD]:
//     Overdue  (date < today)      → Red    (#F44747)
//     Today    (date === today)    → Orange (#CE9178)
//     Soon     (1–3 days from now) → Yellow (#CCA700)
//     Future   (> 3 days from now) → Gray   (#858585)
//
// Using the Decoration API for all tokens ensures colors are absolute and
// not overridden by the active VS Code theme.
//
// All TextEditorDecorationType instances are disposed on deactivation or
// when colors are refreshed from configuration.

import * as vscode from 'vscode';

// ---------------------------------------------------------------------------
// Static token types
// ---------------------------------------------------------------------------

type StaticToken =
  | 'projectTag'
  | 'priorityHigh'
  | 'priorityMed'
  | 'priorityLow'
  | 'estimate'
  | 'inProgressCheckbox';

const STATIC_DEFAULTS: Record<StaticToken, string> = {
  projectTag: '#569CD6', // Blue
  priorityHigh: '#F44747', // Red
  priorityMed: '#CCA700', // Yellow
  priorityLow: '#89D185', // Green
  estimate: '#4EC9B0', // Teal
  inProgressCheckbox: '#CE9178', // Orange
};

const STATIC_CONFIG_KEYS: Record<StaticToken, string> = {
  projectTag: 'projectTag',
  priorityHigh: 'priorityHigh',
  priorityMed: 'priorityMed',
  priorityLow: 'priorityLow',
  estimate: 'timeEstimate',
  inProgressCheckbox: 'inProgressCheckbox',
};

/** Each regex must use the global flag so lastIndex can be reset between calls. */
const STATIC_PATTERNS: Record<StaticToken, RegExp> = {
  projectTag: /(?<!\S)#[a-zA-Z][a-zA-Z0-9_-]*/g,
  priorityHigh: /(?<!!)!!!(?!!)/g,
  priorityMed: /(?<!!)!!(?!!)/g,
  priorityLow: /(?<!!)!(?!!)/g,
  estimate: /\best:\d+(?:\.\d+)?[hm]\b/g,
  inProgressCheckbox: /\[\/\]/g,
};

// ---------------------------------------------------------------------------
// Dynamic token types (due date proximity)
// ---------------------------------------------------------------------------

type Proximity = 'overdue' | 'today' | 'soon' | 'future';

const PROXIMITY_DEFAULTS: Record<Proximity, string> = {
  overdue: '#F44747', // Red
  today: '#CE9178', // Orange
  soon: '#CCA700', // Yellow
  future: '#858585', // Gray
};

const PROXIMITY_CONFIG_KEYS: Record<Proximity, string> = {
  overdue: 'dueDateOverdue',
  today: 'dueDateToday',
  soon: 'dueDateSoon',
  future: 'dueDateFuture',
};

const DATE_BRACKET_RE = /\[(\d{4}-\d{2}-\d{2})\]/g;

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readConfig(section: string, key: string, fallback: string): string {
  return vscode.workspace.getConfiguration(section).get<string>(key, fallback) || fallback;
}

/**
 * Converts a #rrggbb hex color to an rgba() string with the given alpha.
 * Returns the original string unchanged for any format it can't parse.
 */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function createStaticTypes(): Record<StaticToken, vscode.TextEditorDecorationType> {
  const cfg = 'hexfield-text.colors';

  // Project tag gets pill styling: colored foreground, semi-transparent tinted
  // background, rounded border. before/after thin spaces add visual padding.
  // Note: before/after don't support borderRadius, so we use a small radius
  // on the main range only — the overall shape reads clearly as a tag chip.
  const tagColor = readConfig(cfg, STATIC_CONFIG_KEYS.projectTag, STATIC_DEFAULTS.projectTag);
  const tagBorder = hexToRgba(tagColor, 0.4);

  const result = {} as Record<StaticToken, vscode.TextEditorDecorationType>;

  result.projectTag = vscode.window.createTextEditorDecorationType({
    color: tagColor,
    borderRadius: '4px',
    border: `1px solid ${tagBorder}`,
  });

  // All other static tokens — foreground color only.
  for (const token of Object.keys(STATIC_DEFAULTS).filter(
    (k) => k !== 'projectTag',
  ) as StaticToken[]) {
    result[token] = vscode.window.createTextEditorDecorationType({
      color: readConfig(cfg, STATIC_CONFIG_KEYS[token], STATIC_DEFAULTS[token]),
    });
  }

  return result;
}

function createProximityTypes(): Record<Proximity, vscode.TextEditorDecorationType> {
  const cfg = 'hexfield-text.colors';
  const result = {} as Record<Proximity, vscode.TextEditorDecorationType>;
  for (const prox of Object.keys(PROXIMITY_DEFAULTS) as Proximity[]) {
    result[prox] = vscode.window.createTextEditorDecorationType({
      color: readConfig(cfg, PROXIMITY_CONFIG_KEYS[prox], PROXIMITY_DEFAULTS[prox]),
    });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Decorator
// ---------------------------------------------------------------------------

/**
 * Applies all Hexfield inline token decorations to hexfield-markdown editors.
 * Implements vscode.Disposable so all decoration types are cleaned up on
 * deactivation or color refresh.
 *
 * Call `refreshColors()` after a `hexfield-text.colors` configuration change,
 * then re-decorate any visible editors.
 */
export class DueDateDecorator implements vscode.Disposable {
  private staticTypes: Record<StaticToken, vscode.TextEditorDecorationType>;
  private proximityTypes: Record<Proximity, vscode.TextEditorDecorationType>;

  constructor() {
    this.staticTypes = createStaticTypes();
    this.proximityTypes = createProximityTypes();
  }

  /** Rebuild all decoration types from current configuration. */
  refreshColors(): void {
    for (const t of Object.values(this.staticTypes)) t.dispose();
    for (const t of Object.values(this.proximityTypes)) t.dispose();
    this.staticTypes = createStaticTypes();
    this.proximityTypes = createProximityTypes();
  }

  /** Scan the document and apply all Hexfield token decorations to the editor. */
  decorate(editor: vscode.TextEditor): void {
    const text = editor.document.getText();

    // --- Static tokens ---
    const staticRanges = {} as Record<StaticToken, vscode.Range[]>;
    for (const token of Object.keys(STATIC_PATTERNS) as StaticToken[]) {
      staticRanges[token] = [];
      const re = STATIC_PATTERNS[token];
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        staticRanges[token].push(
          new vscode.Range(
            editor.document.positionAt(m.index),
            editor.document.positionAt(m.index + m[0].length),
          ),
        );
      }
      editor.setDecorations(this.staticTypes[token], staticRanges[token]);
    }

    // --- Due date proximity tokens ---
    const proximityRanges = {} as Record<Proximity, vscode.Range[]>;
    for (const prox of Object.keys(PROXIMITY_DEFAULTS) as Proximity[]) {
      proximityRanges[prox] = [];
    }
    DATE_BRACKET_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = DATE_BRACKET_RE.exec(text)) !== null) {
      const prox = getProximity(m[1]);
      proximityRanges[prox].push(
        new vscode.Range(
          editor.document.positionAt(m.index),
          editor.document.positionAt(m.index + m[0].length),
        ),
      );
    }
    for (const prox of Object.keys(proximityRanges) as Proximity[]) {
      editor.setDecorations(this.proximityTypes[prox], proximityRanges[prox]);
    }
  }

  dispose(): void {
    for (const t of Object.values(this.staticTypes)) t.dispose();
    for (const t of Object.values(this.proximityTypes)) t.dispose();
  }
}
