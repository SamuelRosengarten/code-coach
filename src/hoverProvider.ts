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
 * replacing the raw diagnostic message for the coached error type (issue
 * #6). Returns undefined when there's no matching diagnostic there, or
 * when that error type is currently muted (issue #7) — in which case the
 * editor just falls back to VS Code's normal diagnostic hover.
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
