import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EnemyFormation, FORMATION, FORMATION_ROWS } from '../src/formation.ts';

test('each new wave has the 41 fixed slots seen in the recording', () => {
  assert.deepEqual(FORMATION_ROWS.map(row => row.length), [2, 5, 7, 9, 9, 9]);
  assert.equal(FORMATION_ROWS.flat().length, 41);
  for (const row of FORMATION_ROWS) assert.equal(new Set(row).size, row.length);
});

test('formation reverses at each boundary without descending or leaving the playfield', () => {
  const formation = new EnemyFormation();
  formation.update(5);
  assert.equal(formation.x, FORMATION.maxX);
  formation.update(1);
  assert.equal(formation.x, FORMATION.maxX - FORMATION.speed);
  formation.update(9);
  assert.equal(formation.x, FORMATION.minX);
  formation.update(1);
  assert.equal(formation.x, FORMATION.minX + FORMATION.speed);
  for (let i = 0; i < 3600; i++) {
    formation.update(1 / 60);
    assert.ok(formation.position(-4, 5).x - 16.5 >= 80);
    assert.ok(formation.position(4, 5).x + 16.5 <= 720);
    assert.equal(formation.position(4, 5).y, 206);
  }
});

test('survivors keep their slots and gaps as the formation moves', () => {
  const formation = new EnemyFormation();
  const survivors = [-2, 0, 2]; // The ships in columns -1 and 1 have been destroyed.
  formation.update(13);
  const positions = survivors.map(column => formation.position(column, 2));
  assert.equal(positions[1].x - positions[0].x, 80);
  assert.equal(positions[2].x - positions[1].x, 80);
  assert.deepEqual(positions.map(position => position.y), [140, 140, 140]);
});

test('formation timing is frame-rate independent and resets for a new wave', () => {
  for (const fps of [30, 60, 144]) {
    const formation = new EnemyFormation();
    for (let i = 0; i < fps * 13; i++) formation.update(1 / fps);
    assert.ok(Math.abs(formation.x - 316) < 0.001);
    formation.reset();
    assert.equal(formation.x, FORMATION.startX);
    formation.update(1);
    assert.equal(formation.x, FORMATION.startX + FORMATION.speed);
  }
});
