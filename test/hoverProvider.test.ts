import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHoverMessage, DiagnosticWithRange } from '../src/hoverProvider';
import { FRIENDLY_HINT } from '../src/hints';

const targetDiagnostic: DiagnosticWithRange = {
  source: 'ts',
  code: 2304,
  message: "Cannot find name 'foo'.",
  range: { start: { line: 4, character: 2 }, end: { line: 4, character: 5 } },
};

const otherDiagnostic: DiagnosticWithRange = {
  source: 'ts',
  code: 1005,
  message: "';' expected.",
  range: { start: { line: 9, character: 0 }, end: { line: 9, character: 1 } },
};

test('renders the friendly hint when the cursor is inside the target diagnostic range', () => {
  const message = buildHoverMessage([targetDiagnostic, otherDiagnostic], { line: 4, character: 3 }, () => false);
  assert.equal(message, FRIENDLY_HINT);
});

test('returns undefined outside any diagnostic range', () => {
  const message = buildHoverMessage([targetDiagnostic], { line: 4, character: 10 }, () => false);
  assert.equal(message, undefined);
});

test('returns undefined for a diagnostic that is not the coached error type', () => {
  const message = buildHoverMessage([otherDiagnostic], { line: 9, character: 0 }, () => false);
  assert.equal(message, undefined);
});

test('falls back to raw diagnostics (undefined) once the error type is muted', () => {
  const message = buildHoverMessage([targetDiagnostic], { line: 4, character: 3 }, () => true);
  assert.equal(message, undefined);
});
