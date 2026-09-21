import { DiagnosticCodeLike, errorTypeFor, getHint } from './hints';
import { MuteTracker } from './muteTracker';
import { appendErrorEvent } from './logger';
import { ErrorEvent } from './schema';

export interface DiagnosticForProcessing extends DiagnosticCodeLike {
  range: { start: { line: number } };
}

export interface ProcessDiagnosticsDeps {
  logFilePath: string;
  muteTracker: MuteTracker;
  languageId: string;
  now?: () => number;
  log?: (...args: unknown[]) => void;
}

/**
 * Handles one batch of diagnostics for a single file: logs each one to the
 * console to confirm they're being received (issue #4), and for the one
 * coached error type, records the occurrence for mute tracking (issue #7)
 * and appends an event to the JSONL log via the logging helper (issue #16).
 *
 * Kept free of any 'vscode' API calls so it can be unit tested directly —
 * the extension's onDidChangeDiagnostics handler is a thin wrapper that
 * fetches diagnostics from vscode and hands them to this function.
 */
export function processDiagnostics(
  diagnostics: readonly DiagnosticForProcessing[],
  relativeFilePath: string,
  deps: ProcessDiagnosticsDeps
): void {
  const log = deps.log ?? console.log;
  const now = deps.now ?? Date.now;

  for (const diagnostic of diagnostics) {
    const line = diagnostic.range.start.line + 1;
    log(`[Code Coach] ${relativeFilePath}:${line} — ${diagnostic.message}`);

    const hint = getHint(diagnostic);
    if (!hint) {
      continue; // only the one configured error type is coached right now
    }

    const errorType = errorTypeFor(diagnostic);
    const muted = deps.muteTracker.recordAndShouldMute(errorType, now());

    const event: ErrorEvent = {
      errorType,
      file: relativeFilePath,
      line,
      language: deps.languageId,
      timestamp: new Date(now()).toISOString(),
      muted,
    };
    appendErrorEvent(deps.logFilePath, event);
  }
}
