import * as vscode from 'vscode';
import { getHint } from './hints';
import { rewordWithClaude } from './claudeHintClient';
import { rewordWithLocalModel } from './localHintClient';

const REWORD_TIMEOUT_MS = 6000;

export async function getCoachingHint(
	context: vscode.ExtensionContext,
	errorType: string,
	language: string,
	rawMessage: string
): Promise<string> {
	const fallback = getHint(errorType, language);
	const provider = vscode.workspace.getConfiguration('codeCoach').get<string>('hintProvider', 'off');

	if (provider !== 'claude' && provider !== 'local') {
		return fallback;
	}

	try {
		const reworded = await withTimeout(
			provider === 'claude'
				? rewordWithClaude(context, rawMessage, errorType, language)
				: rewordWithLocalModel(rawMessage, errorType, language),
			REWORD_TIMEOUT_MS
		);
		return reworded && reworded.length > 0 ? reworded : fallback;
	} catch (error) {
		console.warn('Code Coach: hint rewording failed, using the built-in hint instead.', error);
		return fallback;
	}
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error('Reword request timed out')), ms);
		promise.then(
			(value) => {
				clearTimeout(timer);
				resolve(value);
			},
			(error) => {
				clearTimeout(timer);
				reject(error);
			}
		);
	});
}
