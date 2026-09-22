// Optional AI hint provider #1: rewords the raw compiler/linter message
// using Anthropic's Claude API, with the user's own API key. Only used
// when codeCoach.hintProvider is "claude" — see ../rewordHint.ts, which
// picks between this and localHintClient.ts (or neither).
import * as vscode from 'vscode';
import Anthropic from '@anthropic-ai/sdk';

const SECRET_KEY = 'codeCoach.anthropicApiKey';
const MODEL = 'claude-haiku-4-5';

const SYSTEM_PROMPT =
	"You are a patient coding coach. Rewrite the compiler or linter error you're given as one short, " +
	'encouraging, plain-language sentence that helps a learner understand what went wrong and what to check. ' +
	'No jargon dump, no code fences, no quotes around the sentence. Keep it under 30 words.';

// Caches the Anthropic client alongside the key it was built with, so a
// key change (via setApiKey/clearApiKey below) invalidates the cache —
// getClient() only reuses cachedClient.client when cachedClient.key still
// matches what's currently stored.
let cachedClient: { key: string; client: Anthropic } | undefined;

/** Backs the "Code Coach: Set Claude API Key" command. */
export async function setApiKey(context: vscode.ExtensionContext): Promise<void> {
	const key = await vscode.window.showInputBox({
		title: 'Code Coach: Anthropic API Key',
		prompt: 'Paste your Anthropic API key (from console.anthropic.com). Stored securely on this machine only.',
		password: true,
		ignoreFocusOut: true,
	});
	if (!key) {
		return;
	}
	await context.secrets.store(SECRET_KEY, key.trim());
	cachedClient = undefined;
	vscode.window.showInformationMessage('Code Coach: Anthropic API key saved.');
}

/** Backs the "Code Coach: Clear Claude API Key" command. */
export async function clearApiKey(context: vscode.ExtensionContext): Promise<void> {
	await context.secrets.delete(SECRET_KEY);
	cachedClient = undefined;
	vscode.window.showInformationMessage('Code Coach: Anthropic API key removed.');
}

/**
 * Returns a ready-to-use Anthropic client if the user has stored a key
 * (via `context.secrets`, VS Code's encrypted per-machine secret store),
 * or undefined if they haven't set one up yet.
 */
async function getClient(context: vscode.ExtensionContext): Promise<Anthropic | undefined> {
	const key = await context.secrets.get(SECRET_KEY);
	if (!key) {
		return undefined;
	}
	if (cachedClient?.key === key) {
		return cachedClient.client;
	}
	const client = new Anthropic({ apiKey: key });
	cachedClient = { key, client };
	return client;
}

/**
 * Sends the raw error message to Claude and returns its reworded version,
 * or undefined if no API key is set (rewordHint.ts then falls back to the
 * built-in hint). A rejected/expired key is reported to the user directly;
 * any other API error is re-thrown for withTimeout()/getCoachingHint() in
 * rewordHint.ts to catch and fall back on.
 */
export async function rewordWithClaude(
	context: vscode.ExtensionContext,
	rawMessage: string,
	errorType: string,
	language: string
): Promise<string | undefined> {
	const client = await getClient(context);
	if (!client) {
		vscode.window.showWarningMessage(
			'Code Coach: no Anthropic API key set. Run "Code Coach: Set Claude API Key", or switch codeCoach.hintProvider to "local" or "off".'
		);
		return undefined;
	}

	try {
		const response = await client.messages.create({
			model: MODEL,
			max_tokens: 200,
			system: SYSTEM_PROMPT,
			messages: [
				{
					role: 'user',
					content: `Language: ${language}\nError type: ${errorType}\nRaw error message: ${rawMessage}`,
				},
			],
		});

		const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === 'text');
		return textBlock?.text.trim();
	} catch (error) {
		if (error instanceof Anthropic.AuthenticationError) {
			vscode.window.showWarningMessage(
				'Code Coach: Anthropic API key was rejected. Run "Code Coach: Set Claude API Key" to update it.'
			);
			return undefined;
		}
		throw error;
	}
}
