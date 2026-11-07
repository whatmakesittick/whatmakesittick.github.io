import { describe, expect, it } from 'vitest';
import { BRIDGE, HAMMER, SHANK, SOUNDBOARD } from '../../../model';
import { isInside } from '../../geometry/section';
import type { Ring } from '../../geometry/section';
import { BOARD_RING, BOARD_STEINER, RIB_RINGS, boardThickness } from './boardPlan';
import { BASS_BRIDGE, MAIN_BRIDGE, bridgeOf } from './bridgePlan';
import { HITCH_PIN, TUNING_PIN } from './constants';
import { PIANO_STRINGS } from './layout';
import { edgeDistance, plan } from './planMath';
import { BAND_TOP_RING, FLOOR_RINGS, ROUND_OPENINGS, STRUT_RINGS, WEB_RINGS } from './platePlan';
import { distance, speakingEnd } from './stringEnds';

const MARGIN = 0.001;
const OPENING_MARGIN = 0.015;
const RESTING_HEAD_BACK = HAMMER.pivotZ - SHANK - HAMMER.headDepth / 2;

function clearance(point: { x: number; z: number }, rings: readonly Ring[]): number {
  return Math.min(...rings.map((ring) => edgeDistance(point, ring)));
}

describe('plate plan', () => {
  it('stands every hitch pin on the plate floor', () => {
    PIANO_STRINGS.forEach(({ hitch }) => {
      const spot = plan(hitch);
      expect(isInside(FLOOR_RINGS, spot)).toBe(true);
      expect(clearance(spot, FLOOR_RINGS)).toBeGreaterThan(HITCH_PIN.radius);
    });
  });

  it('keeps the floor off both bridges', () => {
    [MAIN_BRIDGE, BASS_BRIDGE].forEach((band) =>
      band.ring.forEach((point) => expect(isInside(FLOOR_RINGS, point)).toBe(false)),
    );
  });

  it('opens the floor over every speaking length', () => {
    PIANO_STRINGS.forEach((string) => {
      const middle = plan(string.front);
      const end = plan(speakingEnd(string));
      const halfway = { x: (middle.x + end.x) / 2, z: (middle.z + end.z) / 2 };
      if (halfway.z < SOUNDBOARD.bellyRailZ) expect(isInside(FLOOR_RINGS, halfway)).toBe(false);
    });
  });

  it('passes every tuning pin through a hole in the web', () => {
    const [outer] = WEB_RINGS;
    PIANO_STRINGS.forEach(({ pin }) => {
      const spot = plan(pin);
      expect(isInside([outer], spot)).toBe(true);
      expect(edgeDistance(spot, outer)).toBeGreaterThan(TUNING_PIN.hole + MARGIN);
    });
  });

  it('cuts the round openings well inside the floor', () => {
    ROUND_OPENINGS.forEach((spot) => {
      expect(isInside([FLOOR_RINGS[0]], spot)).toBe(true);
      expect(clearance(spot, [FLOOR_RINGS[0], FLOOR_RINGS[1], BAND_TOP_RING])).toBeGreaterThan(
        spot.radius + OPENING_MARGIN,
      );
      expect(clearance(spot, STRUT_RINGS)).toBeGreaterThan(spot.radius);
    });
  });
});

describe('bridges and soundboard', () => {
  it('lands every string on its own bridge', () => {
    PIANO_STRINGS.forEach((string) => {
      expect(isInside([bridgeOf(string.key).ring], plan(string.back))).toBe(true);
    });
  });

  it('ends the drawn wave at the front of the bridge', () => {
    PIANO_STRINGS.forEach((string) => {
      const end = speakingEnd(string);
      const toBack = distance(end, string.back);
      expect(distance(string.front, end)).toBeLessThanOrEqual(distance(string.front, string.back));
      expect(toBack).toBeLessThan(BRIDGE.width / Math.sin(Math.PI / 10));
    });
  });

  it('carries both bridges on the soundboard', () => {
    [MAIN_BRIDGE, BASS_BRIDGE].forEach((band) =>
      band.ring.forEach((point) =>
        expect(clearance(point, [BOARD_RING]) > 0 && isInside([BOARD_RING], point)).toBe(true),
      ),
    );
  });

  it('keeps the treble board edge behind the resting hammer heads', () => {
    expect(Math.max(...BOARD_RING.map((point) => point.z))).toBeLessThan(RESTING_HEAD_BACK);
  });

  it('tapers the board from the centre to the edges', () => {
    const thicknesses = BOARD_STEINER.map(boardThickness);
    expect(Math.max(...thicknesses)).toBeCloseTo(SOUNDBOARD.centreThickness, 4);
    BOARD_RING.forEach((point) =>
      expect(boardThickness(point)).toBeCloseTo(SOUNDBOARD.edgeThickness, 6),
    );
  });

  it('glues every rib under the board', () => {
    RIB_RINGS.flat().forEach((point) => expect(isInside([BOARD_RING], point)).toBe(true));
  });
});
