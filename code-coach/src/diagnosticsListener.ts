import * as vscode from 'vscode';
import { appendErrorEvent, countOccurrencesWithinWindow } from './errorLogger';
import { ErrorEvent } from './types';
import { selectNewDiagnostics } from './diagnosticsFilter';
import { getCoachingHint } from './rewordHint';
import { showHint, clearHint, clearHintsForType } from './hintDecorations';
import { isMuted, muteType } from './muteStore';
import { hasBeenSuggested, markSuggested } from './muteSuggestions';

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
				void processStableDiagnostics(uri, context);
			}, DEBOUNCE_MS);

			pendingTimers.set(uriKey, timer);
		}
	});

	context.subscriptions.push(disposable);
}

async function processStableDiagnostics(uri: vscode.Uri, context: vscode.ExtensionContext): Promise<void> {
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

	const hintTasks: Promise<void>[] = [];

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
			hintTasks.push(
				getCoachingHint(context, selection.errorType, language, selection.message).then((hint) => {
					showHint(uri, selection.line, hint, selection.errorType, language);
					maybeSuggestMute(language, selection.errorType, hint);
				})
			);
		}
	}

	loggedDiagnostics.set(uriKey, updatedLogged);
	await Promise.all(hintTasks);
}

function maybeSuggestMute(language: string, errorType: string, hintText: string): void {
	if (isMuted(language, errorType) || hasBeenSuggested(language, errorType)) {
		return;
	}

	const config = vscode.workspace.getConfiguration('codeCoach');
	const threshold = config.get<number>('muteSuggestionThreshold', 20);
	const windowMinutes = config.get<number>('muteSuggestionWindowMinutes', 5);
	const seenCount = countOccurrencesWithinWindow(language, errorType, windowMinutes);
	if (seenCount < threshold) {
		return;
	}

	markSuggested(language, errorType);

	vscode.window
		.showInformationMessage(
			`Code Coach noticed this hint ${seenCount} times in the last ${windowMinutes} min: "${hintText}". Mute it?`,
			'Mute',
			'Keep Showing'
		)
		.then((choice) => {
			if (choice === 'Mute') {
				muteType(language, errorType);
				clearHintsForType(language, errorType);
			}
		});
}