import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WaveTransition, WAVE_CLEAR_SECONDS } from '../src/waves.ts';

test('the final kill starts a full delay before the next wave can spawn', () => {
  const transition = new WaveTransition();
  assert.equal(transition.update(1, 1), false);
  assert.equal(transition.update(0.05, 0), false);
  assert.equal(transition.update(WAVE_CLEAR_SECONDS - 0.001, 0), false);
  assert.equal(transition.update(0.001, 0), true);
});

test('wave clearance waits for every surviving enemy, including hidden divers', () => {
  const transition = new WaveTransition();
  for (let frame = 0; frame < 600; frame++) {
    assert.equal(transition.update(1 / 60, 1), false);
  }
  assert.equal(transition.update(1 / 60, 0), false);
  assert.equal(transition.update(WAVE_CLEAR_SECONDS, 0), true);
});

test('a new wave or restart discards the previous transition countdown', () => {
  const transition = new WaveTransition();
  for (const elapsed of [0.1, WAVE_CLEAR_SECONDS]) {
    transition.update(0, 0);
    transition.update(elapsed, 0);
    transition.reset();
    assert.equal(transition.update(0.05, 0), false);
    assert.equal(transition.update(WAVE_CLEAR_SECONDS / 2, 0), false);
    assert.equal(transition.update(WAVE_CLEAR_SECONDS / 2, 0), true);
  }
});

test('wave delay is consistent at common frame rates', () => {
  for (const fps of [30, 60, 144]) {
    const transition = new WaveTransition();
    transition.update(1 / fps, 0);
    let frames = 0;
    while (!transition.update(1 / fps, 0)) {
      frames++;
      assert.ok(frames < fps);
    }
    assert.ok(Math.abs((frames + 1) / fps - WAVE_CLEAR_SECONDS) < 1e-9);
  }
});
