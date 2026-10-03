// Approximate timings from the recording: hold the cyan burst, then briefly
// leave the ship absent before resuming at the same horizontal position.
export const SURVIVAL = { energySeconds: 40, explosionSeconds: 3, absentSeconds: 0.8, lives: 3 };
export type PlayerPhase = 'active' | 'dying' | 'absent' | 'gameover';

export class PlayerSurvival {
  lives = SURVIVAL.lives;
  energy = 1;
  phase: PlayerPhase = 'active';
  private remaining = 0;

  get canAct() { return this.phase === 'active'; }

  reset() {
    this.lives = SURVIVAL.lives;
    this.energy = 1;
    this.phase = 'active';
    this.remaining = 0;
  }

  refill() {
    this.energy = 1;
  }

  update(seconds: number) {
    if (this.phase === 'gameover') return false;
    while (!this.canAct) {
      if (seconds + 1e-9 < this.remaining) {
        this.remaining -= seconds;
        return false;
      }
      seconds = Math.max(0, seconds - this.remaining);
      if (this.phase === 'dying') {
        // Keep the HUD unchanged during the explosion; commit one loss afterward.
        this.lives--;
        this.energy = this.lives > 0 ? 1 : 0;
        if (this.lives === 0) {
          this.phase = 'gameover';
          this.remaining = 0;
          return false;
        }
        this.phase = 'absent';
        this.remaining = SURVIVAL.absentSeconds;
      } else {
        this.phase = 'active';
        this.remaining = 0;
      }
    }
    this.energy = Math.max(0, this.energy - seconds / SURVIVAL.energySeconds);
    return this.energy <= 1e-9 && this.damage();
  }

  damage() {
    if (!this.canAct || this.lives === 0) return false;
    this.phase = 'dying';
    this.remaining = SURVIVAL.explosionSeconds;
    return true;
  }
}
