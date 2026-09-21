import * as vscode from 'vscode';
import { getStorageFolder } from './storage';
import { getLogFilePath } from './logger';
import { MuteTracker } from './muteTracker';
import { processDiagnostics } from './diagnosticsHandler';
import { buildHoverMessage } from './hoverProvider';
import { TARGET_LANGUAGE_ID } from './hints';

/** Public surface of the extension, used by the integration tests. */
export interface CodeCoachApi {
  storageFolder: string;
  logFilePath: string;
}

export function activate(context: vscode.ExtensionContext): CodeCoachApi {
  // Resolved once at activation (#19, #24) rather than on every diagnostic.
  const storageFolder = getStorageFolder(context);
  const logFilePath = getLogFilePath(storageFolder);
  console.log(`[Code Coach] Logging error events to ${logFilePath}`);

  const config = vscode.workspace.getConfiguration('codeCoach');
  const muteTracker = new MuteTracker(
    context.workspaceState,
    config.get<number>('muteWindowMinutes', 10) * 60 * 1000,
    config.get<number>('muteThreshold', 3)
  );

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

  return { storageFolder, logFilePath };
}

export function deactivate(): void {}
