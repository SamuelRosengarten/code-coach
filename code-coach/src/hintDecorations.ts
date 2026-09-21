import * as vscode from 'vscode';

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
}

const hintsByUri = new Map<string, ActiveHint[]>();

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

export function showHint(uri: vscode.Uri, line: number, message: string): void {
	const uriKey = uri.toString();
	const hints = (hintsByUri.get(uriKey) ?? []).filter((h) => h.line !== line);
	hints.push({ line, message });
	hintsByUri.set(uriKey, hints);
	applyDecorationsForUri(uri);
}

export function clearHint(uri: vscode.Uri, line: number): void {
	const uriKey = uri.toString();
	const hints = hintsByUri.get(uriKey);
	if (!hints) {
		return;
	}
	hintsByUri.set(uriKey, hints.filter((h) => h.line !== line));
	applyDecorationsForUri(uri);
}

function applyDecorationsForUri(uri: vscode.Uri): void {
	const uriKey = uri.toString();
	for (const editor of vscode.window.visibleTextEditors) {
		if (editor.document.uri.toString() === uriKey) {
			applyDecorations(editor);
		}
	}
}

function applyDecorations(editor: vscode.TextEditor): void {
	const hints = hintsByUri.get(editor.document.uri.toString()) ?? [];
	const options: vscode.DecorationOptions[] = [];

	for (const hint of hints) {
		const lineIndex = hint.line - 1;
		if (lineIndex < 0 || lineIndex >= editor.document.lineCount) {
			continue;
		}
		const lineLength = editor.document.lineAt(lineIndex).text.length;
		options.push({
			range: new vscode.Range(lineIndex, lineLength, lineIndex, lineLength),
			renderOptions: { after: { contentText: `💡 ${hint.message}` } },
		});
	}

	editor.setDecorations(decorationType, options);
}
