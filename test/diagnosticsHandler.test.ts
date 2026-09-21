import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { processDiagnostics, DiagnosticForProcessing } from '../src/diagnosticsHandler';
import { MuteTracker, MementoLike } from '../src/muteTracker';
import { getLogFilePath } from '../src/logger';
import { isErrorEvent, ErrorEvent } from '../src/schema';

function makeMemento(): MementoLike {
  const store = new Map<string, unknown>();
  return {
    get<T>(key: string, defaultValue: T): T {
      return store.has(key) ? (store.get(key) as T) : defaultValue;
    },
    update(key: string, value: unknown) {
      store.set(key, value);
    },
  };
}

test('logs every diagnostic to the console (issue #4) and only writes events to the log for the coached error type', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-coach-handler-'));
  const logFilePath = getLogFilePath(dir);
  const muteTracker = new MuteTracker(makeMemento(), 10_000, 100);

  const loggedLines: string[] = [];
  const diagnostics: DiagnosticForProcessing[] = [
    {
      source: 'ts',
      code: 2304,
      message: "Cannot find name 'foo'.",
      range: { start: { line: 3 } },
    },
    {
      source: 'ts',
      code: 1005,
      message: "';' expected.",
      range: { start: { line: 7 } },
    },
  ];

  processDiagnostics(diagnostics, 'src/index.ts', {
    logFilePath,
    muteTracker,
    languageId: 'typescript',
    log: (msg: unknown) => loggedLines.push(String(msg)),
  });

  // Both diagnostics are logged to the console for visibility.
  assert.equal(loggedLines.length, 2);
  assert.match(loggedLines[0], /src\/index\.ts:4/);
  assert.match(loggedLines[1], /src\/index\.ts:8/);

  // Only the coached error type (TS2304) is written to the JSONL log.
  const lines = fs.readFileSync(logFilePath, 'utf8').split('\n').filter(Boolean);
  assert.equal(lines.length, 1);
  const event = JSON.parse(lines[0]) as ErrorEvent;
  assert.equal(isErrorEvent(event), true);
  assert.equal(event.errorType, 'ts:2304');
  assert.equal(event.line, 4);
  assert.equal(event.muted, false);
});

test('end-to-end: repeated target errors get muted after the threshold and it is reflected in the log', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-coach-handler-e2e-'));
  const logFilePath = getLogFilePath(dir);
  const muteTracker = new MuteTracker(makeMemento(), 10_000, 2); // mute after 3rd occurrence

  let tick = 0;
  const diagnostic: DiagnosticForProcessing = {
    source: 'ts',
    code: 2304,
    message: "Cannot find name 'foo'.",
    range: { start: { line: 0 } },
  };

  for (let i = 0; i < 5; i++) {
    processDiagnostics([diagnostic], 'src/index.ts', {
      logFilePath,
      muteTracker,
      languageId: 'typescript',
      now: () => tick++,
      log: () => {},
    });
  }

  const events = fs
    .readFileSync(logFilePath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as ErrorEvent);

  assert.equal(events.length, 5);
  assert.deepEqual(
    events.map((e) => e.muted),
    [false, false, true, true, true]
  );
});
