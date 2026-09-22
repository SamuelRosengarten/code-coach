import { DiagnosticCodeLike, errorTypeFor, getHint } from './hints';

export interface PositionLike {
  line: number;
  character: number;
}

export interface RangeLike {
  start: PositionLike;
  end: PositionLike;
}

export interface DiagnosticWithRange extends DiagnosticCodeLike {
  range: RangeLike;
}

/**
 * Is `position` (the cursor the user is hovering over) inside `range` (the
 * span of a diagnostic, which can cover more than one line)?
 *
 * This can't just compare line numbers, because on the range's first/last
 * line the character (column) also matters — e.g. a range from line 4
 * col 10 to line 4 col 15 doesn't include line 4 col 2. So the checks
 * below rule out being before the start line/column, then rule out being
 * after the end line/column; anything left over is inside the range.
 */
function containsPosition(range: RangeLike, position: PositionLike): boolean {
  if (position.line < range.start.line || position.line > range.end.line) {
    return false;
  }
  if (position.line === range.start.line && position.character < range.start.character) {
    return false;
  }
  if (position.line === range.end.line && position.character > range.end.character) {
    return false;
  }
  return true;
}

/**
 * Picks the friendly hint (if any) that should be shown at `position`,
 * replacing the raw diagnostic message for the coached error type.
 * Returns undefined when there's no matching diagnostic there, or when
 * that error type is currently muted — in which case the editor just
 * falls back to VS Code's normal diagnostic hover.
 */
export function buildHoverMessage(
  diagnostics: readonly DiagnosticWithRange[],
  position: PositionLike,
  isMuted: (errorType: string) => boolean
): string | undefined {
  for (const diagnostic of diagnostics) {
    if (!containsPosition(diagnostic.range, position)) {
      continue;
    }
    const hint = getHint(diagnostic);
    if (!hint) {
      continue;
    }
    if (isMuted(errorTypeFor(diagnostic))) {
      continue;
    }
    return hint;
  }
  return undefined;
}
