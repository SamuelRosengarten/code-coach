/**
 * The JSON schema for a single logged error event (issue #10).
 * One of these is written per line to the JSONL error log.
 */
export interface ErrorEvent {
  errorType: string;
  file: string;
  line: number;
  language: string;
  timestamp: string;
  muted: boolean;
}

export function isErrorEvent(value: unknown): value is ErrorEvent {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    typeof v.errorType === 'string' &&
    typeof v.file === 'string' &&
    typeof v.line === 'number' &&
    typeof v.language === 'string' &&
    typeof v.timestamp === 'string' &&
    !Number.isNaN(Date.parse(v.timestamp)) &&
    typeof v.muted === 'boolean'
  );
}
