import type * as vscode from 'vscode';

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

export function resolveErrorType(diagnostic: vscode.Diagnostic): string {
	if (typeof diagnostic.code === 'object' && diagnostic.code !== null) {
		return String(diagnostic.code.value);
	}
	if (diagnostic.code !== undefined) {
		return String(diagnostic.code);
	}
	return diagnostic.source ?? 'unknown';
}

export interface DiagnosticSelection {
	errorType: string;
	line: number;
	column: number;
	identity: string;
	message: string;
}

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