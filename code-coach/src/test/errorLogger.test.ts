import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { initStorage } from '../extension';
import { appendErrorEvent, LOG_FILE_NAME } from '../errorLogger';
import { ErrorEvent } from '../types';

suite('Error Logger Test Suite', () => {
	let tempRoot: string;

	setup(() => {
		tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'code-coach-error-log-test-'));
		initStorage({ globalStorageUri: vscode.Uri.file(tempRoot) } as vscode.ExtensionContext);
	});

	teardown(() => {
		fs.rmSync(tempRoot, { recursive: true, force: true });
	});

	function readLoggedEvents(): ErrorEvent[] {
		const logPath = path.join(tempRoot, LOG_FILE_NAME);
		const content = fs.readFileSync(logPath, 'utf8');
		return content
			.split('\n')
			.filter((line) => line.trim().length > 0)
			.map((line) => JSON.parse(line));
	}

	function makeEvent(overrides: Partial<ErrorEvent> = {}): ErrorEvent {
		return {
			errorType: 'invalid_assignment',
			filePath: 'lib/test.dart',
			line: 10,
			language: 'dart',
			timestamp: new Date().toISOString(),
			muted: false,
			...overrides,
		};
	}

	test('creates the log file and writes a valid entry on first call', () => {
		const event = makeEvent();
		appendErrorEvent(event);

		const events = readLoggedEvents();
		assert.strictEqual(events.length, 1);
		assert.deepStrictEqual(events[0], event);
	});

	test('appends a second event on a new line instead of overwriting', () => {
		const firstEvent = makeEvent({ errorType: 'invalid_assignment', line: 10 });
		const secondEvent = makeEvent({ errorType: 'undefined_identifier', line: 14 });

		appendErrorEvent(firstEvent);
		appendErrorEvent(secondEvent);

		const events = readLoggedEvents();
		assert.strictEqual(events.length, 2);
		assert.deepStrictEqual(events[0], firstEvent);
		assert.deepStrictEqual(events[1], secondEvent);
	});

	test('does not throw when the storage directory disappears out from under it', () => {
		fs.rmSync(tempRoot, { recursive: true, force: true });

		assert.doesNotThrow(() => appendErrorEvent(makeEvent()));
	});
});