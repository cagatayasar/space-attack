// The recording leaves about a third of a second after the last enemy is gone.
export const WAVE_CLEAR_SECONDS = 1 / 3;

export class WaveTransition {
  private remaining: number | null = null;

  reset() {
    this.remaining = null;
  }

  update(seconds: number, enemiesRemaining: number) {
    if (enemiesRemaining > 0) {
      this.reset();
      return false;
    }
    if (this.remaining === null) {
      // The last kill occurred this frame; start counting from that moment.
      this.remaining = WAVE_CLEAR_SECONDS;
      return false;
    }
    this.remaining = Math.max(0, this.remaining - seconds);
    return this.remaining <= 1e-9;
  }
}
