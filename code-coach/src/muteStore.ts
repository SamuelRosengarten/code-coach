import * as fs from 'fs';
import * as path from 'path';
import { getStorageDir } from './extension';

export const MUTE_FILE_NAME = 'muted.json';

function muteKey(language: string, errorType: string): string {
	return `${language}:${errorType}`;
}

function getMuteFilePath(): string {
	return path.join(getStorageDir(), MUTE_FILE_NAME);
}

function readMutedTypes(): Set<string> {
	try {
		const content = fs.readFileSync(getMuteFilePath(), 'utf-8');
		const parsed: unknown = JSON.parse(content);
		return new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []);
	} catch {
		return new Set();
	}
}

export function isMuted(language: string, errorType: string): boolean {
	return readMutedTypes().has(muteKey(language, errorType));
}

export function muteType(language: string, errorType: string): void {
	const muted = readMutedTypes();
	muted.add(muteKey(language, errorType));
	try {
		fs.writeFileSync(getMuteFilePath(), JSON.stringify([...muted]), 'utf-8');
	} catch (error) {
		console.error('Code Coach: failed to persist muted error type', error);
	}
}
