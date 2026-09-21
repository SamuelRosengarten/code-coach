import * as assert from 'assert';
import * as vscode from 'vscode';
import { getCoachingHint } from '../rewordHint';
import { getHint } from '../hints';

function makeContext(): vscode.ExtensionContext {
	const secrets = new Map<string, string>();
	return {
		secrets: {
			get: async (key: string) => secrets.get(key),
			store: async (key: string, value: string) => {
				secrets.set(key, value);
			},
			delete: async (key: string) => {
				secrets.delete(key);
			},
		},
	} as unknown as vscode.ExtensionContext;
}

async function setConfig(key: string, value: string | undefined): Promise<void> {
	await vscode.workspace.getConfiguration('codeCoach').update(key, value, vscode.ConfigurationTarget.Global);
}

suite('Reword Hint Test Suite', () => {
	teardown(async () => {
		await setConfig('hintProvider', undefined);
		await setConfig('localHintEndpoint', undefined);
	});

	test('returns the built-in hint when hintProvider is "off"', async () => {
		await setConfig('hintProvider', 'off');
		const hint = await getCoachingHint(makeContext(), 'undefined_identifier', 'dart', "The name 'foo' isn't defined.");
		assert.strictEqual(hint, getHint('undefined_identifier', 'dart'));
	});

	test('falls back to the built-in hint when "claude" is selected but no API key is set', async () => {
		await setConfig('hintProvider', 'claude');
		const hint = await getCoachingHint(makeContext(), 'undefined_identifier', 'dart', "The name 'foo' isn't defined.");
		assert.strictEqual(hint, getHint('undefined_identifier', 'dart'));
	});

	test('falls back to the built-in hint when the local model endpoint is unreachable', async () => {
		await setConfig('hintProvider', 'local');
		await setConfig('localHintEndpoint', 'http://127.0.0.1:1');
		const hint = await getCoachingHint(makeContext(), 'undefined_identifier', 'dart', "The name 'foo' isn't defined.");
		assert.strictEqual(hint, getHint('undefined_identifier', 'dart'));
	});
});
