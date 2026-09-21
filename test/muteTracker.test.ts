import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MementoLike, MuteTracker } from '../src/muteTracker';

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

test('does not mute until the occurrence count exceeds the threshold', () => {
  const tracker = new MuteTracker(makeMemento(), 10_000, 3);
  const now = 1_000;

  assert.equal(tracker.recordAndShouldMute('ts:2304', now), false); // 1
  assert.equal(tracker.recordAndShouldMute('ts:2304', now + 1), false); // 2
  assert.equal(tracker.recordAndShouldMute('ts:2304', now + 2), false); // 3
  assert.equal(tracker.recordAndShouldMute('ts:2304', now + 3), true); // 4 -> muted
});

test('isMuted reflects state without recording a new occurrence', () => {
  const memento = makeMemento();
  const tracker = new MuteTracker(memento, 10_000, 1);
  const now = 1_000;

  tracker.recordAndShouldMute('ts:2304', now);
  tracker.recordAndShouldMute('ts:2304', now + 1);
  assert.equal(tracker.isMuted('ts:2304', now + 1), true);

  // Checking doesn't itself count as an occurrence.
  assert.equal(tracker.isMuted('ts:2304', now + 1), true);
});

test('the window resets the count once it elapses', () => {
  const tracker = new MuteTracker(makeMemento(), 10_000, 1);
  const now = 1_000;

  tracker.recordAndShouldMute('ts:2304', now);
  assert.equal(tracker.recordAndShouldMute('ts:2304', now + 1), true); // muted within window

  const afterWindow = now + 20_000;
  assert.equal(tracker.isMuted('ts:2304', afterWindow), false);
  assert.equal(tracker.recordAndShouldMute('ts:2304', afterWindow), false); // fresh window
});

test('different error types are tracked independently', () => {
  const tracker = new MuteTracker(makeMemento(), 10_000, 0);
  const now = 1_000;

  assert.equal(tracker.recordAndShouldMute('ts:2304', now), true);
  assert.equal(tracker.isMuted('eslint:no-undef', now), false);
});
