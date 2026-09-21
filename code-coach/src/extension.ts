import * as vscode from 'vscode';
import * as fs from 'fs';
import { registerDiagnosticsListener } from './diagnosticsListener';
import { registerHintDecorations, clearHintsForType } from './hintDecorations';
import { muteType, unmuteType, listMutedTypes } from './muteStore';
import { formatLanguageLabel } from './stats';
import { StatsViewProvider } from './statsViewProvider';
import { setApiKey, clearApiKey } from './claudeHintClient';

let cachedStoragePath: string | undefined;

export function activate(context: vscode.ExtensionContext){
    const storageDir = initStorage(context);
	registerHintDecorations(context);
	registerDiagnosticsListener(context);

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

export function initStorage(context: vscode.ExtensionContext): string {

    const storagePath = context.globalStorageUri.fsPath;
    if(!fs.existsSync(storagePath)){
        fs.mkdirSync(storagePath, {recursive:true});
    }
    cachedStoragePath = storagePath;
    return cachedStoragePath;
}

export function getStorageDir(): string{
    if (!cachedStoragePath) {
        throw new Error('Storage not initialized. Call initStorage(context) first.');
    }
    return cachedStoragePath;
}