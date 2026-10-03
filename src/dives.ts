type Point = { x: number; y: number };

// Side reflections and bottom-to-slot returns are visible in the recording.
// Speeds, cadence, and difficulty scaling remain gameplay tuning values.
export const DIVE = {
  minX: 97, maxX: 703, bottom: 584, speedX: 120, speedY: 65, restSeconds: 1.5,
  turnCheckSeconds: 0.6, turnChance: 0.2,
};
export const diveLimit = (wave: number) => Math.min(4, 2 + Math.floor((wave - 1) / 2));
export const diveInterval = (wave: number) => Math.max(1, 2.25 - (wave - 1) * 0.1);

export class DiveFlight {
  private elapsed = 0;
  private start: Point;
  private side: number;
  private speedScale: number;
  private travel: number;
  private turnWait = DIVE.turnCheckSeconds;
  private random: () => number;

  constructor(start: Point, side: number, wave: number, random: () => number = Math.random) {
    this.start = { ...start };
    this.side = side < 0 ? -1 : 1;
    this.speedScale = Math.min(1.4, 1 + Math.max(0, wave - 1) * 0.04);
    this.travel = start.x - DIVE.minX;
    this.random = random;
  }

  update(seconds: number, home: Point): Point & { done: boolean; visible: boolean } {
    this.elapsed += seconds;
    const y = this.start.y + this.elapsed * DIVE.speedY * this.speedScale;
    if (y >= DIVE.bottom) return { ...home, done: true, visible: true };

    // Roll on a clock, not once per frame. Split movement at each check so a
    // turn occurs at the same position regardless of rendering frame rate.
    let remaining = seconds;
    while (remaining > 0) {
      const step = Math.min(remaining, this.turnWait);
      this.travel += this.side * step * DIVE.speedX * this.speedScale;
      remaining -= step;
      this.turnWait -= step;
      if (this.turnWait <= 1e-9) {
        if (this.random() < DIVE.turnChance) this.side *= -1;
        this.turnWait = DIVE.turnCheckSeconds;
      }
    }

    // Reflect horizontal velocity at either wall, preserving frame overshoot.
    const width = DIVE.maxX - DIVE.minX;
    const phase = ((this.travel % (width * 2)) + width * 2) % (width * 2);
    const x = DIVE.minX + (phase <= width ? phase : width * 2 - phase);
    return { x, y, done: false, visible: true };
  }
}
