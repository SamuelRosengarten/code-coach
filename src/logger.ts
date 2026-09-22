import * as fs from 'fs';
import * as path from 'path';
import { ErrorEvent } from './schema';

export const LOG_FILE_NAME = 'error-log.jsonl';

export function getLogFilePath(storageFolder: string): string {
  return path.join(storageFolder, LOG_FILE_NAME);
}

/**
 * Turns one ErrorEvent into a line of JSON and appends it to the log file,
 * creating the file on first write if it doesn't exist yet. Write failures
 * (disk full, no permissions, etc.) are caught so a logging problem never
 * breaks the coaching experience itself — they're reported to the console
 * and swallowed rather than thrown.
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
