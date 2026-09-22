import * as assert from 'assert';
import { getHint } from '../hints/hints';

suite('Hints Test Suite', () => {
	test('returns a language-specific hint when one exists', () => {
		const hint = getHint('undefined_identifier', 'dart');
		assert.match(hint, /isn't defined/);
	});

	test('returns a generic hint for a code shared across languages', () => {
		const hint = getHint('no-unused-vars', 'javascript');
		assert.match(hint, /isn't used/);
	});

	test('falls back to the generic message for an unknown error type', () => {
		const hint = getHint('totally_unknown_code', 'rust');
		assert.strictEqual(hint, "New mistake spotted — take a moment to read the error message before fixing it.");
	});

	test('does not leak a specific-language hint to a different language with the same code', () => {
		const hint = getHint('undefined_identifier', 'python');
		assert.strictEqual(hint, "New mistake spotted — take a moment to read the error message before fixing it.");
	});
});
