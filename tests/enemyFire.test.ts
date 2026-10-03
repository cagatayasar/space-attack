import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENEMY_FIRE, EnemyFire, enemyShotInterval, enemyShotLimit } from '../src/enemyFire.ts';
import { PlayerSurvival, SURVIVAL } from '../src/survival.ts';

const divers = [{ x: 400, y: 200 }, { x: 200, y: 250 }];

test('later waves produce more hostile shots over the same time, with bounded difficulty', () => {
  const counts: number[] = [];
  for (const wave of [1, 3, 5, 7, 100]) {
    const fire = new EnemyFire();
    const launched = new Set();
    for (let frame = 0; frame < 60 * 20; frame++) {
      fire.update(1 / 60, wave, divers, true, () => 0);
      fire.shots.forEach(shot => launched.add(shot));
      assert.ok(fire.shots.length <= enemyShotLimit(wave));
    }
    counts.push(launched.size);
  }
  for (let i = 1; i < counts.length; i++) assert.ok(counts[i] > counts[i - 1]);
  assert.equal(enemyShotInterval(100), 0.7);
  assert.equal(enemyShotLimit(100), 4);
  assert.equal(enemyShotInterval(0), enemyShotInterval(1));
});

test('hostile fire cadence and shot travel agree at 30, 60 and 144 FPS', () => {
  const snapshots: { x: number; y: number }[][] = [];
  for (const fps of [30, 60, 144]) {
    const fire = new EnemyFire();
    for (let frame = 0; frame < fps * 10; frame++) fire.update(1 / fps, 7, divers, true, () => 0);
    snapshots.push(fire.shots.map(({ x, y }) => ({ x, y })));
  }
  for (const snapshot of snapshots.slice(1)) {
    assert.equal(snapshot.length, snapshots[0].length);
    snapshot.forEach((shot, i) => {
      assert.equal(shot.x, snapshots[0][i].x);
      assert.ok(Math.abs(shot.y - snapshots[0][i].y) < 0.001);
    });
  }
});

test('only available divers above the reaction margin can shoot, without accumulating a burst', () => {
  const fire = new EnemyFire();
  fire.update(20, 7, []);
  fire.update(1, 7, [{ x: 400, y: ENEMY_FIRE.maxLaunchY + 1 }]);
  assert.equal(fire.shots.length, 0);
  fire.update(0, 7, divers, true, () => 0.75);
  assert.equal(fire.shots.length, 1);
  assert.equal(fire.shots[0].x, 200);
  assert.equal(fire.shots[0].y, 250 + ENEMY_FIRE.launchOffset);
  fire.update(0.01, 7, divers);
  assert.equal(fire.shots.length, 1);
});

test('full shot capacity delays firing and does not bank a burst', () => {
  const fire = new EnemyFire();
  fire.shots = Array.from({ length: enemyShotLimit(100) }, () => ({ x: 400, y: 100, previousY: 100 }));
  fire.update(ENEMY_FIRE.openingDelay, 100, divers);
  assert.equal(fire.shots.length, enemyShotLimit(100));
  fire.shots.pop();
  fire.update(0, 100, divers, true, () => 0);
  assert.equal(fire.shots.length, enemyShotLimit(100));
  assert.equal(fire.shots.at(-1)!.y, 200 + ENEMY_FIRE.launchOffset);
  fire.shots.pop();
  fire.update(0.01, 100, divers);
  assert.equal(fire.shots.length, enemyShotLimit(100) - 1);
});

test('downward shots sweep across the player and expire below the playfield', () => {
  const fire = new EnemyFire();
  fire.shots.push({ x: 400, y: 540, previousY: 540 });
  fire.update(0.3, 1, []);
  const bounds = { x: 384, y: 556, width: 33, height: 18 };
  assert.equal(fire.hit(fire.shots[0], bounds), true);
  assert.equal(fire.hit(fire.shots[0], { ...bounds, x: 410 }), false);
  assert.equal(fire.hit(fire.shots[0], { ...bounds, y: 500 }), false);
  fire.update(0, 1, []);
  assert.equal(fire.shots.length, 0);
});

test('life loss, recovery, and restart clear fire and restore an opening delay', () => {
  const fire = new EnemyFire();
  const player = new PlayerSurvival();
  fire.update(ENEMY_FIRE.openingDelay, 7, divers);
  assert.equal(fire.shots.length, 1);
  assert.equal(player.damage(), true);
  fire.reset();
  assert.equal(fire.shots.length, 0);
  fire.update(10, 7, divers, player.canAct);
  assert.equal(fire.shots.length, 0);
  player.update(SURVIVAL.explosionSeconds + SURVIVAL.absentSeconds);
  fire.update(ENEMY_FIRE.openingDelay - 0.01, 7, divers, player.canAct);
  assert.equal(fire.shots.length, 0);
  fire.update(0.01, 7, divers);
  assert.equal(fire.shots.length, 1);
  fire.reset();
  player.reset();
  fire.update(ENEMY_FIRE.openingDelay, 1, divers);
  fire.update(enemyShotInterval(7), 1, divers);
  assert.equal(fire.shots.length, 1);
});
