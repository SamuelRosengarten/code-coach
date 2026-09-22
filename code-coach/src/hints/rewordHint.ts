import * as vscode from 'vscode';
import { getHint } from './hints';
import { rewordWithClaude } from './claudeHintClient';
import { rewordWithLocalModel } from './localHintClient';

const REWORD_TIMEOUT_MS = 6000;

/**
 * Picks the hint text to show for one error, per the codeCoach.hintProvider
 * setting:
 *   - "off" (default): just the built-in rule-based hint (getHint()), free
 *     and instant.
 *   - "claude" / "local": tries to have an LLM reword the *raw* compiler
 *     message into something more specific, racing it against a timeout so
 *     a slow/unreachable provider never blocks the hint indefinitely.
 *
 * Any failure along the AI path (network error, timeout, empty response)
 * silently falls back to the built-in hint — the user should never end up
 * with no hint at all just because rewording didn't work.
 */
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

/**
 * Wraps `promise` so it rejects after `ms` milliseconds if it hasn't
 * settled yet — a plain Promise has no built-in timeout, so this races it
 * against a timer instead. Whichever settles first (the real promise, or
 * the timer's rejection) wins; the other side's effect is just ignored
 * since a Promise can only resolve/reject once.
 */
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
