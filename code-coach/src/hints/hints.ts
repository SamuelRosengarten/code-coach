/**
 * One entry in the built-in, offline hint library below. `language` is
 * optional: leaving it out (e.g. 'no-unused-vars') makes the entry match
 * that error code in *any* language, while entries that set it only match
 * that one language — see getHint()'s specific-before-generic lookup order.
 */
interface HintEntry {
	errorType: string;
	language?: string;
	message: string;
}

const FALLBACK_HINT = 'New mistake spotted — take a moment to read the error message before fixing it.';

// The rule-based hint library — free, instant, fully offline. Used as-is
// when codeCoach.hintProvider is "off" (the default), and as the fallback
// text if AI rewording (src/hints/rewordHint.ts) is enabled but fails.
const HINTS: HintEntry[] = [
	// TypeScript / JavaScript
	{ errorType: '2345', language: 'typescript', message: "Type mismatch — check the argument's type against what the function expects." },
	{ errorType: '2322', language: 'typescript', message: "You're assigning a value of the wrong type. Hover the variable to see its declared type." },
	{ errorType: '2304', language: 'typescript', message: "This name isn't defined here — check the spelling or a missing import." },
	{ errorType: 'no-unused-vars', message: "This variable isn't used anywhere. Remove it or use it." },
	{ errorType: 'no-undef', message: "This name isn't defined — check for a typo or a missing import." },

	// Dart
	{ errorType: 'undefined_identifier', language: 'dart', message: "This identifier isn't defined — check the spelling or add the missing declaration." },
	{ errorType: 'undefined_named_parameter', language: 'dart', message: "This named parameter doesn't exist on the target. Check the constructor/method signature." },
	{ errorType: 'return_of_invalid_type', language: 'dart', message: "The returned value's type doesn't match the function's declared return type." },
	{ errorType: 'argument_type_not_assignable', language: 'dart', message: "This argument's type doesn't match what the parameter expects." },
	{ errorType: 'invalid_assignment', language: 'dart', message: "The value's type doesn't match the variable's declared type." },

	// Python
	{ errorType: 'reportUndefinedVariable', language: 'python', message: "This name isn't defined — check the spelling or a missing import." },
	{ errorType: 'reportArgumentType', language: 'python', message: "This argument's type doesn't match what the function expects." },
];

/**
 * Looks up the hint text for one error. Tries a language-specific entry
 * first (e.g. Dart's 'undefined_identifier'), then a generic one that
 * applies to any language (e.g. 'no-unused-vars'), then falls back to a
 * generic "something's wrong here" message so there's always something to
 * show.
 */
export function getHint(errorType: string, language: string): string {
	const specific = HINTS.find((h) => h.errorType === errorType && h.language === language);
	if (specific) {
		return specific.message;
	}
	const generic = HINTS.find((h) => h.errorType === errorType && h.language === undefined);
	if (generic) {
		return generic.message;
	}
	return FALLBACK_HINT;
}
