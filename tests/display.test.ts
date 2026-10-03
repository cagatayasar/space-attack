import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PIXEL_WIDTH, PIXEL_HEIGHT, RASTER_WIDTH, RASTER_HEIGHT, spritePixelPosition } from '../src/display.ts';

test('moving sprite edges stay on whole raster pixels with odd and even sizes', () => {
  for (const [artPixelSize, pixelSize] of [[PIXEL_WIDTH, RASTER_WIDTH], [PIXEL_HEIGHT, RASTER_HEIGHT]]) {
    for (const size of [7, 8]) {
      for (const origin of [0, 0.5, 1]) {
        const offset = size * artPixelSize * origin;
        for (let position = -10; position < 800; position += 0.13) {
          const snapped = spritePixelPosition(position, offset, pixelSize);
          const edge = (snapped - offset) / pixelSize;
          assert.ok(Math.abs(edge - Math.round(edge)) < 1e-9);
          assert.ok(Math.abs(snapped - position) <= pixelSize / 2 + 1e-9);
        }
      }
    }
  }
});

test('formation columns remain eight pixels apart throughout a movement step', () => {
  for (let position = 260; position < 540; position += 0.13) {
    const left = spritePixelPosition(position, 17.5, RASTER_WIDTH);
    const right = spritePixelPosition(position + 40, 17.5, RASTER_WIDTH);
    assert.ok(Math.abs(right - left - 40) < 1e-9);
  }
});
