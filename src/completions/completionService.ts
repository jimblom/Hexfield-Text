import * as vscode from 'vscode';

/**
 * Interface for a focused, single-purpose completion provider.
 *
 * Each Hexfield token type that supports autocomplete implements this interface.
 * The service collects all registered providers, calls each on every completion
 * request, and merges the results. Providers that don't match the current context
 * return an empty array — they're responsible for their own trigger detection.
 *
 * To add a new provider:
 *   1. Implement HexfieldSubProvider in a new file under src/completions/providers/
 *   2. Pass an instance to HexfieldCompletionService in extension.ts
 *   3. Declare any new trigger characters (they'll be registered automatically)
 */
export interface HexfieldSubProvider {
  /** Human-readable name, for documentation and future config keying. */
  readonly name: string;
  /** Characters that may trigger this provider's completions. */
  readonly triggerCharacters: readonly string[];
  /** Return matching completion items, or [] if this context isn't relevant. */
  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.CompletionItem[];
}

/**
 * Central completion coordinator for hexfield-markdown files.
 *
 * Registered once with VS Code as the CompletionItemProvider for the language.
 * Delegates to each registered HexfieldSubProvider and merges their results.
 * Trigger characters are derived automatically from the active providers.
 *
 * Usage in extension.ts:
 *
 *   const service = new HexfieldCompletionService([
 *     new ProjectTagProvider(),
 *     // new EstimateProvider(),   // add when ready
 *     // new DateProvider(),       // add when ready
 *   ]);
 *
 *   context.subscriptions.push(
 *     vscode.languages.registerCompletionItemProvider(
 *       HEXFIELD_SELECTOR,
 *       service,
 *       ...service.triggerCharacters,
 *     ),
 *   );
 */
export class HexfieldCompletionService implements vscode.CompletionItemProvider {
  private readonly providers: HexfieldSubProvider[];

  constructor(providers: HexfieldSubProvider[]) {
    this.providers = providers;
  }

  /** Union of all trigger characters across registered providers. */
  get triggerCharacters(): string[] {
    return [...new Set(this.providers.flatMap((p) => [...p.triggerCharacters]))];
  }

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.CompletionItem[] {
    return this.providers.flatMap((p) => p.provideItems(document, position));
  }
}
