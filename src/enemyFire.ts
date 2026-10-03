type Point = { x: number; y: number };
export type EnemyShot = Point & { previousY: number };

// Downward fire compounds the overlapping dives seen in the reference.
// These bounded rates are gameplay tuning, not measured original-game values.
export const ENEMY_FIRE = {
  speed: 200, width: 3, height: 16, bottom: 584,
  maxLaunchY: 420, launchOffset: 18, openingDelay: 1.5,
};
export const enemyShotInterval = (wave: number) => Math.max(0.7, 2.4 - Math.max(0, wave - 1) * 0.2);
export const enemyShotLimit = (wave: number) => Math.min(4, 2 + Math.floor(Math.max(0, wave - 1) / 3));

export class EnemyFire {
  shots: EnemyShot[] = [];
  private fireWait = ENEMY_FIRE.openingDelay;

  reset() {
    this.shots = [];
    this.fireWait = ENEMY_FIRE.openingDelay;
  }

  update(seconds: number, wave: number, divers: readonly Point[], canFire = true,
    random: () => number = Math.random) {
    // Retain shots crossing the bottom for one collision sweep before removal.
    this.shots = this.shots.filter(shot => shot.y - ENEMY_FIRE.height / 2 <= ENEMY_FIRE.bottom);
    for (const shot of this.shots) {
      shot.previousY = shot.y;
      shot.y += ENEMY_FIRE.speed * seconds;
    }
    if (!canFire) {
      this.fireWait = ENEMY_FIRE.openingDelay;
      return;
    }

    const wasCooling = this.fireWait > 0;
    this.fireWait -= seconds;
    if (this.fireWait > 1e-9) return;
    // Leave time to react; a diver next to the player must not spawn a point-blank shot.
    const shooters = divers.filter(diver => diver.y <= ENEMY_FIRE.maxLaunchY);
    if (!shooters.length || this.shots.length >= enemyShotLimit(wave)) {
      // A blocked shot does not build up a burst to release later.
      this.fireWait = 0;
      return;
    }
    const source = shooters[Math.floor(random() * shooters.length)];
    const y = source.y + ENEMY_FIRE.launchOffset;
    const overdue = wasCooling ? Math.max(0, -this.fireWait) : 0;
    this.shots.push({ x: source.x, y: y + ENEMY_FIRE.speed * overdue, previousY: y });
    this.fireWait = enemyShotInterval(wave) - overdue;
  }

  hit(shot: EnemyShot, target: { x: number; y: number; width: number; height: number }) {
    return shot.x + ENEMY_FIRE.width / 2 >= target.x
      && shot.x - ENEMY_FIRE.width / 2 <= target.x + target.width
      && shot.previousY - ENEMY_FIRE.height / 2 <= target.y + target.height
      && shot.y + ENEMY_FIRE.height / 2 >= target.y;
  }
}
