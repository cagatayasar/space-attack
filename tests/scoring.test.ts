import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scoring } from '../src/scoring.ts';
import { FORMATION_ROWS } from '../src/formation.ts';

test('formation and diving kills match the reference for every rank', () => {
  const scoring = new Scoring();
  const values = [[60, 200], [50, 100], [40, 80], [30, 60], [30, 60], [30, 60]];
  for (const [row, [formation, diving]] of values.entries()) {
    let previous = scoring.total;
    scoring.recordKill(row, false);
    assert.equal(scoring.total - previous, formation);
    previous = scoring.total;
    scoring.recordKill(row, true);
    assert.equal(scoring.total - previous, diving);
  }
});

test('clearing successive formations accumulates points without resetting the run', () => {
  const scoring = new Scoring();
  for (let wave = 1; wave <= 3; wave++) {
    FORMATION_ROWS.forEach((columns, row) => {
      columns.forEach(() => scoring.recordKill(row, false));
    });
    assert.equal(scoring.total, wave * 1460);
  }
});

test('extra ship is awarded once at 5000, including when a kill skips over it', () => {
  for (const exact of [true, false]) {
    const scoring = new Scoring();
    for (let i = 0; i < 24; i++) assert.equal(scoring.recordKill(0, true), false);
    if (!exact) assert.equal(scoring.recordKill(3, false), false);
    assert.equal(scoring.recordKill(0, true), true);
    assert.equal(scoring.total, exact ? 5000 : 5030);
    for (let i = 0; i < 30; i++) assert.equal(scoring.recordKill(0, true), false);
    scoring.reset();
    assert.equal(scoring.total, 0);
    for (let i = 0; i < 24; i++) assert.equal(scoring.recordKill(0, true), false);
    assert.equal(scoring.recordKill(0, true), true);
  }
});
