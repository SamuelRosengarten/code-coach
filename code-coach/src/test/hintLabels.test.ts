import * as assert from 'assert';
import { getKindLabel } from '../hints/hintLabels';

suite('Hint Labels Test Suite', () => {
	test('returns a language-specific label when one exists', () => {
		assert.strictEqual(getKindLabel('invalid_assignment', 'dart'), 'Type mismatch');
	});

	test('returns a generic label shared across languages', () => {
		assert.strictEqual(getKindLabel('no-unused-vars', 'javascript'), 'Unused variable');
	});

	test('falls back to a title-cased version of an unknown error type', () => {
		assert.strictEqual(getKindLabel('some_weird_code', 'rust'), 'Some weird code');
	});

	test('falls back gracefully for a code with no separators', () => {
		assert.strictEqual(getKindLabel('typo', 'rust'), 'Typo');
	});
});
