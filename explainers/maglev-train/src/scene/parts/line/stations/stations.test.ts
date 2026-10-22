import { describe, expect, it } from 'vitest';
import { GHOST_TRACK_Z, GIRDER, INSET, INSET_CENTRE, TRAIN } from '../../../../model';
import { arcHeight } from './canopy';
import { CANOPY, ESCALATOR, HALL, PLATFORM, STATION_STYLES, platformRun } from './constants';

const GHOST_HALF_WIDTH = 1.7;
const ARM_VIEW_MARGIN = 20;

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

  it('tucks the halls under the platforms, clear of the ghost track and the girders', () => {
    Object.values(STATION_STYLES).forEach(({ hall }) => {
      expect(Math.max(...hall.z.map(Math.abs)) + HALL.roofOverhang).toBeLessThan(ESCALATOR.inner);
      expect(hall.height + HALL.roofThickness).toBeLessThan(GIRDER.bottom);
      expect(hall.x[1]).toBeLessThanOrEqual(platformRun(-1)[1]);
    });
    expect(ESCALATOR.inner + ESCALATOR.width).toBeLessThan(GHOST_TRACK_Z - GHOST_HALF_WIDTH);
  });

  it('ends the left platform short of the gap inset so the arm view stays open', () => {
    const [, leftEnd] = platformRun(-1);
    expect(leftEnd).toBeLessThan(INSET_CENTRE[0] - INSET.width / 2 - ARM_VIEW_MARGIN);
  });
});
