import { describe, expect, it } from 'vitest';
import { SHRUBS } from '../constants';
import { scatterShrubs } from './shrubs';
import { flatness } from './terrain';

describe('shrubs', () => {
  it('scatters bushes over the open desert and never on the airfield or the target', () => {
    const shrubs = scatterShrubs();
    expect(shrubs.length).toBeGreaterThan(SHRUBS.count / 2);
    shrubs.forEach((shrub) => {
      expect(flatness(shrub.x, shrub.z)).toBeLessThanOrEqual(SHRUBS.keepOut);
      expect(shrub.x).toBeGreaterThanOrEqual(SHRUBS.area.x[0]);
      expect(shrub.z).toBeLessThanOrEqual(SHRUBS.area.z[1]);
    });
  });
});
