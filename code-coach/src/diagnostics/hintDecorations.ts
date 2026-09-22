// Renders each active hint as inline italic text after the end of its
// error's line (the 💡 "ghost text" the README describes), with a hover
// tooltip offering to dismiss it. diagnosticsListener.ts is what decides
// *when* a hint should appear/disappear (showHint/clearHint below); this
// file only owns turning that state into an actual editor decoration.
import * as vscode from 'vscode';

// One reusable decoration "type" (style) shared by every hint — VS Code's
// decoration API separates *style* (this) from *where to apply it* (the
// DecorationOptions passed to setDecorations() in applyDecorations below).
const decorationType = vscode.window.createTextEditorDecorationType({
	after: {
		margin: '0 0 0 1rem',
		color: new vscode.ThemeColor('editorCodeLens.foreground'),
		fontStyle: 'italic',
	},
});

interface ActiveHint {
	line: number;
	message: string;
	errorType: string;
	language: string;
}

// Every hint currently showing, grouped by file URI (as a string) since a
// hint is only meaningful in the context of one open file.
const hintsByUri = new Map<string, ActiveHint[]>();

/**
 * Registers the decoration type for cleanup, and keeps hints correctly
 * rendered as editors are switched between and closed.
 */
export function registerHintDecorations(context: vscode.ExtensionContext): void {
	context.subscriptions.push(
		decorationType,
		vscode.window.onDidChangeVisibleTextEditors((editors) => {
			for (const editor of editors) {
				applyDecorations(editor);
			}
		}),
		vscode.workspace.onDidCloseTextDocument((doc) => {
			hintsByUri.delete(doc.uri.toString());
		})
	);
}

/** Shows (or replaces) the hint on one line of one file. */
export function showHint(uri: vscode.Uri, line: number, message: string, errorType: string, language: string): void {
	const uriKey = uri.toString();
	const hints = (hintsByUri.get(uriKey) ?? []).filter((h) => h.line !== line);
	hints.push({ line, message, errorType, language });
	hintsByUri.set(uriKey, hints);
	applyDecorationsForUri(uri);
}

/** Removes the hint on one line of one file, e.g. because the mistake there was fixed. */
export function clearHint(uri: vscode.Uri, line: number): void {
	const uriKey = uri.toString();
	const hints = hintsByUri.get(uriKey);
	if (!hints) {
		return;
	}
	hintsByUri.set(uriKey, hints.filter((h) => h.line !== line));
	applyDecorationsForUri(uri);
}

/** Removes every currently-shown hint for one (language, errorType) pair, across all open files — used when the user mutes that type. */
export function clearHintsForType(language: string, errorType: string): void {
	for (const [uriKey, hints] of hintsByUri) {
		const filtered = hints.filter((h) => !(h.language === language && h.errorType === errorType));
		if (filtered.length !== hints.length) {
			hintsByUri.set(uriKey, filtered);
			applyDecorationsForUri(vscode.Uri.parse(uriKey));
		}
	}
}

/** Re-renders decorations in every currently-visible editor showing this file (there can be more than one, e.g. split-view). */
function applyDecorationsForUri(uri: vscode.Uri): void {
	const uriKey = uri.toString();
	for (const editor of vscode.window.visibleTextEditors) {
		if (editor.document.uri.toString() === uriKey) {
			applyDecorations(editor);
		}
	}
}

/**
 * Rebuilds and applies the full set of decorations for one editor from
 * `hintsByUri`. VS Code's decoration API is "replace everything" rather
 * than "add/remove one" — every call here passes the *complete* current
 * list of hints for this file, which is why showHint/clearHint above
 * always call back into this rather than trying to patch the display
 * incrementally.
 */
function applyDecorations(editor: vscode.TextEditor): void {
	const hints = hintsByUri.get(editor.document.uri.toString()) ?? [];
	const options: vscode.DecorationOptions[] = [];

	for (const hint of hints) {
		const lineIndex = hint.line - 1; // hint.line is 1-based; vscode.Range is 0-based
		if (lineIndex < 0 || lineIndex >= editor.document.lineCount) {
			continue; // the file shrank since this hint was recorded
		}
		const lineLength = editor.document.lineAt(lineIndex).text.length;
		// Encodes [language, errorType] as the argument to the
		// codeCoach.dismissHint command (registered in extension.ts),
		// invoked by the hoverMessage's Markdown command-link below.
		const dismissArgs = encodeURIComponent(JSON.stringify([hint.language, hint.errorType]));
		const hoverMessage = new vscode.MarkdownString(
			`${hint.message}\n\n[Don't show this hint again](command:codeCoach.dismissHint?${dismissArgs})`
		);
		// Command links in Markdown are disabled by default (they could
		// otherwise be a security risk from untrusted content); this
		// MarkdownString is entirely built from our own data, so it's
		// safe to opt in.
		hoverMessage.isTrusted = true;
		options.push({
			// A zero-width range positioned right after the last character
			// of the line — this is what makes the hint render as "ghost
			// text" trailing the line instead of replacing any of it.
			range: new vscode.Range(lineIndex, lineLength, lineIndex, lineLength),
			renderOptions: { after: { contentText: `💡 ${hint.message}` } },
			hoverMessage,
		});
	}

	editor.setDecorations(decorationType, options);
}
