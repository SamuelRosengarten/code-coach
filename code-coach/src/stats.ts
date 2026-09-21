import { ErrorEvent } from './types';

const DAY_COUNT = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

export interface DayInfo {
	key: string;
	label: string;
}

export interface LanguageStats {
	daily: number[];
	total: number;
	previousTotal: number;
	uniqueFiles: number;
}

export interface TypeStats {
	daily: number[];
	total: number;
	previousTotal: number;
}

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

export function formatLanguageLabel(language: string): string {
	return LANGUAGE_LABELS[language] ?? (language.charAt(0).toUpperCase() + language.slice(1));
}

function toDateKey(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

function startOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

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
	return { daily: new Array(DAY_COUNT).fill(0), total: 0, previousTotal: 0 };
}

export function computeStatsPayload(events: readonly ErrorEvent[], now: Date = new Date()): StatsPayload {
	const days = buildDayRange(now, DAY_COUNT, 0);
	const previousDays = buildDayRange(now, DAY_COUNT, DAY_COUNT);

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
		const dayIndex = dayIndexByKey.get(key);

		const languageStats = byLanguage[event.language];
		const typeStatsByLanguage = byLanguageAndType[event.language];
		const typeStats = typeStatsByLanguage[event.errorType] ?? (typeStatsByLanguage[event.errorType] = emptyTypeStats());

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
