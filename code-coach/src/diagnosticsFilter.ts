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
}

export function selectNewDiagnostics(
	diagnostics: readonly vscode.Diagnostic[],
	previouslyLogged: ReadonlySet<string>
): { toLog: DiagnosticSelection[]; currentlyPresent: Set<string> } {
	const toLog: DiagnosticSelection[] = [];
	const currentlyPresent = new Set<string>();

	for (const diagnostic of diagnostics) {
		const errorType = resolveErrorType(diagnostic);

		if (SYNTAX_NOISE_CODES.has(errorType)) {
			continue;
		}

		const line = diagnostic.range.start.line + 1;
		const column = diagnostic.range.start.character;
		const identity = `${errorType}:${line}:${column}`;

		currentlyPresent.add(identity);

		if (!previouslyLogged.has(identity)) {
			toLog.push({ errorType, line, column, identity });
		}
	}

	return { toLog, currentlyPresent };
}