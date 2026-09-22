/**
 * A short (2-3 word) display name for an error type, used only in the
 * dashboard (e.g. "Type mismatch" as a chart label) rather than as the
 * full hint sentence shown in the editor — see src/hints/hints.ts for that.
 */
interface LabelEntry {
	errorType: string;
	language?: string;
	label: string;
}

const LABELS: LabelEntry[] = [
	// TypeScript / JavaScript
	{ errorType: '2345', language: 'typescript', label: 'Argument type mismatch' },
	{ errorType: '2322', language: 'typescript', label: 'Type mismatch' },
	{ errorType: '2304', language: 'typescript', label: 'Unknown name' },
	{ errorType: 'no-unused-vars', label: 'Unused variable' },
	{ errorType: 'no-undef', label: 'Unknown name' },

	// Dart
	{ errorType: 'undefined_identifier', language: 'dart', label: 'Unknown name' },
	{ errorType: 'undefined_named_parameter', language: 'dart', label: 'Unknown named parameter' },
	{ errorType: 'return_of_invalid_type', language: 'dart', label: 'Wrong return type' },
	{ errorType: 'argument_type_not_assignable', language: 'dart', label: 'Argument type mismatch' },
	{ errorType: 'invalid_assignment', language: 'dart', label: 'Type mismatch' },

	// Python
	{ errorType: 'reportUndefinedVariable', language: 'python', label: 'Unknown name' },
	{ errorType: 'reportArgumentType', language: 'python', label: 'Argument type mismatch' },
];

/**
 * Turns a raw error code with no curated label into a readable guess, e.g.
 * 'some_weird_code' -> 'Some weird code'. Used only when nothing in LABELS
 * above matches.
 */
function titleCaseFallback(errorType: string): string {
	const spaced = errorType.replace(/[_-]+/g, ' ').trim();
	if (spaced.length === 0) {
		return errorType;
	}
	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Same specific-then-generic-then-fallback lookup order as getHint() in ./hints.ts. */
export function getKindLabel(errorType: string, language: string): string {
	const specific = LABELS.find((l) => l.errorType === errorType && l.language === language);
	if (specific) {
		return specific.label;
	}
	const generic = LABELS.find((l) => l.errorType === errorType && l.language === undefined);
	if (generic) {
		return generic.label;
	}
	return titleCaseFallback(errorType);
}
