// Values observed in the reference recording, indexed by formation row.
const FORMATION_POINTS = [60, 50, 40, 30, 30, 30] as const;
const DIVING_POINTS = [200, 100, 80, 60, 60, 60] as const;
const EXTRA_SHIP_SCORE = 5_000;

export class Scoring {
  total = 0;

  reset() {
    this.total = 0;
  }

  // Returns true only when this kill crosses the extra-ship threshold.
  recordKill(row: number, diving: boolean): boolean {
    const points = (diving ? DIVING_POINTS : FORMATION_POINTS)[row];
    if (points === undefined) throw new RangeError(`Unknown enemy row: ${row}`);
    const previous = this.total;
    this.total += points;
    return previous < EXTRA_SHIP_SCORE && this.total >= EXTRA_SHIP_SCORE;
  }
}
