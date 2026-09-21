import * as vscode from 'vscode';
import * as fs from 'fs';
import { registerDiagnosticsListener } from './diagnosticsListener';

let cachedStoragePath: string | undefined;

export function activate(context: vscode.ExtensionContext){
    const storageDir = initStorage(context);
	registerDiagnosticsListener(context);
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