import * as vscode from 'vscode';
import { getStorageFolder } from './storage';
import { getLogFilePath } from './logger';
import { MuteTracker } from './muteTracker';
import { processDiagnostics } from './diagnosticsHandler';
import { buildHoverMessage } from './hoverProvider';
import { TARGET_LANGUAGE_ID } from './hints';

export function activate(context: vscode.ExtensionContext): void {
  // Resolved once at activation (#19, #24) rather than on every diagnostic.
  const storageFolder = getStorageFolder(context);
  const logFilePath = getLogFilePath(storageFolder);
  console.log(`[Code Coach] Logging error events to ${logFilePath}`);

  const muteTracker = new MuteTracker(context.workspaceState);

  const diagnosticsSubscription = vscode.languages.onDidChangeDiagnostics((event) => {
    for (const uri of event.uris) {
      const diagnostics = vscode.languages.getDiagnostics(uri);
      if (diagnostics.length === 0) {
        continue;
      }
      const document = vscode.workspace.textDocuments.find(
        (doc) => doc.uri.toString() === uri.toString()
      );
      processDiagnostics(diagnostics, vscode.workspace.asRelativePath(uri, false), {
        logFilePath,
        muteTracker,
        languageId: document?.languageId ?? TARGET_LANGUAGE_ID,
      });
    }
  });

  const hoverSubscription = vscode.languages.registerHoverProvider(
    { language: TARGET_LANGUAGE_ID },
    {
      provideHover(document, position) {
        const diagnostics = vscode.languages.getDiagnostics(document.uri);
        const message = buildHoverMessage(
          diagnostics,
          { line: position.line, character: position.character },
          (errorType) => muteTracker.isMuted(errorType)
        );
        return message ? new vscode.Hover(message) : undefined;
      },
    }
  );

  context.subscriptions.push(diagnosticsSubscription, hoverSubscription);
}

export function deactivate(): void {}
