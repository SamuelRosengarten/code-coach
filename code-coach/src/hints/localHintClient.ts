// Optional AI hint provider #2: rewords the raw compiler/linter message
// using a model running locally via Ollama — no account, no key, no
// per-use cost. Only used when codeCoach.hintProvider is "local"; see
// ../rewordHint.ts for how this is chosen over claudeHintClient.ts.
import * as vscode from 'vscode';

/** Shape of Ollama's /api/generate JSON response; only the field we use. */
interface OllamaGenerateResponse {
	response?: string;
}

/**
 * Sends the raw error message to the configured Ollama endpoint and
 * returns its reworded version. Throws on a network error or non-OK HTTP
 * status — rewordHint.ts's withTimeout()/try-catch is what turns that into
 * a silent fallback to the built-in hint.
 */
export async function rewordWithLocalModel(
	rawMessage: string,
	errorType: string,
	language: string
): Promise<string | undefined> {
	const config = vscode.workspace.getConfiguration('codeCoach');
	const endpoint = config.get<string>('localHintEndpoint', 'http://localhost:11434/api/generate');
	const model = config.get<string>('localHintModel', 'llama3.2');

	const prompt =
		'You are a patient coding coach. Rewrite the following compiler or linter error as one short, ' +
		'encouraging, plain-language sentence (under 30 words) that helps a learner understand what went wrong. ' +
		'Reply with only that sentence.\n\n' +
		`Language: ${language}\nError type: ${errorType}\nRaw error message: ${rawMessage}\n\nRewritten hint:`;

	let response: Response;
	try {
		response = await fetch(endpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ model, prompt, stream: false }),
		});
	} catch (error) {
		vscode.window.showWarningMessage(
			`Code Coach: couldn't reach the local model at ${endpoint}. Is Ollama running?`
		);
		throw error;
	}

	if (!response.ok) {
		throw new Error(`Local model request failed: ${response.status} ${response.statusText}`);
	}

	const data = (await response.json()) as OllamaGenerateResponse;
	return data.response?.trim();
}
