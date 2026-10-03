// Preserve the original art size while rendering movement on a 2x finer raster.
export const DISPLAY = { width: 320, height: 480, worldWidth: 800, worldHeight: 680 };
export const PIXEL_WIDTH = DISPLAY.worldWidth / 160;
export const PIXEL_HEIGHT = DISPLAY.worldHeight / 240;
export const RASTER_WIDTH = DISPLAY.worldWidth / DISPLAY.width;
export const RASTER_HEIGHT = DISPLAY.worldHeight / DISPLAY.height;

export function pixelCenter(value: number, size: number) {
  return (Math.floor(value / size) + 0.5) * size;
}

// Snap the edge, not the center: a seven-pixel sprite has a half-pixel center.
export function spritePixelPosition(value: number, originOffset: number, pixelSize: number) {
  return Math.round((value - originOffset) / pixelSize) * pixelSize + originOffset;
}
