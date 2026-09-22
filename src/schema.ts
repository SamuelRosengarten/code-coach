/**
 * The JSON schema for a single logged error event.
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

/**
 * Checks whether `value` (e.g. something just parsed from JSON) actually
 * matches the ErrorEvent shape above.
 *
 * The return type `value is ErrorEvent` is a TypeScript "type predicate":
 * it tells the compiler that everywhere this function returns true, the
 * value it was given can safely be treated as an ErrorEvent from then on.
 */
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
