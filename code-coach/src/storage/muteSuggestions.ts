// Remembers which (language, errorType) pairs Code Coach has already
// *offered* to mute (see maybeSuggestMute() in ../diagnostics/diagnosticsListener.ts),
// so the same "mute this?" prompt isn't repeated every time the threshold
// is hit again — independent from muteStore.ts, which tracks what's
// actually muted right now.
import * as fs from 'fs';
import * as path from 'path';
import { getStorageDir } from '../extension';

export const SUGGESTED_FILE_NAME = 'mute-suggested.json';

interface SuggestedType {
	language: string;
	errorType: string;
}

function getSuggestedFilePath(): string {
	return path.join(getStorageDir(), SUGGESTED_FILE_NAME);
}

function isSuggestedType(value: unknown): value is SuggestedType {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as SuggestedType).language === 'string' &&
		typeof (value as SuggestedType).errorType === 'string'
	);
}

function readSuggestedTypes(): SuggestedType[] {
	try {
		const content = fs.readFileSync(getSuggestedFilePath(), 'utf-8');
		const parsed: unknown = JSON.parse(content);
		return Array.isArray(parsed) ? parsed.filter(isSuggestedType) : [];
	} catch {
		return [];
	}
}

function writeSuggestedTypes(types: SuggestedType[]): void {
	try {
		fs.writeFileSync(getSuggestedFilePath(), JSON.stringify(types), 'utf-8');
	} catch (error) {
		console.error('Code Coach: failed to persist mute suggestion state', error);
	}
}

export function hasBeenSuggested(language: string, errorType: string): boolean {
	return readSuggestedTypes().some((s) => s.language === language && s.errorType === errorType);
}

export function markSuggested(language: string, errorType: string): void {
	const types = readSuggestedTypes();
	if (types.some((s) => s.language === language && s.errorType === errorType)) {
		return;
	}
	types.push({ language, errorType });
	writeSuggestedTypes(types);
}
