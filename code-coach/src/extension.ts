// This file is the extension's entry point — the one place VS Code itself
// calls into. It wires the feature folders below together (diagnostics,
// hints, storage, dashboard) but keeps almost no logic of its own; see
// README.md's "How it works" section for the full data-flow diagram.
import * as vscode from 'vscode';
import * as fs from 'fs';
import { registerDiagnosticsListener } from './diagnostics/diagnosticsListener';
import { registerHintDecorations, clearHintsForType } from './diagnostics/hintDecorations';
import { muteType, unmuteType, listMutedTypes } from './storage/muteStore';
import { formatLanguageLabel } from './dashboard/stats';
import { StatsViewProvider } from './dashboard/statsViewProvider';
import { setApiKey, clearApiKey } from './hints/claudeHintClient';

// Module-level, so every other file that calls getStorageDir() below shares
// the same cached path instead of re-deriving it. There's only ever one
// running instance of the extension per VS Code window, so one cache is fine.
let cachedStoragePath: string | undefined;

// Called once by VS Code when the extension starts up (see
// activationEvents in package.json).
export function activate(context: vscode.ExtensionContext) {
	const storageDir = initStorage(context);
	registerHintDecorations(context);
	registerDiagnosticsListener(context);

	// The sidebar webview panel (Activity Bar → Code Coach → Stats).
	const statsViewProvider = new StatsViewProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(StatsViewProvider.viewType, statsViewProvider),
		vscode.commands.registerCommand('codeCoach.refreshStats', () => statsViewProvider.refresh()),
		vscode.commands.registerCommand('codeCoach.dismissHint', (language: string, errorType: string) => {
			muteType(language, errorType);
			clearHintsForType(language, errorType);
		}),
		vscode.commands.registerCommand('codeCoach.manageMutedHints', () => manageMutedHints()),
		vscode.commands.registerCommand('codeCoach.setApiKey', () => setApiKey(context)),
		vscode.commands.registerCommand('codeCoach.clearApiKey', () => clearApiKey(context)),
		statsViewProvider
	);

	console.log(`Code Coach storage directory: ${storageDir}`);
}

/**
 * Backs the "Code Coach: Manage Muted Hints" command: shows every currently
 * muted hint type as a checked item in a multi-select picker, and unmutes
 * whichever ones the user unchecks.
 */
async function manageMutedHints(): Promise<void> {
	const muted = listMutedTypes();
	if (muted.length === 0) {
		vscode.window.showInformationMessage('Code Coach: no hints are currently muted.');
		return;
	}

	const items = muted.map((m) => ({
		label: `${formatLanguageLabel(m.language)}: ${m.errorType}`,
		picked: true,
		muted: m,
	}));

	const selected = await vscode.window.showQuickPick(items, {
		canPickMany: true,
		placeHolder: 'Uncheck a hint to turn it back on',
	});
	if (!selected) {
		return;
	}

	const stillMuted = new Set(selected.map((item) => item.muted));
	for (const item of items) {
		if (!stillMuted.has(item.muted)) {
			unmuteType(item.muted.language, item.muted.errorType);
		}
	}
}

/**
 * Resolves the on-disk folder Code Coach stores its data in (the error
 * log, mute list, etc.), creating it if this is the first run, and caches
 * the result for getStorageDir() below to hand out.
 */
export function initStorage(context: vscode.ExtensionContext): string {
	const storagePath = context.globalStorageUri.fsPath;
	if (!fs.existsSync(storagePath)) {
		fs.mkdirSync(storagePath, { recursive: true });
	}
	cachedStoragePath = storagePath;
	return cachedStoragePath;
}

/**
 * Read-only access to the storage path resolved by initStorage() above.
 * Other modules (errorLogger, muteStore, muteSuggestions) call this instead
 * of taking their own ExtensionContext, so they can stay simple functions.
 */
export function getStorageDir(): string {
	if (!cachedStoragePath) {
		throw new Error('Storage not initialized. Call initStorage(context) first.');
	}
	return cachedStoragePath;
}
