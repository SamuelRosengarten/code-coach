import * as vscode from 'vscode';
import { appendErrorEvent, countOccurrencesWithinWindow } from '../storage/errorLogger';
import { ErrorEvent } from '../types';
import { selectNewDiagnostics } from './diagnosticsFilter';
import { getCoachingHint } from '../hints/rewordHint';
import { showHint, clearHint, clearHintsForType } from './hintDecorations';
import { isMuted, muteType } from '../storage/muteStore';
import { hasBeenSuggested, markSuggested } from '../storage/muteSuggestions';

// How long to wait, per file, after the *last* diagnostics change before
// actually processing them. VS Code re-reports diagnostics on nearly every
// keystroke while a line is mid-edit, so without this, Code Coach would try
// to log/hint on syntactically-broken intermediate states constantly.
const DEBOUNCE_MS = 1200;

// Keyed by file URI (as a string). loggedDiagnostics remembers which
// diagnostic "identities" (see diagnosticsFilter.ts) have already been
// logged for each file, across debounced passes. pendingTimers tracks the
// in-flight debounce timer per file so a new change can cancel and restart it.
const loggedDiagnostics = new Map<string, Set<string>>();
const pendingTimers = new Map<string, NodeJS.Timeout>();

/**
 * Subscribes to VS Code's diagnostics-changed event and, per file,
 * debounces bursts of changes down to one processStableDiagnostics() call
 * DEBOUNCE_MS after things settle.
 */
export function registerDiagnosticsListener(context: vscode.ExtensionContext): void {
	const disposable = vscode.languages.onDidChangeDiagnostics((event) => {
		for (const uri of event.uris) {
			const uriKey = uri.toString();

			// A new change for this file arrived before the previous
			// timer fired — restart the wait instead of processing yet.
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

/**
 * Does the actual work once a file's diagnostics have been stable for
 * DEBOUNCE_MS: figures out which errors are new (via selectNewDiagnostics),
 * logs each one, and — unless that error type is muted — fetches and shows
 * a coaching hint for it. Also clears the inline hint for any diagnostic
 * that's no longer present (i.e. the user fixed it).
 */
async function processStableDiagnostics(uri: vscode.Uri, context: vscode.ExtensionContext): Promise<void> {
	const uriKey = uri.toString();
	const errorDiagnostics = vscode.languages.getDiagnostics(uri).filter(
		(d) => d.severity === vscode.DiagnosticSeverity.Error
	);

	const previouslyLogged = loggedDiagnostics.get(uriKey) ?? new Set<string>();

	// Even after the debounce settles, don't log/hint a *new* diagnostic on
	// the exact line the cursor is currently on for this file — the user
	// is still likely mid-thought there. selectNewDiagnostics() defers it
	// (rather than dropping it) so it's picked up on a later pass once the
	// cursor moves elsewhere.
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

	// `removed` holds "errorType:line:column" identity strings (see
	// DiagnosticSelection.identity in diagnosticsFilter.ts) for mistakes
	// that are no longer present. Pull the line back out of each one —
	// searching for the *last* ":" first finds the line/column boundary,
	// then the *second-to-last* finds the errorType/line boundary — so the
	// inline hint decoration on that line can be cleared.
	for (const identity of removed) {
		const columnSeparator = identity.lastIndexOf(':');
		const lineSeparator = identity.lastIndexOf(':', columnSeparator - 1);
		const line = Number(identity.slice(lineSeparator + 1, columnSeparator));
		clearHint(uri, line);
	}

	// Fetching a coaching hint can be async (the "claude"/"local" providers
	// make a network call — see getCoachingHint()), so each hint is
	// collected as a promise here and all of them are awaited together
	// below, rather than one at a time.
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

/**
 * After showing a hint, checks whether that error type has come up often
 * enough recently (codeCoach.muteSuggestionThreshold times within
 * codeCoach.muteSuggestionWindowMinutes) to proactively ask the user if
 * they'd like it muted — so a mistake they've already learned from stops
 * nagging them. Each (language, errorType) pair is only ever suggested
 * once (tracked via muteSuggestions.ts), even if it keeps recurring.
 */
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