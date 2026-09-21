import { test } from 'node:test';
import assert from 'node:assert/strict';
import { errorTypeFor, FRIENDLY_HINT, getHint, isTargetDiagnostic } from '../src/hints';

test('getHint returns the friendly hint for TS2304 (Cannot find name)', () => {
  const diagnostic = { source: 'ts', code: 2304, message: "Cannot find name 'foo'." };
  assert.equal(getHint(diagnostic), FRIENDLY_HINT);
  assert.equal(isTargetDiagnostic(diagnostic), true);
});

test('getHint handles the object-form diagnostic code VS Code sometimes uses', () => {
  const diagnostic = { source: 'ts', code: { value: 2304 }, message: "Cannot find name 'foo'." };
  assert.equal(getHint(diagnostic), FRIENDLY_HINT);
});

test('getHint returns undefined for a different error code', () => {
  const diagnostic = { source: 'ts', code: 1005, message: "';' expected." };
  assert.equal(getHint(diagnostic), undefined);
});

test('getHint returns undefined for a different source', () => {
  const diagnostic = { source: 'eslint', code: 2304, message: 'no-undef' };
  assert.equal(getHint(diagnostic), undefined);
});

test('errorTypeFor produces a stable identifier', () => {
  assert.equal(errorTypeFor({ source: 'ts', code: 2304, message: 'x' }), 'ts:2304');
});
