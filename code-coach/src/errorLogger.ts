import path from "path";
import * as fs from "fs";
import { getStorageDir } from './extension';
import { ErrorEvent } from './types';

const LOG_FILE_NAME = 'errors.jsonl';

export function appendErrorEvent(event: ErrorEvent):void {
    try {
        const logFilePath = path.join(getStorageDir(), LOG_FILE_NAME);
        const line = JSON.stringify(event) + '\n';
        fs.appendFileSync(logFilePath, line, 'utf-8');
    } catch (error) {
		console.error('Code Coach: failed to log error event', error);
    }
}