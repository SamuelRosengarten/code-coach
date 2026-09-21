import * as assert from 'assert';
import * as vscode from 'vscode';
import { resolveErrorType, selectNewDiagnostics } from '../diagnosticsFilter';

function makeDiagnostic(
	line: number,
	character: number,
	code: vscode.Diagnostic['code'],
	source = 'dart'
): vscode.Diagnostic {
	const range = new vscode.Range(line, character, line, character + 5);
	const diagnostic = new vscode.Diagnostic(range, 'test message', vscode.DiagnosticSeverity.Error);
	diagnostic.code = code;
	diagnostic.source = source;
	return diagnostic;
}

suite('Diagnostics Filter Test Suite', () => {
	test('resolveErrorType handles a plain string code', () => {
		assert.strictEqual(resolveErrorType(makeDiagnostic(0, 0, 'undefined_identifier')), 'undefined_identifier');
	});

	test('resolveErrorType handles a numeric code', () => {
		assert.strictEqual(resolveErrorType(makeDiagnostic(0, 0, 42)), '42');
	});

	test('resolveErrorType handles the object-with-value code shape', () => {
		const diagnostic = makeDiagnostic(0, 0, {
			value: 'undefined_named_parameter',
			target: vscode.Uri.parse('https://dart.dev/diagnostics/undefined_named_parameter'),
		});
		assert.strictEqual(resolveErrorType(diagnostic), 'undefined_named_parameter');
	});

	test('resolveErrorType falls back to source when code is undefined', () => {
		assert.strictEqual(resolveErrorType(makeDiagnostic(0, 0, undefined)), 'dart');
	});

	test('filters out known syntax-noise codes entirely', () => {
		const { toLog, currentlyPresent } = selectNewDiagnostics(
			[makeDiagnostic(2, 4, 'expected_token')],
			new Set()
		);
		assert.strictEqual(toLog.length, 0);
		assert.strictEqual(currentlyPresent.size, 0);
	});

	test('logs a diagnostic not seen before', () => {
		const { toLog, currentlyPresent } = selectNewDiagnostics(
			[makeDiagnostic(9, 12, 'invalid_assignment')],
			new Set()
		);
		assert.strictEqual(toLog.length, 1);
		assert.strictEqual(toLog[0].errorType, 'invalid_assignment');
		assert.strictEqual(toLog[0].line, 10);
		assert.strictEqual(toLog[0].column, 12);
		assert.strictEqual(currentlyPresent.size, 1);
	});

	test('does not re-log a diagnostic already logged and still present', () => {
		const diagnostic = makeDiagnostic(9, 12, 'invalid_assignment');
		const first = selectNewDiagnostics([diagnostic], new Set());
		const second = selectNewDiagnostics([diagnostic], first.currentlyPresent);

		assert.strictEqual(second.toLog.length, 0);
		assert.strictEqual(second.currentlyPresent.size, 1);
	});

	test('treats the same errorType/line at a different column as a new diagnostic', () => {
		const first = selectNewDiagnostics([makeDiagnostic(9, 5, 'undefined_identifier')], new Set());
		const second = selectNewDiagnostics([makeDiagnostic(9, 20, 'undefined_identifier')], first.currentlyPresent);

		assert.strictEqual(second.toLog.length, 1);
	});

	test('re-logs a diagnostic that disappeared and came back', () => {
		const diagnostic = makeDiagnostic(9, 12, 'invalid_assignment');
		const firstPass = selectNewDiagnostics([diagnostic], new Set());
		const secondPass = selectNewDiagnostics([], firstPass.currentlyPresent);
		const thirdPass = selectNewDiagnostics([diagnostic], secondPass.currentlyPresent);

		assert.strictEqual(thirdPass.toLog.length, 1);
	});
});