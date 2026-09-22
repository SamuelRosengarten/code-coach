import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { initStorage } from '../extension';
import { appendErrorEvent, countOccurrences, countOccurrencesWithinWindow, LOG_FILE_NAME } from '../errorLogger';
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

	test('countOccurrences counts only matching language and error type', () => {
		appendErrorEvent(makeEvent({ language: 'dart', errorType: 'invalid_assignment' }));
		appendErrorEvent(makeEvent({ language: 'dart', errorType: 'invalid_assignment' }));
		appendErrorEvent(makeEvent({ language: 'dart', errorType: 'undefined_identifier' }));
		appendErrorEvent(makeEvent({ language: 'python', errorType: 'invalid_assignment' }));

		assert.strictEqual(countOccurrences('dart', 'invalid_assignment'), 2);
		assert.strictEqual(countOccurrences('dart', 'undefined_identifier'), 1);
		assert.strictEqual(countOccurrences('python', 'invalid_assignment'), 1);
		assert.strictEqual(countOccurrences('dart', 'never_seen'), 0);
	});

	test('countOccurrences returns 0 when nothing has been logged yet', () => {
		assert.strictEqual(countOccurrences('dart', 'invalid_assignment'), 0);
	});

	test('countOccurrencesWithinWindow only counts events inside the time window', () => {
		const now = new Date('2026-09-21T12:00:00.000Z');
		appendErrorEvent(makeEvent({ timestamp: new Date(now.getTime() - 1 * 60 * 1000).toISOString() }));
		appendErrorEvent(makeEvent({ timestamp: new Date(now.getTime() - 4 * 60 * 1000).toISOString() }));
		appendErrorEvent(makeEvent({ timestamp: new Date(now.getTime() - 10 * 60 * 1000).toISOString() }));

		assert.strictEqual(countOccurrencesWithinWindow('dart', 'invalid_assignment', 5, now), 2);
		assert.strictEqual(countOccurrencesWithinWindow('dart', 'invalid_assignment', 15, now), 3);
	});

	test('countOccurrencesWithinWindow ignores a different language or error type', () => {
		const now = new Date('2026-09-21T12:00:00.000Z');
		appendErrorEvent(makeEvent({ language: 'python', timestamp: now.toISOString() }));
		appendErrorEvent(makeEvent({ errorType: 'undefined_identifier', timestamp: now.toISOString() }));

		assert.strictEqual(countOccurrencesWithinWindow('dart', 'invalid_assignment', 5, now), 0);
	});
});