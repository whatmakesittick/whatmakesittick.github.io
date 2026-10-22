import { describe, expect, it } from 'vitest';
import { GHOST_TRACK_Z, TRAIN } from '../../../../model';
import { arcHeight } from './canopy';
import { CANOPY, ESCALATOR, PLATFORM, STATION_STYLES } from './constants';

const GHOST_HALF_WIDTH = 1.7;

describe('station layout', () => {
  it('keeps the platform edges just clear of the train', () => {
    expect(PLATFORM.edge).toBeGreaterThan(TRAIN.width / 2);
    expect(PLATFORM.edge - TRAIN.width / 2).toBeLessThan(0.2);
  });

  it('springs the canopy from its eaves to its crown, well above the train roof', () => {
    expect(arcHeight(CANOPY.halfSpan)).toBeCloseTo(CANOPY.eave);
    expect(arcHeight(0)).toBeCloseTo(CANOPY.crown);
    expect(arcHeight(TRAIN.width / 2) - CANOPY.thickness).toBeGreaterThan(TRAIN.roof + 2);
  });

  it('keeps the halls and the left escalator off the ghost track', () => {
    Object.values(STATION_STYLES).forEach(({ hall }) => {
      expect(hall.z[0]).toBeGreaterThan(0);
    });
    expect(ESCALATOR.inner + ESCALATOR.width).toBeLessThan(GHOST_TRACK_Z - GHOST_HALF_WIDTH);
  });
});
