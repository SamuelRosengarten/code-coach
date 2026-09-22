// Reads and writes the on-disk log of every mistake Code Coach has seen —
// one JSON object per line (a ".jsonl" file), appended to as events happen.
// This is the source of truth src/dashboard/stats.ts reads from to build
// the sidebar charts.
import path from 'path';
import * as fs from 'fs';
import { getStorageDir } from '../extension';
import { ErrorEvent } from '../types';

export const LOG_FILE_NAME = 'errors.jsonl';

/**
 * Appends one ErrorEvent as a line of JSON to the log file. Write failures
 * (disk full, permissions, etc.) are caught and logged to the console
 * rather than thrown, so a logging problem never breaks the coaching
 * experience itself.
 */
export function appendErrorEvent(event: ErrorEvent): void {
	try {
		const logFilePath = path.join(getStorageDir(), LOG_FILE_NAME);
		const line = JSON.stringify(event) + '\n';
		fs.appendFileSync(logFilePath, line, 'utf-8');
	} catch (error) {
		console.error('Code Coach: failed to log error event', error);
	}
}

export function getLogFilePath(): string {
	return path.join(getStorageDir(), LOG_FILE_NAME);
}

/** Total number of times this exact (language, errorType) pair has ever been logged. */
export function countOccurrences(language: string, errorType: string): number {
	return readErrorEvents().filter((e) => e.language === language && e.errorType === errorType).length;
}

/**
 * Same as countOccurrences(), but only counting events within the last
 * `windowMinutes` (relative to `now`, which defaults to the real current
 * time but can be overridden — e.g. in tests, or here to reuse one
 * "now" across a batch of related counts).
 */
export function countOccurrencesWithinWindow(language: string, errorType: string, windowMinutes: number, now: Date = new Date()): number {
	const cutoff = now.getTime() - windowMinutes * 60 * 1000;
	return readErrorEvents().filter((e) => {
		if (e.language !== language || e.errorType !== errorType) {
			return false;
		}
		const eventTime = new Date(e.timestamp).getTime();
		return !Number.isNaN(eventTime) && eventTime >= cutoff;
	}).length;
}

/**
 * Reads and parses every event in the log file. Returns an empty array
 * (rather than throwing) both when the file doesn't exist yet — a brand
 * new install — and when it can't be read for another reason; an
 * individual line that fails to parse as JSON is skipped and logged
 * rather than failing the whole read.
 */
export function readErrorEvents(): ErrorEvent[] {
	try {
		const content = fs.readFileSync(getLogFilePath(), 'utf-8');
		const events: ErrorEvent[] = [];
		for (const line of content.split('\n')) {
			if (line.trim().length === 0) {
				continue;
			}
			try {
				events.push(JSON.parse(line));
			} catch (error) {
				console.error('Code Coach: skipping malformed log line', error);
			}
		}
		return events;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
			console.error('Code Coach: failed to read error log', error);
		}
		return [];
	}
}
