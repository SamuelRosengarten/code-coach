/**
 * Minimal shape of vscode.Memento (what ExtensionContext.workspaceState
 * implements), kept local so this module doesn't need to import 'vscode'
 * and can be unit tested with a plain in-memory fake.
 *
 * `get<T>` is a generic method: `T` is a placeholder type filled in by
 * whoever calls it, e.g. `state.get<OccurrenceRecord>(...)` returns an
 * OccurrenceRecord, while `state.get<number>(...)` returns a number — same
 * method, different result type depending on how it's called.
 */
export interface MementoLike {
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: unknown): Thenable<void> | void;
}

interface OccurrenceRecord {
  count: number;
  windowStart: number;
}

const KEY_PREFIX = 'codeCoach.errorOccurrences.';

const DEFAULT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const DEFAULT_THRESHOLD = 3; // mute after the 4th occurrence in a window

/**
 * Tracks how many times each error type has fired within a rolling time
 * window, persisted via ExtensionContext.workspaceState so the count
 * survives across diagnostics events. Once an error type exceeds the
 * threshold within the window, it's considered muted until the window
 * resets.
 */
export class MuteTracker {
  // Writing `private readonly` directly on a constructor parameter is
  // shorthand for declaring a class field of the same name and assigning
  // it from the argument — e.g. `state` below is both the parameter and
  // now a `this.state` property, without a separate `this.state = state`.
  constructor(
    private readonly state: MementoLike,
    private readonly windowMs: number = DEFAULT_WINDOW_MS,
    private readonly threshold: number = DEFAULT_THRESHOLD
  ) {}

  private key(errorType: string): string {
    return `${KEY_PREFIX}${errorType}`;
  }

  private getRecord(errorType: string): OccurrenceRecord | undefined {
    return this.state.get<OccurrenceRecord | undefined>(this.key(errorType), undefined);
  }

  /** Read-only check: is this error type currently muted, without recording a new occurrence? */
  isMuted(errorType: string, now: number = Date.now()): boolean {
    const record = this.getRecord(errorType);
    if (!record || now - record.windowStart > this.windowMs) {
      return false;
    }
    return record.count > this.threshold;
  }

  /** Records one more occurrence of this error type and returns whether it should now be muted. */
  recordAndShouldMute(errorType: string, now: number = Date.now()): boolean {
    const record = this.getRecord(errorType);
    const next: OccurrenceRecord =
      !record || now - record.windowStart > this.windowMs
        ? { count: 1, windowStart: now }
        : { count: record.count + 1, windowStart: record.windowStart };

    this.state.update(this.key(errorType), next);
    return next.count > this.threshold;
  }
}
