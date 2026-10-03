export const FORMATION = { minX: 260, maxX: 540, startX: 400, speed: 28 };

// Fixed slots from the recording; destroyed enemies leave gaps in this layout.
export const FORMATION_ROWS = [
  [-1, 1], [-2, -1, 0, 1, 2], [-3, -2, -1, 0, 1, 2, 3],
  [-4, -3, -2, -1, 0, 1, 2, 3, 4],
  [-4, -3, -2, -1, 0, 1, 2, 3, 4],
  [-4, -3, -2, -1, 0, 1, 2, 3, 4],
] as const;

export class EnemyFormation {
  x = FORMATION.startX;
  private distance = FORMATION.startX - FORMATION.minX;

  reset() {
    this.x = FORMATION.startX;
    this.distance = FORMATION.startX - FORMATION.minX;
  }

  update(seconds: number) {
    const width = FORMATION.maxX - FORMATION.minX;
    this.distance = (this.distance + FORMATION.speed * seconds) % (width * 2);
    this.x = FORMATION.minX + (this.distance <= width ? this.distance : width * 2 - this.distance);
  }

  position(column: number, row: number) {
    return { x: this.x + column * 40, y: 96 + row * 22 };
  }
}
