import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { initStorage } from '../extension';
import { hasBeenSuggested, markSuggested } from '../muteSuggestions';

suite('Mute Suggestions Test Suite', () => {
	let tempRoot: string;

	setup(() => {
		tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'code-coach-mute-suggestions-test-'));
		initStorage({ globalStorageUri: vscode.Uri.file(tempRoot) } as vscode.ExtensionContext);
	});

	teardown(() => {
		fs.rmSync(tempRoot, { recursive: true, force: true });
	});

	test('a type has not been suggested until markSuggested is called', () => {
		assert.strictEqual(hasBeenSuggested('dart', 'invalid_assignment'), false);
	});

	test('marking a type as suggested persists it', () => {
		markSuggested('dart', 'invalid_assignment');
		assert.strictEqual(hasBeenSuggested('dart', 'invalid_assignment'), true);
	});

	test('suggestion state is scoped to language and error type together', () => {
		markSuggested('dart', 'invalid_assignment');
		assert.strictEqual(hasBeenSuggested('typescript', 'invalid_assignment'), false);
		assert.strictEqual(hasBeenSuggested('dart', 'undefined_identifier'), false);
	});

	test('marking the same type twice does not throw', () => {
		markSuggested('dart', 'invalid_assignment');
		assert.doesNotThrow(() => markSuggested('dart', 'invalid_assignment'));
		assert.strictEqual(hasBeenSuggested('dart', 'invalid_assignment'), true);
	});
});
