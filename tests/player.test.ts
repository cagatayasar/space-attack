import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAYER, PlayerControls } from '../src/player.ts';

test('horizontal motion is consistent at 30, 60 and 144 FPS', () => {
  for (const fps of [30, 60, 144]) {
    const player = new PlayerControls();
    for (let frame = 0; frame < fps / 3; frame++) player.update(1 / fps, false, true, false);
    assert.ok(Math.abs(player.x - 600) < 0.001);
  }
});

test('movement stops immediately, cancels opposing keys, and clamps at both edges', () => {
  const player = new PlayerControls();
  player.update(0.1, false, true, false);
  assert.equal(player.x, 460);
  player.update(0.1, false, false, false);
  player.update(0.1, true, true, false);
  assert.equal(player.x, 460);
  player.update(2, false, true, false);
  assert.equal(player.x, PLAYER.maxX);
  player.update(2, true, false, false);
  assert.equal(player.x, PLAYER.minX);
});

test('multiple shots remain in flight and keep their launch columns while the player moves', () => {
  const player = new PlayerControls();
  player.update(0, false, false, true);
  const first = player.shots[0];
  const startY = first.y;
  for (let i = 0; i < 45; i++) player.update(0.01, false, true, true);
  assert.equal(player.shots[0], first);
  assert.equal(player.shots.length, 2);
  assert.equal(first.x, 400);
  assert.ok(player.shots[1].x > first.x);
  assert.ok(Math.abs(first.y - (startY - 445.5)) < 0.001);
});

test('held fire maintains shot spacing across frame rates', () => {
  for (const fps of [30, 60, 144]) {
    const player = new PlayerControls();
    player.update(0, false, false, true);
    for (let i = 0; i < Math.ceil(fps * 0.45); i++) player.update(1 / fps, false, false, true);
    assert.equal(player.shots.length, 2);
    for (let i = 1; i < player.shots.length; i++) {
      assert.ok(Math.abs(player.shots[i].y - player.shots[i - 1].y - PLAYER.shotInterval * PLAYER.shotSpeed) < 0.001);
    }
  }
});

test('releasing fire lets existing shots finish without creating more', () => {
  const player = new PlayerControls();
  player.update(0, false, false, true);
  for (let i = 0; i < 60; i++) player.update(1 / 60, false, false, false);
  assert.equal(player.shots.length, 0);
});

test('swept shots detect crossed enemies, including on the final frame before leaving the top', () => {
  const player = new PlayerControls();
  player.update(0, false, false, true);
  player.update(0.05, false, false, false);
  assert.equal(player.hit(player.shots[0], { x: 390, y: 519, width: 20, height: 4 }), true);
  assert.equal(player.hit(player.shots[0], { x: 410, y: 519, width: 20, height: 4 }), false);
  player.shots[0].y = 100;
  player.update(0.05, false, false, false);
  assert.equal(player.shots.length, 1);
  assert.equal(player.hit(player.shots[0], { x: 390, y: 88, width: 20, height: 16 }), true);
  player.update(0.01, false, false, false);
  assert.equal(player.shots.length, 0);
});

test('restart clears shots, firing cooldown, and player position', () => {
  const player = new PlayerControls();
  player.update(0.2, false, true, true);
  player.reset();
  assert.equal(player.x, PLAYER.startX);
  assert.equal(player.shots.length, 0);
  player.update(0, false, false, true);
  assert.equal(player.shots.length, 1);
});

test('death clears shots and cooldown without moving the respawn position', () => {
  const player = new PlayerControls();
  player.update(0.2, false, true, true);
  const impactX = player.x;
  player.clearFire();
  assert.equal(player.x, impactX);
  assert.equal(player.shots.length, 0);
  player.update(0, false, false, true);
  assert.equal(player.shots.length, 1);
  assert.equal(player.shots[0].x, impactX);
});
