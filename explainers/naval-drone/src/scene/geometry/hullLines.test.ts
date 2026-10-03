import { describe, expect, it } from 'vitest';
import { BOAT, HULL_DETAIL, HULL_STATIONS, STEM, chineHeight, stemXAt } from '../../model/layout';
import { HULL_LINES } from '../constants';
import {
  bottomYAt,
  deckYAt,
  halfBreadthAt,
  hullSectionAt,
  hullStationXs,
  keelAt,
  stemYAt,
} from './hullLines';

const CLOSE = 6;

describe('hull lines', () => {
  it('passes through every frozen station', () => {
    HULL_STATIONS.forEach((station) => {
      const section = hullSectionAt(station.x);
      expect(section.chine[0]).toBeCloseTo(station.chineHalfBreadth, CLOSE);
      expect(section.chine[1]).toBeCloseTo(chineHeight(station), CLOSE);
      expect(section.sheer[0]).toBeCloseTo(station.sheer[0], CLOSE);
      expect(section.sheer[1]).toBeCloseTo(station.sheer[1], CLOSE);
      expect(section.knuckle[0]).toBeCloseTo(station.knuckle[0], CLOSE);
      expect(section.deck).toBeCloseTo(station.deck, CLOSE);
    });
  });

  it('keeps the keel straight aft and runs it up the raked stem', () => {
    [-2.75, -1, 0, HULL_DETAIL.keelStraightTo].forEach((x) =>
      expect(keelAt(x)).toBeCloseTo(HULL_STATIONS[0].keel, CLOSE),
    );
    expect(keelAt(STEM.forefoot[0])).toBeCloseTo(STEM.forefoot[1], 2);
    expect(keelAt(2.6)).toBeCloseTo(stemYAt(2.6), CLOSE);
    expect(stemYAt(stemXAt(0.3))).toBeCloseTo(0.3, CLOSE);
    for (let x = HULL_DETAIL.keelStraightTo; x < BOAT.halfLength; x += 0.05) {
      expect(keelAt(x + 0.05)).toBeGreaterThanOrEqual(keelAt(x) - 1e-9);
    }
  });

  it('closes every line at the stem head', () => {
    const bow = hullSectionAt(BOAT.halfLength);
    expect(bow.sheer[0]).toBeCloseTo(0, CLOSE);
    expect(bow.sheer[1]).toBeCloseTo(STEM.top[1], CLOSE);
    expect(bow.chine[0]).toBeCloseTo(0, CLOSE);
    expect(bow.keel).toBeCloseTo(STEM.top[1], CLOSE);
  });

  it('merges the knuckle into the sheer and tapers the chine flat and rail', () => {
    const merged = hullSectionAt(HULL_DETAIL.knuckleMergeX + 0.05);
    expect(merged.knuckle).toEqual(merged.sheer);
    expect(hullSectionAt(0).flat[0] - hullSectionAt(0).chine[0]).toBeCloseTo(
      HULL_DETAIL.chineFlat.width,
      CLOSE,
    );
    expect(hullSectionAt(HULL_DETAIL.chineFlat.endX).flat[0]).toBeCloseTo(
      hullSectionAt(HULL_DETAIL.chineFlat.endX).chine[0],
      CLOSE,
    );
    expect(hullSectionAt(1).rail).toBeCloseTo(HULL_DETAIL.sprayRail.width, CLOSE);
    expect(hullSectionAt(-1).rail).toBe(0);
  });

  it('keeps the deck panel inside the sheer and flat across the centre', () => {
    for (let x = -2.75; x <= 2.7; x += 0.25) {
      const section = hullSectionAt(x);
      expect(section.panelEdge[0]).toBeLessThanOrEqual(HULL_DETAIL.deckCentreWidth / 2 + 1e-9);
      expect(section.panelEdge[0]).toBeLessThan(section.sheer[0]);
      expect(deckYAt(x, 0)).toBeCloseTo(section.deck, CLOSE);
    }
  });

  it('measures the hull plan for the water mask', () => {
    expect(halfBreadthAt(0, -0.4)).toBe(0);
    expect(halfBreadthAt(-3, 0)).toBe(0);
    const atWaterline = halfBreadthAt(0, 0);
    expect(atWaterline).toBeGreaterThan(hullSectionAt(0).chine[0]);
    expect(atWaterline).toBeLessThan(hullSectionAt(0).knuckle[0]);
    expect(bottomYAt(0, 0.3)).toBeCloseTo(-0.32 + 0.3 * Math.tan(BOAT.deadriseAft), CLOSE);
  });

  it('samples the stations densely and includes the cut', () => {
    const xs = hullStationXs();
    expect(xs[0]).toBeCloseTo(-BOAT.halfLength, CLOSE);
    expect(xs[xs.length - 1]).toBeCloseTo(BOAT.halfLength, CLOSE);
    expect(xs.some((x) => Math.abs(x - HULL_LINES.cutX) < 1e-9)).toBe(true);
    xs.slice(1).forEach((x, index) => expect(x).toBeGreaterThan(xs[index]));
  });
});
