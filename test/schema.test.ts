import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isErrorEvent } from '../src/schema';

test('isErrorEvent accepts a well-formed event', () => {
  assert.equal(
    isErrorEvent({
      errorType: 'ts:2304',
      file: 'src/index.ts',
      line: 12,
      language: 'typescript',
      timestamp: new Date().toISOString(),
      muted: false,
    }),
    true
  );
});

test('isErrorEvent rejects missing fields', () => {
  assert.equal(isErrorEvent({ errorType: 'ts:2304' }), false);
});

test('isErrorEvent rejects wrong field types', () => {
  assert.equal(
    isErrorEvent({
      errorType: 'ts:2304',
      file: 'src/index.ts',
      line: '12', // should be a number
      language: 'typescript',
      timestamp: new Date().toISOString(),
      muted: false,
    }),
    false
  );
});

test('isErrorEvent rejects an invalid timestamp', () => {
  assert.equal(
    isErrorEvent({
      errorType: 'ts:2304',
      file: 'src/index.ts',
      line: 12,
      language: 'typescript',
      timestamp: 'not-a-date',
      muted: false,
    }),
    false
  );
});
