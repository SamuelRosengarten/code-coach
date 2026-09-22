/**
 * One logged mistake. Every time a coached error is seen (shown as a hint
 * or muted), one of these is appended as a line of JSON to the on-disk log
 * (see src/storage/errorLogger.ts) — that log is what src/dashboard/stats.ts
 * reads to build the sidebar charts.
 */
export interface ErrorEvent {
	errorType: string;
	filePath: string;
	line: number;
	language: string;
	timestamp: string;
	muted: boolean;
}