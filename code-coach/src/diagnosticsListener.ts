import * as vscode from 'vscode';
import { appendErrorEvent } from './errorLogger';
import { ErrorEvent } from './types';
import { selectNewDiagnostics } from './diagnosticsFilter';
import { getHint } from './hints';
import { showHint, clearHint } from './hintDecorations';
import { isMuted } from './muteStore';

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
	const errorDiagnostics = vscode.languages.getDiagnostics(uri).filter(
		(d) => d.severity === vscode.DiagnosticSeverity.Error
	);

	const previouslyLogged = loggedDiagnostics.get(uriKey) ?? new Set<string>();

	const activeEditor = vscode.window.activeTextEditor;
	const activeLine = activeEditor?.document.uri.toString() === uriKey
		? activeEditor.selection.active.line + 1
		: undefined;

	const { toLog, updatedLogged, removed } = selectNewDiagnostics(
		errorDiagnostics,
		previouslyLogged,
		(selection) => selection.line === activeLine
	);

	const document = vscode.workspace.textDocuments.find(
		(doc) => doc.uri.toString() === uriKey
	);
	const language = document?.languageId ?? 'unknown';

	for (const identity of removed) {
		const columnSeparator = identity.lastIndexOf(':');
		const lineSeparator = identity.lastIndexOf(':', columnSeparator - 1);
		const line = Number(identity.slice(lineSeparator + 1, columnSeparator));
		clearHint(uri, line);
	}

	for (const selection of toLog) {
		const muted = isMuted(language, selection.errorType);
		const errorEvent: ErrorEvent = {
			errorType: selection.errorType,
			filePath: vscode.workspace.asRelativePath(uri),
			line: selection.line,
			language,
			timestamp: new Date().toISOString(),
			muted,
		};

		appendErrorEvent(errorEvent);
		if (!muted) {
			showHint(uri, selection.line, getHint(selection.errorType, language), selection.errorType, language);
		}
	}

	loggedDiagnostics.set(uriKey, updatedLogged);
}