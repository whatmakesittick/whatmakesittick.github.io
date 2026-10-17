import { describe, expect, it } from 'vitest';
import { BoxGeometry, SRGBColorSpace } from 'three';
import { createPalette, swatchOf } from './palette';

const SWATCHES = {
  paint: { color: '#808080', roughness: 0.3, metalness: 0.4, reflection: 2 },
  matte: { color: '#101010', roughness: 0.9, metalness: 0, reflection: 0.5 },
  lamp: {
    color: '#202020',
    roughness: 0.2,
    metalness: 0,
    reflection: 1,
    glow: { color: '#ffffff', intensity: 2 },
  },
} as const;
const FULL = 255;
const TEXEL = 4;

function texel(data: Uint8Array, index: number): number[] {
  return Array.from(data.slice(index * TEXEL, index * TEXEL + TEXEL));
}

describe('createPalette', () => {
  const palette = createPalette(SWATCHES);

  it('stores one texel per swatch and points each key at its centre', () => {
    expect(palette.color.image.width).toBe(3);
    expect(palette.uv('paint')).toEqual([1 / 6, 0.5]);
    expect(palette.uv('lamp')).toEqual([5 / 6, 0.5]);
    expect(palette.color.colorSpace).toBe(SRGBColorSpace);
  });

  it('packs reflection share, roughness and metalness like an ORM map', () => {
    const data = palette.surface.image.data as Uint8Array;
    expect(texel(data, 0)).toEqual([FULL, Math.round(0.3 * FULL), Math.round(0.4 * FULL), FULL]);
    expect(texel(data, 1)[0]).toBe(Math.round((0.5 / 2) * FULL));
    expect(palette.reflection).toBe(2);
  });

  it('lights only the glowing swatches', () => {
    const data = palette.glow.image.data as Uint8Array;
    expect(texel(data, 0).slice(0, 3)).toEqual([0, 0, 0]);
    expect(texel(data, 2).slice(0, 3)).toEqual([FULL, FULL, FULL]);
    expect(palette.glowIntensity).toBe(2);
  });

  it('paints every vertex of a geometry with the swatch texel', () => {
    const geometry = palette.paint(new BoxGeometry(), 'matte');
    const uv = geometry.getAttribute('uv');
    for (let vertex = 0; vertex < uv.count; vertex += 1) {
      expect([uv.getX(vertex), uv.getY(vertex)]).toEqual([0.5, 0.5]);
    }
  });
});

describe('swatchOf', () => {
  it('reads a finish and keeps its glow', () => {
    const swatch = swatchOf({
      color: '#123456',
      roughness: 0.4,
      metalness: 0.2,
      envMapIntensity: 1.5,
      emissive: '#ff0000',
      emissiveIntensity: 3,
    });
    expect(swatch).toEqual({
      color: '#123456',
      roughness: 0.4,
      metalness: 0.2,
      reflection: 1.5,
      glow: { color: '#ff0000', intensity: 3 },
    });
  });
});
