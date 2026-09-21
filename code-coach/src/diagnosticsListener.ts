import * as vscode from 'vscode';
import { appendErrorEvent } from './errorLogger';
import { ErrorEvent } from './types';

const DEBOUNCE_MS = 1200;
const loggedDiagnostics = new Map<string, Set<string>>();
const pendingTimers = new Map<string, NodeJS.Timeout>();

export function registerDiagnosticsListener(context: vscode.ExtensionContext): void {
	const disposable = vscode.languages.onDidChangeDiagnostics((event) => {
		for (const uri of event.uris) {
			const uriKey = uri.toString();

			const existingTimer = pendingTimers.get(uriKey);
			if (existingTimer) {
				clearTimeout(existingTimer);
			}

			const timer = setTimeout(() => {
				pendingTimers.delete(uriKey);
				processStableDiagnostics(uri);
			}, DEBOUNCE_MS);

			pendingTimers.set(uriKey, timer);
		}
	});

	context.subscriptions.push(disposable);
}

function processStableDiagnostics(uri: vscode.Uri): void {
	const uriKey = uri.toString();
	const diagnostics = vscode.languages.getDiagnostics(uri).filter(
		(d) => d.severity === vscode.DiagnosticSeverity.Error
	);

	const previouslyLogged = loggedDiagnostics.get(uriKey) ?? new Set<string>();
	const currentlyPresent = new Set<string>();

	const document = vscode.workspace.textDocuments.find(
		(doc) => doc.uri.toString() === uriKey
	);

	for (const diagnostic of diagnostics) {
		const errorType = resolveErrorType(diagnostic);
		const line = diagnostic.range.start.line + 1;
		const column = diagnostic.range.start.character;
		const identity = `${errorType}:${line}:${column}`;

		currentlyPresent.add(identity);

		if (!previouslyLogged.has(identity)) {
			const errorEvent: ErrorEvent = {
				errorType,
				filePath: vscode.workspace.asRelativePath(uri),
				line,
				language: document?.languageId ?? 'unknown',
				timestamp: new Date().toISOString(),
				muted: false,
			};

			appendErrorEvent(errorEvent);
			// TODO: show the gentle hint near the error here
		}
	}

	loggedDiagnostics.set(uriKey, currentlyPresent);
}

function resolveErrorType(diagnostic: vscode.Diagnostic): string {
	if (typeof diagnostic.code === 'object' && diagnostic.code !== null) {
		return String(diagnostic.code.value);
	}
	if (diagnostic.code !== undefined) {
		return String(diagnostic.code);
	}
	return diagnostic.source ?? 'unknown';
}