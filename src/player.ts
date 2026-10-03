// Tuned for our 800 × 680 playfield; the exact firing cadence is not established.
export const PLAYER = {
  startX: 400, y: 565, minX: 94, maxX: 694, speed: 600,
  width: 33, height: 18, // Collision bounds are independent of the display grid.
  shotSpeed: 990, shotWidth: 3, shotHeight: 20, shotTop: 72,
  shotInterval: 1 / 2.4,
};

export type Shot = { x: number; y: number; previousY: number };

export class PlayerControls {
  x = PLAYER.startX;
  shots: Shot[] = [];
  private fireWait = 0;

  reset() {
    this.x = PLAYER.startX;
    this.clearFire();
  }

  clearFire() {
    this.shots = [];
    this.fireWait = 0;
  }

  update(seconds: number, left: boolean, right: boolean, fire: boolean) {
    this.x = Math.max(PLAYER.minX, Math.min(PLAYER.maxX,
      this.x + (Number(right) - Number(left)) * PLAYER.speed * seconds));

    // A launched shot keeps its original X even while the ship moves.
    // Keep shots crossing the top this frame for the scene's collision sweep.
    this.shots = this.shots.filter(shot => shot.y + PLAYER.shotHeight / 2 >= PLAYER.shotTop);
    for (const shot of this.shots) {
      shot.previousY = shot.y;
      shot.y -= PLAYER.shotSpeed * seconds;
    }
    const wasCooling = this.fireWait > 0;
    this.fireWait -= seconds;
    if (fire && this.fireWait <= 1e-9) {
      const y = PLAYER.y - 8 - PLAYER.shotHeight / 2;
      const overdue = wasCooling ? Math.max(0, -this.fireWait) : 0;
      this.shots.push({ x: this.x, y: y - overdue * PLAYER.shotSpeed, previousY: y });
      this.fireWait = PLAYER.shotInterval - overdue;
    }
    if (!fire) this.fireWait = Math.max(0, this.fireWait);
  }

  hit(shot: Shot, target: { x: number; y: number; width: number; height: number }) {
    // Sweep the full distance travelled so a fast shot cannot skip an enemy.
    return shot.x + PLAYER.shotWidth / 2 >= target.x
      && shot.x - PLAYER.shotWidth / 2 <= target.x + target.width
      && shot.y - PLAYER.shotHeight / 2 <= target.y + target.height
      && shot.previousY + PLAYER.shotHeight / 2 >= target.y;
  }
}
