import { describe, expect, it } from 'vitest';
import { BITE_SPOT, SPOON_STOPS, THROAT_EXIT, TONGUE_LIFT_CM } from '../model/layout';
import { BITE_GONE_S, SPOON_GONE_S, bitePose, spoonPose, tongueLift, tongueLiftCm } from './pose';

describe('spoon pose', () => {
  it('holds the spoon under the nose, then brings it in through the lips', () => {
    expect(spoonPose(-2).position).toEqual([...SPOON_STOPS.sniff]);
    expect(spoonPose(-1.2).position).toEqual([...SPOON_STOPS.sniff]);
    expect(spoonPose(-0.4).position).toEqual([...SPOON_STOPS.lips]);
    expect(spoonPose(0).position).toEqual([...SPOON_STOPS.inMouth]);
    expect(spoonPose(0.6).position).toEqual([...SPOON_STOPS.lips]);
    expect(spoonPose(1.4).position).toEqual([...SPOON_STOPS.away]);
  });

  it('moves smoothly between the stops and tilts as it leaves', () => {
    const halfway = spoonPose(-0.2).position[0];
    expect(halfway).toBeLessThan(SPOON_STOPS.lips[0]);
    expect(halfway).toBeGreaterThan(SPOON_STOPS.inMouth[0]);
    expect(spoonPose(0).tilt).toBe(0);
    expect(spoonPose(1.4).tilt).toBeGreaterThan(spoonPose(0.6).tilt);
  });

  it('hides the spoon once it is away', () => {
    expect(spoonPose(SPOON_GONE_S).visible).toBe(true);
    expect(spoonPose(SPOON_GONE_S + 0.1).visible).toBe(false);
    expect(spoonPose(18).position).toEqual([...SPOON_STOPS.away]);
  });

  it('writes into the pose it is given', () => {
    const out = { position: [0, 0, 0] as [number, number, number], tilt: 0, visible: false };
    expect(spoonPose(-1, out)).toBe(out);
  });
});

describe('bite pose', () => {
  it('rides on the spoon bowl before the spoon enters', () => {
    [-2, -1, -0.2].forEach((seconds) => {
      const spoon = spoonPose(seconds).position;
      const bite = bitePose(seconds, 0).position;
      expect(bite[0]).toBe(spoon[0]);
      expect(bite[1]).toBeGreaterThan(spoon[1]);
      expect(bite[2]).toBe(spoon[2]);
    });
  });

  it('settles on the tongue spot and stays there until the swallow', () => {
    [1, 5, 11.9].forEach((seconds) =>
      expect(bitePose(seconds, 0.5).position).toEqual([...BITE_SPOT]),
    );
  });

  it('slides into the throat and vanishes after the swallow', () => {
    const last = BITE_GONE_S - 1e-9;
    const [x, y, z] = bitePose(last, 1).position;
    expect(x).toBeCloseTo(THROAT_EXIT[0], 6);
    expect(y).toBeCloseTo(THROAT_EXIT[1] + tongueLiftCm(last), 6);
    expect(z).toBeCloseTo(THROAT_EXIT[2], 6);
    expect(bitePose(BITE_GONE_S - 0.01, 1).visible).toBe(true);
    expect(bitePose(BITE_GONE_S, 1).visible).toBe(false);
  });

  it('shrinks to half its size when melted', () => {
    expect(bitePose(3, 0).scale).toBe(1);
    expect(bitePose(3, 1).scale).toBe(0.5);
  });
});

describe('tongue lift', () => {
  it('lifts the tongue only during the swallow', () => {
    expect(tongueLift(11.9)).toBe(0);
    expect(tongueLift(12.5)).toBe(1);
    expect(tongueLift(13.2)).toBe(0);
    expect(tongueLiftCm(12.5)).toBe(TONGUE_LIFT_CM);
  });
});
