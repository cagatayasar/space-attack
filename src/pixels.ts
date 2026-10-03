import Phaser from 'phaser';
import { PIXEL_WIDTH, PIXEL_HEIGHT } from './display';

export const COLORS = { yellow: 0xe4eb27, red: 0xf5090b, green: 0x16f000, cyan: 0x20e4e5 };

// Seven-by-seven enemy masks traced from the reference. Red and green share
// both poses; their palette and alternating formation slots distinguish them.
const enemy = [
  '0010100', '1111111', '0101010', '0111110',
  '0011100', '0100010', '0010100',
];
const enemyAlternate = [
  '1010101', '0111110', '0101010', '0111110',
  '0011100', '0101010', '1000001',
];

const sprites: Record<string, string[]> = {
  ship: [
    // Native-grid silhouette: the nose, stem and wing gaps each get a full cell.
    '0001000', '0011100', '0111110', '0001000',
    '1001001', '1111111', '1100011',
  ],
  playerExplosion: [
    '1000001', '0010100', '0100010', '1001001',
    '0100010', '0010100', '1000001',
  ],
  red: enemy,
  redAlternate: enemyAlternate,
  green: enemy,
  greenAlternate: enemyAlternate,
  yellow: [
    '1001001', '1011101', '1111111', '0101010',
    '0111110', '0011100', '0001000',
  ],
};

export function createSprites(scene: Phaser.Scene) {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  for (const [name, rows] of Object.entries(sprites)) {
    // Keep all sprites at their logical resolution; nearest-neighbor display
    // scaling supplies the reference's rectangular pixels without baking blur.
    graphics.clear().fillStyle(0xffffff);
    rows.forEach((row, y) => [...row].forEach((bit, x) => {
      if (bit === '1') graphics.fillRect(x, y, 1, 1);
    }));
    graphics.generateTexture(name, rows[0].length, rows.length);
  }
  graphics.destroy();
}

const glyphs: Record<string, string> = {
  '0': '01110/11001/10011/10101/11001/10011/01110',
  '1': '00100/01100/00100/00100/00100/00100/01110',
  '2': '01110/10001/00001/00110/01000/10000/11111',
  '3': '11110/00001/00001/01110/00001/00001/11110',
  '4': '00010/00110/01010/10010/11111/00010/00010',
  '5': '11111/10000/10000/11110/00001/00001/11110',
  '6': '01110/10000/10000/11110/10001/10001/01110',
  '7': '11111/00001/00010/00100/01000/01000/01000',
  '8': '01110/10001/10001/01110/10001/10001/01110',
  '9': '01110/10001/10001/01111/00001/00001/01110',
  A: '01110/10001/10001/11111/10001/10001/10001',
  C: '01111/10000/10000/10000/10000/10000/01111',
  D: '11110/10001/10001/10001/10001/10001/11110',
  E: '11111/10000/10000/11110/10000/10000/11111',
  G: '01111/10000/10000/10111/10001/10001/01111',
  L: '10000/10000/10000/10000/10000/10000/11111',
  M: '10001/11011/10101/10101/10001/10001/10001',
  N: '10001/11001/11001/10101/10011/10011/10001',
  O: '01110/10001/10001/10001/10001/10001/01110',
  P: '11110/10001/10001/11110/10000/10000/10000',
  R: '11110/10001/10001/11110/10100/10010/10001',
  S: '01111/10000/10000/01110/00001/00001/11110',
  T: '11111/00100/00100/00100/00100/00100/00100',
  V: '10001/10001/10001/10001/10001/01010/00100',
};

export function pixelText(graphics: Phaser.GameObjects.Graphics, text: string, x: number, y: number, color: number, sx = 4, sy = 2, spacing = 12) {
  // Keep glyph cells on the original art grid, independent of rendering resolution.
  sx = Math.max(PIXEL_WIDTH, Math.round(sx / PIXEL_WIDTH) * PIXEL_WIDTH);
  sy = Math.max(PIXEL_HEIGHT, Math.round(sy / PIXEL_HEIGHT) * PIXEL_HEIGHT);
  x = Math.round(x / PIXEL_WIDTH) * PIXEL_WIDTH;
  y = Math.round(y / PIXEL_HEIGHT) * PIXEL_HEIGHT;
  const advance = Math.round((5 * sx + spacing) / PIXEL_WIDTH) * PIXEL_WIDTH;
  graphics.fillStyle(color);
  [...text].forEach((letter, index) => {
    glyphs[letter]?.split('/').forEach((row, dy) => [...row].forEach((bit, dx) => {
      if (bit === '1') graphics.fillRect(x + index * advance + dx * sx, y + dy * sy, sx, sy);
    }));
  });
}
