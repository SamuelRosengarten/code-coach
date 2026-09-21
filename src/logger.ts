import * as fs from 'fs';
import * as path from 'path';
import { ErrorEvent } from './schema';

export const LOG_FILE_NAME = 'error-log.jsonl';

export function getLogFilePath(storageFolder: string): string {
  return path.join(storageFolder, LOG_FILE_NAME);
}

/**
 * Builds one JSON object matching the ErrorEvent schema and appends it as a
 * single line to the log file (issue #14), creating the file on first write
 * if it doesn't exist yet (issue #15). Write failures (disk/permissions)
 * are caught so a logging problem never breaks the coaching experience
 * itself (issue #17) — they're reported to the console and swallowed.
 */
export function appendErrorEvent(logFilePath: string, event: ErrorEvent): boolean {
  try {
    if (!fs.existsSync(logFilePath)) {
      fs.writeFileSync(logFilePath, '');
    }
    fs.appendFileSync(logFilePath, JSON.stringify(event) + '\n');
    return true;
  } catch (err) {
    console.error('[Code Coach] Failed to write error log:', err);
    return false;
  }
}
