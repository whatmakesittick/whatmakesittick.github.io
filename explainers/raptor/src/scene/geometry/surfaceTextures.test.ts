import { describe, expect, it } from 'vitest';
import {
  brushedNormals,
  channelNormals,
  createSurfaceTextures,
  heatLevel,
  heatPixels,
  ribSlope,
} from './surfaceTextures';

const KEYS = [
  [0, 0],
  [0.5, 1],
  [1, 0.5],
] as const;

describe('surface textures', () => {
  it('interpolates the heat gradient and clamps its ends', () => {
    expect(heatLevel(-1, KEYS)).toBe(0);
    expect(heatLevel(0.25, KEYS)).toBeCloseTo(0.5);
    expect(heatLevel(0.75, KEYS)).toBeCloseTo(0.75);
    expect(heatLevel(2, KEYS)).toBe(0.5);
    expect(heatPixels({ height: 3, keys: KEYS })[4]).toBe(255);
  });

  it('repeats the channel ribs across the texture', () => {
    expect(ribSlope(0, 4, 1)).toBeCloseTo(0);
    expect(ribSlope(0.25, 4, 1)).toBeCloseTo(ribSlope(0.5, 4, 1));
    expect(channelNormals({ width: 8, repeat: 2, ribs: 2, depth: 0.5 })).toHaveLength(32);
  });

  it('writes unit normals pointing out of the surface', () => {
    const pixels = brushedNormals({ size: 8, repeat: [1, 1], streakStrength: 0.3, seed: 1 });
    for (let offset = 0; offset < pixels.length; offset += 4) {
      expect(pixels[offset + 2]).toBeGreaterThan(200);
    }
  });

  it('builds and frees the textures', () => {
    const surfaces = createSurfaceTextures(
      { size: 8, repeat: [2, 1], streakStrength: 0.3, seed: 1 },
      { width: 8, repeat: 24, ribs: 2, depth: 0.5 },
      { height: 4, keys: KEYS },
    );
    expect(surfaces.channels.repeat.x).toBe(24);
    expect(surfaces.brushed.repeat.x).toBe(2);
    surfaces.dispose();
  });
});
