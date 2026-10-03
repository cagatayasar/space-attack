import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DiveFlight, DIVE, diveInterval, diveLimit } from '../src/dives.ts';

test('a dive descends in straight segments and reflects off both sides', () => {
  const home = { x: 400, y: 140 };
  const right = new DiveFlight({ x: DIVE.maxX - 12, y: 140 }, 1, 1);
  const left = new DiveFlight({ x: DIVE.minX + 12, y: 140 }, -1, 1);
  const r = right.update(0.3, home);
  const l = left.update(0.3, home);
  assert.equal(r.x, DIVE.maxX - 24);
  assert.equal(l.x, DIVE.minX + 24);
  assert.equal(r.y, 159.5);
  assert.equal(l.y, 159.5);
  assert.equal(r.done, false);
});

test('a surviving diver passes the player and returns visibly to its current slot', () => {
  const flight = new DiveFlight({ x: 500, y: 140 }, -1, 1);
  const nearBottom = flight.update((DIVE.bottom - 141) / DIVE.speedY, { x: 440, y: 140 });
  assert.equal(nearBottom.y, DIVE.bottom - 1);
  assert.equal(nearBottom.done, false);
  const returned = flight.update(0.02, { x: 320, y: 140 });
  assert.deepEqual(returned, { x: 320, y: 140, done: true, visible: true });
});

test('divers stay visible throughout flight and return at different frame rates', () => {
  const home = { x: 400, y: 140 };
  for (const fps of [30, 60, 144]) {
    const flight = new DiveFlight(home, 1, 1, () => 1);
    let previous = flight.update(0, home);
    assert.equal(previous.visible, true);
    for (let frame = 0; frame < fps * 8 && !previous.done; frame++) {
      const position = flight.update(1 / fps, home);
      assert.equal(position.visible, true);
      if (!position.done) assert.ok(position.y > previous.y);
      previous = position;
    }
    assert.equal(previous.done, true);
    assert.equal(previous.x, home.x);
    assert.equal(previous.y, home.y);
  }
});

test('dive paths reflect consistently across frame rates without following the moving home slot', () => {
  for (const side of [-1, 1]) {
    const reference = new DiveFlight({ x: 110, y: 96 }, side, 1, () => 1).update(5, { x: 400, y: 96 });
    for (const fps of [30, 60, 144]) {
      const flight = new DiveFlight({ x: 110, y: 96 }, side, 1, () => 1);
      let position;
      for (let i = 0; i < fps * 5; i++) {
        position = flight.update(1 / fps, { x: 250 + i % 100, y: 96 });
        assert.ok(position.x >= DIVE.minX && position.x <= DIVE.maxX);
      }
      assert.ok(Math.abs(position!.x - reference.x) < 0.001);
      assert.ok(Math.abs(position!.y - reference.y) < 0.001);
    }
  }
});

test('random turns reverse horizontal movement away from walls without interrupting descent', () => {
  const home = { x: 400, y: 140 };
  const turning = new DiveFlight(home, 1, 1, () => 0);
  const straight = new DiveFlight(home, 1, 1, () => 1);
  const before = turning.update(0.6, home);
  const after = turning.update(0.2, home);
  const noTurn = straight.update(0.8, home);
  assert.ok(before.x > home.x && before.x < DIVE.maxX);
  assert.ok(after.x < before.x);
  assert.ok(noTurn.x > before.x);
  assert.ok(after.y > before.y);
  assert.equal(after.y, noTurn.y);
});

test('random-turn timing and wall bounces agree across frame rates and long updates', () => {
  const randomSequence = () => {
    let index = 0;
    const values = [0.9, 0.1, 0.8, 0.2, 0.7, 0.6, 0.05];
    return () => values[index++ % values.length];
  };
  const start = { x: DIVE.maxX - 12, y: 96 };
  const home = { x: 400, y: 96 };
  const expected = new DiveFlight(start, 1, 1, randomSequence()).update(4.8, home);
  for (const fps of [30, 60, 144]) {
    const flight = new DiveFlight(start, 1, 1, randomSequence());
    let actual = flight.update(0, home);
    for (let i = 0; i < Math.floor(4.8 * fps); i++) {
      actual = flight.update(1 / fps, home);
      assert.ok(actual.x >= DIVE.minX && actual.x <= DIVE.maxX);
    }
    actual = flight.update(4.8 - Math.floor(4.8 * fps) / fps, home);
    assert.ok(Math.abs(actual.x - expected.x) < 0.001);
    assert.ok(Math.abs(actual.y - expected.y) < 0.001);
    const next = flight.update(0.1, home);
    const reference = new DiveFlight(start, 1, 1, randomSequence()).update(4.9, home);
    assert.ok(Math.abs(next.x - reference.x) < 0.001);
  }
});

test('wave one permits overlapping attacks, with bounded later-wave difficulty', () => {
  assert.ok(diveLimit(1) >= 2);
  assert.ok(diveInterval(1) < (DIVE.bottom - 206) / DIVE.speedY);
  assert.ok(diveLimit(3) > diveLimit(1));
  assert.equal(diveLimit(100), 4);
  assert.ok(diveInterval(3) < diveInterval(1));
  assert.equal(diveInterval(100), 1);
  const late = new DiveFlight({ x: 400, y: 200 }, 1, 100).update(1, { x: 400, y: 200 });
  const early = new DiveFlight({ x: 400, y: 200 }, 1, 1).update(1, { x: 400, y: 200 });
  assert.ok(late.y > early.y);
  assert.ok(late.y < 300);
});
