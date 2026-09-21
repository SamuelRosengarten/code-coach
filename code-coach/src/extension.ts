import * as vscode from 'vscode';
import * as fs from 'fs';
import { registerDiagnosticsListener } from './diagnosticsListener';
import { registerHintDecorations } from './hintDecorations';
import { StatsViewProvider } from './statsViewProvider';

let cachedStoragePath: string | undefined;

export function activate(context: vscode.ExtensionContext){
    const storageDir = initStorage(context);
	registerHintDecorations(context);
	registerDiagnosticsListener(context);

	const statsViewProvider = new StatsViewProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(StatsViewProvider.viewType, statsViewProvider),
		vscode.commands.registerCommand('codeCoach.refreshStats', () => statsViewProvider.refresh()),
		statsViewProvider
	);

    console.log(`Code Coach storage directory: ${storageDir}`);
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