import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { initStorage } from '../extension';
import { isMuted, muteType, unmuteType, listMutedTypes } from '../storage/muteStore';

suite('Mute Store Test Suite', () => {
	let tempRoot: string;

	setup(() => {
		tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'code-coach-mute-store-test-'));
		initStorage({ globalStorageUri: vscode.Uri.file(tempRoot) } as vscode.ExtensionContext);
	});

	teardown(() => {
		fs.rmSync(tempRoot, { recursive: true, force: true });
	});

	test('a type is not muted until it is explicitly muted', () => {
		assert.strictEqual(isMuted('dart', 'undefined_identifier'), false);
	});

	test('muting a type persists it as muted', () => {
		muteType('dart', 'undefined_identifier');
		assert.strictEqual(isMuted('dart', 'undefined_identifier'), true);
	});

	test('muting is scoped to language and error type together', () => {
		muteType('dart', 'undefined_identifier');
		assert.strictEqual(isMuted('typescript', 'undefined_identifier'), false);
		assert.strictEqual(isMuted('dart', 'return_of_invalid_type'), false);
	});

	test('muting the same type twice does not throw and stays muted', () => {
		muteType('dart', 'undefined_identifier');
		assert.doesNotThrow(() => muteType('dart', 'undefined_identifier'));
		assert.strictEqual(isMuted('dart', 'undefined_identifier'), true);
	});

	test('listMutedTypes reflects every muted type', () => {
		muteType('dart', 'undefined_identifier');
		muteType('typescript', '2345');

		const muted = listMutedTypes();
		assert.strictEqual(muted.length, 2);
		assert.deepStrictEqual(
			muted.sort((a, b) => a.language.localeCompare(b.language)),
			[
				{ language: 'dart', errorType: 'undefined_identifier' },
				{ language: 'typescript', errorType: '2345' },
			]
		);
	});

	test('unmuting a type makes it show up again', () => {
		muteType('dart', 'undefined_identifier');
		unmuteType('dart', 'undefined_identifier');

		assert.strictEqual(isMuted('dart', 'undefined_identifier'), false);
		assert.deepStrictEqual(listMutedTypes(), []);
	});

	test('unmuting a type that was never muted does not throw', () => {
		assert.doesNotThrow(() => unmuteType('dart', 'undefined_identifier'));
	});
});
