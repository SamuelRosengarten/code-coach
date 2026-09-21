import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  ensureStorageFolder,
  getStorageFolder,
  __resetStorageCacheForTests,
} from '../src/storage';

function makeTempParent(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'code-coach-storage-'));
}

test('ensureStorageFolder creates a missing folder (clean install, issue #25)', () => {
  const parent = makeTempParent();
  const target = path.join(parent, 'globalStorage', 'code-coach');
  assert.equal(fs.existsSync(target), false);

  const result = ensureStorageFolder(target);

  assert.equal(result, target);
  assert.equal(fs.existsSync(target), true);
  assert.equal(fs.statSync(target).isDirectory(), true);
});

test('ensureStorageFolder is idempotent when the folder already exists', () => {
  const parent = makeTempParent();
  const target = path.join(parent, 'already-there');
  fs.mkdirSync(target, { recursive: true });

  assert.doesNotThrow(() => ensureStorageFolder(target));
  assert.equal(fs.existsSync(target), true);
});

test('getStorageFolder resolves from globalStorageUri and caches the result', () => {
  __resetStorageCacheForTests();
  const parent = makeTempParent();
  const target = path.join(parent, 'globalStorage', 'code-coach');
  const fakeContext = { globalStorageUri: { fsPath: target } };

  const first = getStorageFolder(fakeContext);
  assert.equal(first, target);
  assert.equal(fs.existsSync(target), true);

  // A second call with a *different* path should still return the cached
  // value (issue #24: resolved once, reused after) instead of re-resolving.
  const otherContext = { globalStorageUri: { fsPath: path.join(parent, 'other') } };
  const second = getStorageFolder(otherContext);
  assert.equal(second, target);

  __resetStorageCacheForTests();
});
