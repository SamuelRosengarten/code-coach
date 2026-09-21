import path from "path";
import * as fs from "fs";
import { getStorageDir } from './extension';
import { ErrorEvent } from './types';
export const LOG_FILE_NAME = 'errors.jsonl';

export function appendErrorEvent(event: ErrorEvent):void {
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