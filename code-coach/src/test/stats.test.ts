import * as assert from 'assert';
import { computeStatsPayload, formatLanguageLabel } from '../stats';
import { ErrorEvent } from '../types';

function makeEvent(daysAgo: number, overrides: Partial<ErrorEvent> = {}): ErrorEvent {
	const now = new Date('2026-09-21T12:00:00.000Z');
	const timestamp = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
	return {
		errorType: 'invalid_assignment',
		filePath: 'lib/test.dart',
		line: 10,
		language: 'dart',
		timestamp,
		muted: false,
		...overrides,
	};
}

const NOW = new Date('2026-09-21T12:00:00.000Z');

suite('Stats Test Suite', () => {
	test('formatLanguageLabel maps known languages and falls back to a capitalized id', () => {
		assert.strictEqual(formatLanguageLabel('dart'), 'Dart');
		assert.strictEqual(formatLanguageLabel('cpp'), 'C++');
		assert.strictEqual(formatLanguageLabel('lua'), 'Lua');
	});

	test('returns an empty payload for no events', () => {
		const payload = computeStatsPayload([], NOW);
		assert.strictEqual(payload.languages.length, 0);
		assert.strictEqual(payload.totalCurrent, 0);
		assert.strictEqual(payload.totalPrevious, 0);
		assert.strictEqual(payload.uniqueFiles, 0);
		assert.strictEqual(payload.days.length, 7);
	});

	test('buckets events into the current 7-day window', () => {
		const events = [makeEvent(0), makeEvent(3), makeEvent(6)];
		const payload = computeStatsPayload(events, NOW);
		assert.strictEqual(payload.totalCurrent, 3);
		assert.strictEqual(payload.totalPrevious, 0);
		assert.strictEqual(payload.byLanguage.dart.total, 3);
	});

	test('buckets events older than 7 days but within 14 into the previous window', () => {
		const events = [makeEvent(0), makeEvent(8), makeEvent(13)];
		const payload = computeStatsPayload(events, NOW);
		assert.strictEqual(payload.totalCurrent, 1);
		assert.strictEqual(payload.totalPrevious, 2);
		assert.strictEqual(payload.byLanguage.dart.previousTotal, 2);
	});

	test('ignores events older than 14 days', () => {
		const events = [makeEvent(0), makeEvent(20)];
		const payload = computeStatsPayload(events, NOW);
		assert.strictEqual(payload.totalCurrent, 1);
		assert.strictEqual(payload.totalPrevious, 0);
	});

	test('groups by language and by error type within a language', () => {
		const events = [
			makeEvent(0, { language: 'dart', errorType: 'null_safety' }),
			makeEvent(1, { language: 'dart', errorType: 'null_safety' }),
			makeEvent(1, { language: 'dart', errorType: 'type_mismatch' }),
			makeEvent(0, { language: 'java', errorType: 'null_pointer' }),
		];
		const payload = computeStatsPayload(events, NOW);

		assert.deepStrictEqual(payload.languages, ['dart', 'java']);
		assert.strictEqual(payload.byLanguage.dart.total, 3);
		assert.strictEqual(payload.byLanguage.java.total, 1);
		assert.strictEqual(payload.byLanguageAndType.dart.null_safety.total, 2);
		assert.strictEqual(payload.byLanguageAndType.dart.type_mismatch.total, 1);
	});

	test('counts unique files overall and per language', () => {
		const events = [
			makeEvent(0, { language: 'dart', filePath: 'a.dart' }),
			makeEvent(0, { language: 'dart', filePath: 'a.dart' }),
			makeEvent(0, { language: 'dart', filePath: 'b.dart' }),
			makeEvent(0, { language: 'java', filePath: 'c.java' }),
		];
		const payload = computeStatsPayload(events, NOW);
		assert.strictEqual(payload.uniqueFiles, 3);
		assert.strictEqual(payload.byLanguage.dart.uniqueFiles, 2);
		assert.strictEqual(payload.byLanguage.java.uniqueFiles, 1);
	});

	test('places each event on the correct day within the window', () => {
		const events = [makeEvent(0), makeEvent(6)];
		const payload = computeStatsPayload(events, NOW);
		assert.strictEqual(payload.byLanguage.dart.daily[6], 1);
		assert.strictEqual(payload.byLanguage.dart.daily[0], 1);
		assert.strictEqual(sum(payload.byLanguage.dart.daily), 2);
	});
});

function sum(values: number[]): number {
	return values.reduce((a, b) => a + b, 0);
}
