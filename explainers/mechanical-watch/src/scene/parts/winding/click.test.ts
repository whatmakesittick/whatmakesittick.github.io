import { describe, expect, it } from 'vitest';
import { WINDING } from '../../../model/train';
import { WINDING_SAW } from '../../constants';
import { ratchetRadiusUnderClick } from './click';

describe('click', () => {
  it('rides between the root and the tip of the ratchet teeth', () => {
    const root = WINDING.ratchetRadiusMm - WINDING_SAW.depth / 2;
    const tip = WINDING.ratchetRadiusMm + WINDING_SAW.depth / 2;
    for (let angle = 0; angle < 12; angle += 0.25) {
      const radius = ratchetRadiusUnderClick(angle, 0);
      expect(radius).toBeGreaterThanOrEqual(root - 1e-9);
      expect(radius).toBeLessThanOrEqual(tip + 1e-9);
    }
  });
});
