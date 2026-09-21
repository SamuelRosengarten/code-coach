import * as vscode from 'vscode';
import { appendErrorEvent } from './errorLogger';
import { ErrorEvent } from './types';

export function registerDiagnosticsListener(context: vscode.ExtensionContext): void{
    const disposable = vscode.languages.onDidChangeDiagnostics((event) =>{
        for(const uri of event.uris){
            const diagnostics = vscode.languages.getDiagnostics(uri);

            for(const diagnostic of diagnostics){
                if(diagnostic.severity !== vscode.DiagnosticSeverity.Error){
                    continue;
                }

                const document = vscode.workspace.textDocuments.find(
                    (doc) => doc.uri.toString() === uri.toString()
                );  

                const errorEvent: ErrorEvent = {
                    errorType: resolveErrorType(diagnostic),
                    filePath: vscode.workspace.asRelativePath(uri),
                    line: diagnostic.range.start.line + 1,
                    language: document?.languageId ?? 'unknown',
                    timestamp: new Date().toISOString(),
                    muted: false
                };
                appendErrorEvent(errorEvent);


  				// TODO: show the gentle hint near the error here (hint-display logic)
            }
        }
    });
}

function resolveErrorType(diagnostic: vscode.Diagnostic): string{
    if(typeof diagnostic.code === 'object' && diagnostic.code !== null){
        return String(diagnostic.code.value);
    }
    if(diagnostic.code !== undefined){
        return String(diagnostic.code);
    }
    return diagnostic.source ?? 'unknown';
}
