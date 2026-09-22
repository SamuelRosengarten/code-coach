import * as assert from 'assert';
import { computeStatsPayload, computeWeeklyTrend, formatLanguageLabel } from '../dashboard/stats';
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

	test('allTimeTotal keeps counting an error type even outside the 14-day window', () => {
		const events = [
			makeEvent(0, { errorType: 'invalid_assignment' }),
			makeEvent(8, { errorType: 'invalid_assignment' }),
			makeEvent(20, { errorType: 'invalid_assignment' }),
			makeEvent(100, { errorType: 'invalid_assignment' }),
		];
		const payload = computeStatsPayload(events, NOW);
		assert.strictEqual(payload.byLanguageAndType.dart.invalid_assignment.total, 1);
		assert.strictEqual(payload.byLanguageAndType.dart.invalid_assignment.previousTotal, 1);
		assert.strictEqual(payload.byLanguageAndType.dart.invalid_assignment.allTimeTotal, 4);
	});

	test('places each event on the correct day within the window', () => {
		const events = [makeEvent(0), makeEvent(6)];
		const payload = computeStatsPayload(events, NOW);
		assert.strictEqual(payload.byLanguage.dart.daily[6], 1);
		assert.strictEqual(payload.byLanguage.dart.daily[0], 1);
		assert.strictEqual(sum(payload.byLanguage.dart.daily), 2);
	});
});

suite('Weekly Trend Test Suite', () => {
	test('produces 6 weeks with the last one labeled "this"', () => {
		const trend = computeWeeklyTrend([], NOW);
		assert.strictEqual(trend.weeks.length, 6);
		assert.deepStrictEqual(
			trend.weeks.map((w) => w.label),
			['W1', 'W2', 'W3', 'W4', 'W5', 'this']
		);
	});

	test('buckets events into the correct week going backwards from now', () => {
		const events = [
			makeEvent(0, { errorType: 'null_safety' }),
			makeEvent(7, { errorType: 'null_safety' }),
			makeEvent(35, { errorType: 'null_safety' }),
		];
		const trend = computeWeeklyTrend(events, NOW);
		assert.strictEqual(trend.seriesByType.null_safety[5], 1);
		assert.strictEqual(trend.seriesByType.null_safety[4], 1);
		assert.strictEqual(trend.seriesByType.null_safety[0], 1);
	});

	test('drops events older than the tracked window', () => {
		const events = [makeEvent(0, { errorType: 'null_safety' }), makeEvent(200, { errorType: 'null_safety' })];
		const trend = computeWeeklyTrend(events, NOW);
		assert.strictEqual(sum(trend.seriesByType.null_safety), 1);
	});

	test('topTypes ranks by this-week volume, capped at 2', () => {
		const events = [
			makeEvent(0, { errorType: 'a' }),
			makeEvent(0, { errorType: 'a' }),
			makeEvent(0, { errorType: 'b' }),
			makeEvent(0, { errorType: 'c' }),
		];
		const trend = computeWeeklyTrend(events, NOW);
		assert.deepStrictEqual(trend.topTypes, ['a', 'b']);
	});

	test('records the language associated with each error type', () => {
		const events = [makeEvent(0, { errorType: 'invalid_assignment', language: 'dart' })];
		const trend = computeWeeklyTrend(events, NOW);
		assert.strictEqual(trend.languageByType.invalid_assignment, 'dart');
	});

	test('filters to a single language when one is given', () => {
		const events = [
			makeEvent(0, { errorType: 'invalid_assignment', language: 'dart' }),
			makeEvent(0, { errorType: '2345', language: 'typescript' }),
		];
		const trend = computeWeeklyTrend(events, NOW, 6, 'dart');
		assert.deepStrictEqual(Object.keys(trend.seriesByType), ['invalid_assignment']);
	});
});

function sum(values: number[]): number {
	return values.reduce((a, b) => a + b, 0);
}
