export interface ErrorEvent {
	errorType: string;
	filePath: string;
	line: number;
	language: string;
	timestamp: string;
	muted: boolean;
}