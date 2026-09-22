// Persists which (language, errorType) pairs the user has muted, as a JSON
// file — checked by diagnosticsListener.ts before showing a hint, and
// managed via the "Code Coach: Manage Muted Hints" command / the
// dashboard's mute buttons.
import * as fs from 'fs';
import * as path from 'path';
import { getStorageDir } from '../extension';

export const MUTE_FILE_NAME = 'muted.json';

export interface MutedType {
	language: string;
	errorType: string;
}

function getMuteFilePath(): string {
	return path.join(getStorageDir(), MUTE_FILE_NAME);
}

/** Type predicate: confirms `value` (e.g. something just parsed from JSON) actually has the MutedType shape. */
function isMutedType(value: unknown): value is MutedType {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as MutedType).language === 'string' &&
		typeof (value as MutedType).errorType === 'string'
	);
}

function readMutedTypes(): MutedType[] {
	try {
		const content = fs.readFileSync(getMuteFilePath(), 'utf-8');
		const parsed: unknown = JSON.parse(content);
		return Array.isArray(parsed) ? parsed.filter(isMutedType) : [];
	} catch {
		return [];
	}
}

function writeMutedTypes(types: MutedType[]): void {
	try {
		fs.writeFileSync(getMuteFilePath(), JSON.stringify(types), 'utf-8');
	} catch (error) {
		console.error('Code Coach: failed to persist muted error types', error);
	}
}

export function isMuted(language: string, errorType: string): boolean {
	return readMutedTypes().some((m) => m.language === language && m.errorType === errorType);
}

export function muteType(language: string, errorType: string): void {
	const types = readMutedTypes();
	if (types.some((m) => m.language === language && m.errorType === errorType)) {
		return;
	}
	types.push({ language, errorType });
	writeMutedTypes(types);
}

export function unmuteType(language: string, errorType: string): void {
	const types = readMutedTypes().filter((m) => !(m.language === language && m.errorType === errorType));
	writeMutedTypes(types);
}

export function listMutedTypes(): MutedType[] {
	return readMutedTypes();
}
