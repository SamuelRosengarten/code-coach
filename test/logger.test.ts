import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { appendErrorEvent, getLogFilePath, LOG_FILE_NAME } from '../src/logger';
import { isErrorEvent, ErrorEvent } from '../src/schema';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'code-coach-logger-'));
}

function makeEvent(overrides: Partial<ErrorEvent> = {}): ErrorEvent {
  return {
    errorType: 'ts:2304',
    file: 'src/index.ts',
    line: 1,
    language: 'typescript',
    timestamp: new Date().toISOString(),
    muted: false,
    ...overrides,
  };
}

test('getLogFilePath joins the storage folder and log file name', () => {
  assert.equal(getLogFilePath('/tmp/code-coach'), path.join('/tmp/code-coach', LOG_FILE_NAME));
});

test('appendErrorEvent creates the file on first write', () => {
  const dir = makeTempDir();
  const logFilePath = getLogFilePath(dir);
  assert.equal(fs.existsSync(logFilePath), false);

  const ok = appendErrorEvent(logFilePath, makeEvent());

  assert.equal(ok, true);
  assert.equal(fs.existsSync(logFilePath), true);
});

test('trigger the target error a few times, then confirm every line parses as valid JSON matching the schema', () => {
  const dir = makeTempDir();
  const logFilePath = getLogFilePath(dir);

  for (let i = 0; i < 4; i++) {
    appendErrorEvent(
      logFilePath,
      makeEvent({ line: 10 + i, muted: i >= 3, timestamp: new Date(Date.now() + i).toISOString() })
    );
  }

  const lines = fs.readFileSync(logFilePath, 'utf8').split('\n').filter(Boolean);
  assert.equal(lines.length, 4);

  for (const line of lines) {
    const parsed = JSON.parse(line);
    assert.equal(isErrorEvent(parsed), true, `line did not match schema: ${line}`);
  }

  const parsedEvents = lines.map((l) => JSON.parse(l) as ErrorEvent);
  assert.deepEqual(
    parsedEvents.map((e) => e.muted),
    [false, false, false, true]
  );
});

test('appendErrorEvent survives write failures without throwing', () => {
  const dir = makeTempDir();
  // Point the "log file" at a directory instead of a file so the write fails.
  const badPath = path.join(dir, 'not-a-file');
  fs.mkdirSync(badPath);

  assert.doesNotThrow(() => {
    const ok = appendErrorEvent(badPath, makeEvent());
    assert.equal(ok, false);
  });
});
