import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PlayerSurvival, SURVIVAL } from '../src/survival.ts';

test('a hit holds the HUD through the explosion, then consumes a life before respawning', () => {
  const player = new PlayerSurvival();
  player.update(10);
  assert.equal(player.damage(), true);
  assert.equal(player.phase, 'dying');
  assert.equal(player.canAct, false);
  player.update(SURVIVAL.explosionSeconds - 0.01);
  assert.equal(player.lives, 3);
  assert.equal(player.energy, 0.75);
  assert.equal(player.damage(), false);
  player.update(0.01);
  assert.equal(player.phase, 'absent');
  assert.equal(player.lives, 2);
  assert.equal(player.energy, 1);
  assert.equal(player.damage(), false);
  player.update(SURVIVAL.absentSeconds - 0.01);
  assert.equal(player.canAct, false);
  assert.equal(player.energy, 1);
  player.update(0.01);
  assert.equal(player.phase, 'active');
  assert.equal(player.canAct, true);
  assert.equal(player.lives, 2);
  assert.equal(player.damage(), true);
});

test('energy exhaustion enters the same sequence without consuming a reserve early', () => {
  const player = new PlayerSurvival();
  assert.equal(player.update(SURVIVAL.energySeconds / 2), false);
  assert.equal(player.energy, 0.5);
  assert.equal(player.update(SURVIVAL.energySeconds / 2), true);
  assert.equal(player.phase, 'dying');
  assert.equal(player.lives, 3);
  assert.equal(player.energy, 0);
  player.update(SURVIVAL.explosionSeconds);
  assert.equal(player.lives, 2);
  assert.equal(player.energy, 1);
});

test('the final life plays its explosion before game over, without respawning', () => {
  const player = new PlayerSurvival();
  player.lives = 1;
  player.damage();
  assert.equal(player.phase, 'dying');
  assert.equal(player.lives, 1);
  player.update(SURVIVAL.explosionSeconds);
  assert.equal(player.phase, 'gameover');
  assert.equal(player.lives, 0);
  assert.equal(player.energy, 0);
  assert.equal(player.damage(), false);
  assert.equal(player.update(100), false);
  assert.equal(player.phase, 'gameover');
});

test('restart clears every death phase and any pending life loss', () => {
  for (const elapsed of [0, SURVIVAL.explosionSeconds, 100]) {
    const player = new PlayerSurvival();
    player.lives = elapsed === 100 ? 1 : 3;
    player.damage();
    player.update(elapsed);
    player.reset();
    assert.equal(player.phase, 'active');
    assert.equal(player.lives, 3);
    assert.equal(player.energy, 1);
    player.update(5);
    assert.equal(player.lives, 3);
    assert.equal(player.energy, 0.875);
  }
});

test('death timers carry frame overshoot into absence and active energy drain', () => {
  const player = new PlayerSurvival();
  player.damage();
  player.update(SURVIVAL.explosionSeconds + SURVIVAL.absentSeconds + 2);
  assert.equal(player.phase, 'active');
  assert.equal(player.lives, 2);
  assert.ok(Math.abs(player.energy - 0.95) < 1e-9);
});

test('energy drain and death timing agree at common frame rates', () => {
  for (const fps of [30, 60, 144]) {
    const player = new PlayerSurvival();
    for (let i = 0; i < fps * SURVIVAL.energySeconds; i++) player.update(1 / fps);
    assert.equal(player.phase, 'dying');
    assert.equal(player.lives, 3);
    for (let i = 0; i < fps * SURVIVAL.explosionSeconds; i++) player.update(1 / fps);
    assert.equal(player.phase, 'absent');
    assert.equal(player.lives, 2);
    for (let i = 0; i < Math.ceil(fps * SURVIVAL.absentSeconds); i++) player.update(1 / fps);
    assert.equal(player.phase, 'active');
    assert.equal(player.lives, 2);
  }
});
