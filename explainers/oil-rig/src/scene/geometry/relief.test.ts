import { describe, expect, it } from 'vitest';
import { SEABED_Y } from '../../model/scale';
import { RELIEF } from '../constants';
import { seabedRelief, seabedY } from './relief';

describe('seabed relief', () => {
  it('keeps a flat pad around the wellhead', () => {
    expect(seabedRelief(0, 0)).toBe(0);
    expect(seabedY(RELIEF.padHalf / 2, 0)).toBe(SEABED_Y);
  });

  it('stays slight away from the well', () => {
    for (let x = -200; x <= 200; x += 25) {
      expect(Math.abs(seabedRelief(x, -120))).toBeLessThanOrEqual(RELIEF.amplitude * 1.1);
    }
  });
});
