// This file is the extension's entry point — the one place VS Code itself
// calls into. It wires the other modules together but keeps almost no
// logic of its own; see README.md's "How it works" section for the flow.
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

// Called once by VS Code when the extension starts up (see
// activationEvents in package.json). Everything else in this file happens
// inside this function.
export function activate(context: vscode.ExtensionContext): CodeCoachApi {
  // Resolved once here, at activation, rather than on every diagnostic —
  // getStorageFolder() caches its result internally, but there's no need
  // to even call it more than once per activation.
  const storageFolder = getStorageFolder(context);
  const logFilePath = getLogFilePath(storageFolder);
  console.log(`[Code Coach] Logging error events to ${logFilePath}`);

  // Reads the two user-configurable settings from package.json
  // ("codeCoach.muteWindowMinutes" / "codeCoach.muteThreshold"), falling
  // back to the given default if the user hasn't changed them.
  const config = vscode.workspace.getConfiguration('codeCoach');
  const muteTracker = new MuteTracker(
    context.workspaceState,
    config.get<number>('muteWindowMinutes', 10) * 60 * 1000,
    config.get<number>('muteThreshold', 3)
  );

  // 1) Fires whenever VS Code's diagnostics (compiler/linter errors) change
  // for any file. This is what drives the console logging and the JSONL
  // progress log — see diagnosticsHandler.ts for the actual work.
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
        // `document?.languageId ?? TARGET_LANGUAGE_ID` reads as: use the
        // open document's language if we found one, otherwise fall back
        // to TypeScript. `?.` skips the property access entirely (instead
        // of throwing) when `document` is undefined; `??` then supplies
        // the fallback only if the left side is null/undefined.
        languageId: document?.languageId ?? TARGET_LANGUAGE_ID,
      });
    }
  });

  // 2) Supplies the hover text shown when the user's mouse rests over a
  // TypeScript error — see hoverProvider.ts for how the hint is chosen.
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

  // Registering both subscriptions here means VS Code will automatically
  // clean them up (unsubscribe) when the extension is deactivated.
  context.subscriptions.push(diagnosticsSubscription, hoverSubscription);

  return { storageFolder, logFilePath };
}

// Called by VS Code when the extension is shut down. There's nothing to
// clean up manually here since context.subscriptions handles it above.
export function deactivate(): void {}
