import { describe, expect, it } from 'vitest';
import { FIELD, MOTOR, PLATE, PROP, ROADS } from '../constants';
import {
  discAlpha,
  fieldShade,
  roadShade,
  slotShade,
  weaveShade,
  weaveTexture,
} from './surfaceMaps';

describe('surface maps', () => {
  it('weaves tows that are brighter in the middle than at their edges', () => {
    const tow = 1 / PLATE.weave.tows;
    const middle = weaveShade(PLATE.weave, tow * 0.5, tow * 0.5);
    const edge = weaveShade(PLATE.weave, tow * 0.5, tow * 0.02);
    expect(middle).toBeGreaterThan(edge);
    expect(middle).toBeLessThanOrEqual(1.1);
    expect(edge).toBeGreaterThan(0);
  });

  it('paints a repeating weave texture in the sRGB colour space', () => {
    const texture = weaveTexture(PLATE.weave);
    expect(texture.image.width).toBe(PLATE.weave.size);
    expect(texture.wrapS).toBe(texture.wrapT);
    expect(texture.colorSpace).toBe('srgb');
    texture.dispose();
  });

  it('cuts dark cooling slots into the lower part of the bell', () => {
    const slotU = 0.5 / MOTOR.slots.count;
    const betweenU = 1 / MOTOR.slots.count;
    const inside = (MOTOR.slots.from + MOTOR.slots.to) / 2;
    expect(slotShade(MOTOR.slots, slotU, inside)).toBeLessThan(0.3);
    expect(slotShade(MOTOR.slots, betweenU, inside)).toBeCloseTo(1);
    expect(slotShade(MOTOR.slots, slotU, 0.95)).toBeCloseTo(1);
  });

  it('fades the blur disc from a clear hub to a bright tip ring', () => {
    expect(discAlpha(PROP.disc, 0)).toBe(0);
    expect(discAlpha(PROP.disc, PROP.disc.tipRing)).toBeGreaterThan(discAlpha(PROP.disc, 0.6));
    expect(discAlpha(PROP.disc, 1)).toBe(0);
  });

  it('keeps the field shade near one with gentle variation', () => {
    for (const channel of fieldShade(FIELD.texture, 0.3, 0.7).slice(0, 3)) {
      expect(channel).toBeGreaterThan(0.6);
      expect(channel).toBeLessThan(1.4);
    }
  });

  it('darkens the road map into two wheel ruts and lightens the dusty crown', () => {
    const layout = ROADS.texture;
    const rut = roadShade(layout, 0.5 - layout.rut, 0.2)[0];
    const crown = roadShade(layout, 0.5, 0.2)[0];
    const verge = roadShade(layout, 0.02, 0.2)[0];
    expect(rut).toBeLessThan(verge);
    expect(crown).toBeGreaterThan(verge);
    for (let u = 0; u <= 1; u += 0.05) {
      const level = roadShade(layout, u, 0.4)[0];
      expect(level).toBeGreaterThan(0.45);
      expect(level).toBeLessThanOrEqual(1);
    }
  });
});
