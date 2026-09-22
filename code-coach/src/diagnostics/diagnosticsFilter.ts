// Pure decision logic for "which of the diagnostics VS Code is currently
// reporting should Code Coach actually log/hint on right now?" Kept free
// of any side effects (no file I/O, no vscode.window calls) so it's easy
// to unit test directly — see ../test/diagnosticsFilter.test.ts.
import type * as vscode from 'vscode';

// Error codes that fire constantly *while a line is mid-edit* (e.g. VS
// Code reports "expected_token" for every keystroke until a statement is
// syntactically complete). These are just editing noise, not a mistake to
// coach on, so they're filtered out entirely rather than logged or hinted.
export const SYNTAX_NOISE_CODES = new Set<string>([
	'expected_token',
	'missing_identifier',
	'expected_body',
	'missing_function_body',
	'unexpected_token',
	'expected_type_name',
	'expected_identifier_but_got_keyword',
	'missing_statement',
	'unterminated_string_literal',
	'body_might_complete_normally',
]);

/**
 * Extracts a stable string identifier for a diagnostic's error code.
 * `diagnostic.code` can be a plain string/number, an object like
 * `{ value: 'undefined_identifier', target: ... }` (some language servers,
 * e.g. Dart's, attach a docs link this way), or missing entirely — in
 * which case the diagnostic's `source` (e.g. "eslint") is used instead.
 */
export function resolveErrorType(diagnostic: vscode.Diagnostic): string {
	if (typeof diagnostic.code === 'object' && diagnostic.code !== null) {
		return String(diagnostic.code.value);
	}
	if (diagnostic.code !== undefined) {
		return String(diagnostic.code);
	}
	return diagnostic.source ?? 'unknown';
}

/** One diagnostic that's a candidate to be logged/hinted, with its derived fields. */
export interface DiagnosticSelection {
	errorType: string;
	line: number;
	column: number;
	/** `errorType:line:column` — see selectNewDiagnostics() for why this needs to include position. */
	identity: string;
	message: string;
}

/**
 * Decides which of the diagnostics currently on a file are "new" and
 * should be logged/hinted, given the set of identities already logged for
 * that file from the previous pass.
 *
 * Each diagnostic's `identity` includes its line and column (not just its
 * error type) so that fixing one mistake and then making the *same kind*
 * of mistake again, elsewhere, is treated as a new occurrence rather than
 * being silently ignored as "already logged".
 *
 * `shouldDefer` is an optional extra check (used by the caller to skip a
 * diagnostic on the line the user is actively typing on) — a diagnostic
 * that's deferred is left out of `toLog` *and* out of `updatedLogged`, so
 * it gets reconsidered on the next pass once editing settles down.
 */
export function selectNewDiagnostics(
	diagnostics: readonly vscode.Diagnostic[],
	previouslyLogged: ReadonlySet<string>,
	shouldDefer: (selection: DiagnosticSelection) => boolean = () => false
): { toLog: DiagnosticSelection[]; updatedLogged: Set<string>; removed: string[] } {
	const currentIdentities = new Set<string>();
	const selections: DiagnosticSelection[] = [];

	for (const diagnostic of diagnostics) {
		const errorType = resolveErrorType(diagnostic);
		if (SYNTAX_NOISE_CODES.has(errorType)) {
			continue;
		}
		const line = diagnostic.range.start.line + 1;
		const column = diagnostic.range.start.character;
		const identity = `${errorType}:${line}:${column}`;

		currentIdentities.add(identity);
		selections.push({ errorType, line, column, identity, message: diagnostic.message });
	}

	// Keep previously-logged identities only if they're still present —
	// ones that disappeared (fixed) are dropped so a repeat of the same
	// mistake later gets logged again.
	const removed = [...previouslyLogged].filter((identity) => !currentIdentities.has(identity));
	const updatedLogged = new Set<string>(
		[...previouslyLogged].filter((identity) => currentIdentities.has(identity))
	);

	const toLog: DiagnosticSelection[] = [];

	for (const selection of selections) {
		if (previouslyLogged.has(selection.identity)) {
			continue; // already logged and still present
		}
		if (shouldDefer(selection)) {
			continue; // new, but still being actively edited — reconsider later
		}
		toLog.push(selection);
		updatedLogged.add(selection.identity);
	}

	return { toLog, updatedLogged, removed };
}