// Pure number-crunching for the dashboard: turns the flat list of logged
// ErrorEvents into the day-by-day and week-by-week summaries the sidebar
// webview (statsViewProvider.ts) renders as charts. No vscode dependency,
// so this is easy to unit test directly — see ../test/stats.test.ts.
import { ErrorEvent } from '../types';

const DAY_COUNT = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WEEK_COUNT = 6;
const MS_PER_WEEK = 7 * MS_PER_DAY;

const LANGUAGE_LABELS: Record<string, string> = {
	dart: 'Dart',
	java: 'Java',
	kotlin: 'Kotlin',
	cpp: 'C++',
	c: 'C',
	csharp: 'C#',
	python: 'Python',
	javascript: 'JavaScript',
	typescript: 'TypeScript',
	swift: 'Swift',
	go: 'Go',
	rust: 'Rust',
	ruby: 'Ruby',
	php: 'PHP',
	'objective-c': 'Objective-C',
};

/** One column in the daily chart: `key` is a sortable "YYYY-MM-DD", `label` a short display string like "Mon". */
export interface DayInfo {
	key: string;
	label: string;
}

/** Per-language rollup: `daily[i]` lines up with `StatsPayload.days[i]`. */
export interface LanguageStats {
	daily: number[];
	total: number;
	previousTotal: number;
	uniqueFiles: number;
}

/** Same shape as LanguageStats, but for one specific error type within one language. */
export interface TypeStats {
	daily: number[];
	total: number;
	previousTotal: number;
	allTimeTotal: number;
}

/** Everything computeStatsPayload() returns — the day-by-day view of the dashboard. */
export interface StatsPayload {
	days: DayInfo[];
	rangeLabel: string;
	languages: string[];
	languageLabels: Record<string, string>;
	byLanguage: Record<string, LanguageStats>;
	byLanguageAndType: Record<string, Record<string, TypeStats>>;
	totalCurrent: number;
	totalPrevious: number;
	uniqueFiles: number;
}

/** One column in the weekly trend chart. `label` is "this" for the most recent week, otherwise "W1", "W2", etc. */
export interface WeekInfo {
	key: string;
	label: string;
}

/** Everything computeWeeklyTrend() returns — the week-by-week view, used for the "trending up/down" indicators. */
export interface WeeklyTrendPayload {
	weeks: WeekInfo[];
	seriesByType: Record<string, number[]>;
	languageByType: Record<string, string>;
	topTypes: string[];
}

/**
 * Buckets events into `weekCount` weekly columns (oldest first, most
 * recent last) per error type, optionally filtered to one language.
 * `topTypes` is the (at most) two error types with the highest count in
 * the most recent week, used to pick which lines the dashboard highlights
 * by default.
 */
export function computeWeeklyTrend(
	events: readonly ErrorEvent[],
	now: Date = new Date(),
	weekCount: number = WEEK_COUNT,
	language?: string
): WeeklyTrendPayload {
	const weeks: WeekInfo[] = [];
	for (let i = 0; i < weekCount; i++) {
		weeks.push({ key: `w${i}`, label: i === weekCount - 1 ? 'this' : `W${i + 1}` });
	}

	const seriesByType: Record<string, number[]> = {};
	const languageByType: Record<string, string> = {};

	for (const event of events) {
		if (language !== undefined && event.language !== language) {
			continue;
		}
		const eventDate = new Date(event.timestamp);
		if (Number.isNaN(eventDate.getTime())) {
			continue;
		}
		const ageMs = now.getTime() - eventDate.getTime();
		if (ageMs < 0) {
			continue;
		}
		const weeksAgo = Math.floor(ageMs / MS_PER_WEEK);
		if (weeksAgo >= weekCount) {
			continue;
		}
		// weeksAgo counts backward from "now" (0 = this week); index
		// counts forward through the output array so the most recent
		// week ends up last, matching `weeks` above.
		const index = weekCount - 1 - weeksAgo;
		// `??=`-style lazy init: reuse the array for this errorType if one
		// exists already, otherwise create and store a fresh all-zero one.
		const series = seriesByType[event.errorType] ?? (seriesByType[event.errorType] = new Array(weekCount).fill(0));
		series[index]++;
		languageByType[event.errorType] = event.language;
	}

	const topTypes = Object.keys(seriesByType)
		.sort((a, b) => seriesByType[b][weekCount - 1] - seriesByType[a][weekCount - 1])
		.slice(0, 2);

	return { weeks, seriesByType, languageByType, topTypes };
}

/** Maps a language ID (e.g. "csharp") to its display name (e.g. "C#"), falling back to capitalizing the raw ID. */
export function formatLanguageLabel(language: string): string {
	return LANGUAGE_LABELS[language] ?? (language.charAt(0).toUpperCase() + language.slice(1));
}

/** Formats a date as a sortable, timezone-free "YYYY-MM-DD" string, used as a lookup key throughout this file. */
function toDateKey(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() is 0-based (0 = January)
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

/** Same calendar day as `date`, but at midnight — strips the time-of-day so day comparisons ignore it. */
function startOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Builds `count` consecutive DayInfo entries ending `offsetDays` days
 * before `now`'s calendar day (oldest first). `offsetDays: 0` gives the
 * most recent `count` days including today; `offsetDays: count` gives the
 * `count` days before that — which is how computeStatsPayload() below
 * gets both "this week" and "the week before" from the same helper.
 */
function buildDayRange(now: Date, count: number, offsetDays: number): DayInfo[] {
	const today = startOfDay(now);
	const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
	const days: DayInfo[] = [];
	for (let i = count - 1; i >= 0; i--) {
		const date = new Date(today.getTime() - (i + offsetDays) * MS_PER_DAY);
		days.push({ key: toDateKey(date), label: weekdayFormatter.format(date) });
	}
	return days;
}

/** Formats a day range as a display string like "Sep 15 – Sep 21", for the dashboard's header. */
function formatRangeLabel(days: DayInfo[], now: Date): string {
	if (days.length === 0) {
		return '';
	}
	const monthDayFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
	const first = new Date(days[0].key);
	const last = new Date(days[days.length - 1].key);
	return `${monthDayFormatter.format(first)} – ${monthDayFormatter.format(last)}`;
}

function emptyLanguageStats(): LanguageStats {
	return { daily: new Array(DAY_COUNT).fill(0), total: 0, previousTotal: 0, uniqueFiles: 0 };
}

function emptyTypeStats(): TypeStats {
	return { daily: new Array(DAY_COUNT).fill(0), total: 0, previousTotal: 0, allTimeTotal: 0 };
}

/**
 * Builds the full daily dashboard payload from the raw event log: per-day
 * counts for the last DAY_COUNT days (`days`/`byLanguage[l].daily`), plus
 * a `previousTotal` for the DAY_COUNT days before that — comparing the two
 * is what lets the dashboard show "up/down from last week" per language
 * and per error type, without a second pass over the events.
 */
export function computeStatsPayload(events: readonly ErrorEvent[], now: Date = new Date()): StatsPayload {
	const days = buildDayRange(now, DAY_COUNT, 0);
	const previousDays = buildDayRange(now, DAY_COUNT, DAY_COUNT);

	// Map from date key -> position in `days`, so the main loop below can
	// place each event in O(1) instead of searching `days` every time.
	const dayIndexByKey = new Map<string, number>(days.map((d, i) => [d.key, i]));
	const previousKeys = new Set(previousDays.map((d) => d.key));

	const languages = [...new Set(events.map((e) => e.language))].sort();
	const languageLabels: Record<string, string> = {};
	for (const language of languages) {
		languageLabels[language] = formatLanguageLabel(language);
	}

	const byLanguage: Record<string, LanguageStats> = {};
	const byLanguageAndType: Record<string, Record<string, TypeStats>> = {};
	const filesByLanguage: Record<string, Set<string>> = {};
	const allFiles = new Set<string>();

	for (const language of languages) {
		byLanguage[language] = emptyLanguageStats();
		byLanguageAndType[language] = {};
		filesByLanguage[language] = new Set<string>();
	}

	for (const event of events) {
		const eventDate = new Date(event.timestamp);
		if (Number.isNaN(eventDate.getTime())) {
			continue;
		}
		const key = toDateKey(eventDate);
		const dayIndex = dayIndexByKey.get(key); // undefined if the event predates the current window

		const languageStats = byLanguage[event.language];
		const typeStatsByLanguage = byLanguageAndType[event.language];
		const typeStats = typeStatsByLanguage[event.errorType] ?? (typeStatsByLanguage[event.errorType] = emptyTypeStats());
		typeStats.allTimeTotal++;

		if (dayIndex !== undefined) {
			languageStats.daily[dayIndex]++;
			languageStats.total++;
			typeStats.daily[dayIndex]++;
			typeStats.total++;
			filesByLanguage[event.language].add(event.filePath);
			allFiles.add(event.filePath);
		} else if (previousKeys.has(key)) {
			languageStats.previousTotal++;
			typeStats.previousTotal++;
		}
	}

	for (const language of languages) {
		byLanguage[language].uniqueFiles = filesByLanguage[language].size;
	}

	const totalCurrent = languages.reduce((sum, l) => sum + byLanguage[l].total, 0);
	const totalPrevious = languages.reduce((sum, l) => sum + byLanguage[l].previousTotal, 0);

	return {
		days,
		rangeLabel: formatRangeLabel(days, now),
		languages,
		languageLabels,
		byLanguage,
		byLanguageAndType,
		totalCurrent,
		totalPrevious,
		uniqueFiles: allFiles.size,
	};
}
