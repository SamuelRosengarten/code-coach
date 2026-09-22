import * as assert from 'assert';
import * as vscode from 'vscode';
import { resolveErrorType, selectNewDiagnostics } from '../diagnostics/diagnosticsFilter';

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
		const { toLog, updatedLogged } = selectNewDiagnostics(
			[makeDiagnostic(2, 4, 'expected_token')],
			new Set()
		);
		assert.strictEqual(toLog.length, 0);
		assert.strictEqual(updatedLogged.size, 0);
	});

	test('logs a diagnostic not seen before', () => {
		const { toLog, updatedLogged } = selectNewDiagnostics(
			[makeDiagnostic(9, 12, 'invalid_assignment')],
			new Set()
		);
		assert.strictEqual(toLog.length, 1);
		assert.strictEqual(toLog[0].errorType, 'invalid_assignment');
		assert.strictEqual(toLog[0].line, 10);
		assert.strictEqual(toLog[0].column, 12);
		assert.strictEqual(updatedLogged.size, 1);
	});

	test('does not re-log a diagnostic already logged and still present', () => {
		const diagnostic = makeDiagnostic(9, 12, 'invalid_assignment');
		const first = selectNewDiagnostics([diagnostic], new Set());
		const second = selectNewDiagnostics([diagnostic], first.updatedLogged);

		assert.strictEqual(second.toLog.length, 0);
		assert.strictEqual(second.updatedLogged.size, 1);
	});

	test('treats the same errorType/line at a different column as a new diagnostic', () => {
		const first = selectNewDiagnostics([makeDiagnostic(9, 5, 'undefined_identifier')], new Set());
		const second = selectNewDiagnostics([makeDiagnostic(9, 20, 'undefined_identifier')], first.updatedLogged);

		assert.strictEqual(second.toLog.length, 1);
	});

	test('reports a fixed diagnostic as removed', () => {
		const diagnostic = makeDiagnostic(9, 12, 'invalid_assignment');
		const first = selectNewDiagnostics([diagnostic], new Set());
		const second = selectNewDiagnostics([], first.updatedLogged);

		assert.deepStrictEqual(second.removed, ['invalid_assignment:10:12']);
	});

	test('does not report a still-present diagnostic as removed', () => {
		const diagnostic = makeDiagnostic(9, 12, 'invalid_assignment');
		const first = selectNewDiagnostics([diagnostic], new Set());
		const second = selectNewDiagnostics([diagnostic], first.updatedLogged);

		assert.deepStrictEqual(second.removed, []);
	});

	test('re-logs a diagnostic that disappeared and came back', () => {
		const diagnostic = makeDiagnostic(9, 12, 'invalid_assignment');
		const firstPass = selectNewDiagnostics([diagnostic], new Set());
		const secondPass = selectNewDiagnostics([], firstPass.updatedLogged);
		const thirdPass = selectNewDiagnostics([diagnostic], secondPass.updatedLogged);

		assert.strictEqual(thirdPass.toLog.length, 1);
	});

	test('defers a new diagnostic on the line currently being edited', () => {
		const diagnostic = makeDiagnostic(9, 12, 'invalid_assignment');
		const { toLog, updatedLogged } = selectNewDiagnostics(
			[diagnostic],
			new Set(),
			(selection) => selection.line === 10 // pretend the cursor is on line 10
		);

		assert.strictEqual(toLog.length, 0);
		assert.strictEqual(updatedLogged.size, 0);
	});

	test('logs a deferred diagnostic once the cursor moves off that line', () => {
		const diagnostic = makeDiagnostic(9, 12, 'invalid_assignment');
		const deferred = selectNewDiagnostics([diagnostic], new Set(), (selection) => selection.line === 10);
		const afterMove = selectNewDiagnostics([diagnostic], deferred.updatedLogged);

		assert.strictEqual(afterMove.toLog.length, 1);
	});
});