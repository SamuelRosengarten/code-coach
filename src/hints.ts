/**
 * The one error type Code Coach currently coaches: TypeScript's TS2304
 * "Cannot find name 'x'" — a very common beginner error (typo, missing
 * import, or a variable used before it's declared) whose raw compiler
 * message doesn't explain any of that.
 */
export interface DiagnosticCodeLike {
  // `code` can be a plain string/number ("2304"), or an object like
  // { value: 2304 } — VS Code's Diagnostic type allows both shapes
  // depending on where the diagnostic came from, so callers have to
  // handle either one. normalizeCode() below is what unwraps this.
  code?: string | number | { value: string | number };
  source?: string;
  message: string;
}

export const TARGET_LANGUAGE_ID = 'typescript';
const TARGET_SOURCE = 'ts';
const TARGET_CODE = 2304;

export const FRIENDLY_HINT =
  "TypeScript doesn't recognize this name yet. That's usually a typo, a " +
  'missing import, or a variable/function that gets used before it\'s ' +
  "declared — double-check the spelling and make sure it's defined or " +
  'imported above this line.';

/** Unwraps `code` to a plain string/number, whichever of the two shapes above it was. */
function normalizeCode(code: DiagnosticCodeLike['code']): string | number | undefined {
  if (code !== null && typeof code === 'object' && 'value' in code) {
    return code.value;
  }
  return code;
}

export function isTargetDiagnostic(diagnostic: DiagnosticCodeLike): boolean {
  return diagnostic.source === TARGET_SOURCE && normalizeCode(diagnostic.code) === TARGET_CODE;
}

/** Friendly hint text for the given diagnostic, or undefined if it's not the coached error type. */
export function getHint(diagnostic: DiagnosticCodeLike): string | undefined {
  return isTargetDiagnostic(diagnostic) ? FRIENDLY_HINT : undefined;
}

/** Stable identifier for an error type, used as the mute-tracking/log key. */
export function errorTypeFor(diagnostic: DiagnosticCodeLike): string {
  return `${diagnostic.source ?? 'unknown'}:${normalizeCode(diagnostic.code) ?? 'unknown'}`;
}
