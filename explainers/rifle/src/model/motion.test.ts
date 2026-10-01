import { describe, expect, it } from 'vitest';
import {
  CARRIER_STROKE,
  EJECTOR_X,
  FREE_TRAVEL,
  HAMMER,
  RETARDER_ANGLE,
  UNLOCK_ANGLE,
} from './layout';
import { EJECT_MS, HAMMER_TIMES, VENTS_CLEAR_MS, motionAt } from './motion';
import { shotAt } from './shot';
import { EXIT_MS, LOCKED_MS, REAR_MS, UNLOCKED_MS } from './timing';

const MILLISECONDS = Array.from({ length: 1001 }, (_, index) => index / 10);

function boltFaceX(carrier: number): number {
  return -Math.max(0, carrier - FREE_TRAVEL);
}

describe('carrier and bolt', () => {
  it('keeps the carrier inside its stroke and still until the bullet is gone', () => {
    MILLISECONDS.forEach((ms) => {
      const { carrier } = motionAt(ms, 'open');
      expect(carrier).toBeGreaterThanOrEqual(0);
      expect(carrier).toBeLessThanOrEqual(CARRIER_STROKE);
      if (ms <= EXIT_MS) expect(carrier, `${ms} ms`).toBe(0);
    });
  });

  it('reaches the rear at 45 ms and is home again by 90 ms', () => {
    expect(motionAt(REAR_MS, 'open').carrier).toBe(CARRIER_STROKE);
    expect(motionAt(UNLOCKED_MS, 'open').carrier).toBe(20);
    expect(motionAt(LOCKED_MS, 'open').carrier).toBe(0);
    expect(motionAt(95, 'open').carrier).toBe(0);
  });

  it('turns the bolt only after the bullet has left the barrel', () => {
    MILLISECONDS.filter((ms) => motionAt(ms, 'open').bolt !== 0).forEach((ms) =>
      expect(shotAt(ms).stage, `${ms} ms`).toBe('gone'),
    );
    expect(motionAt(UNLOCKED_MS, 'open').bolt).toBeCloseTo(-UNLOCK_ANGLE, 9);
    expect(motionAt(60, 'open').bolt).toBeCloseTo(-UNLOCK_ANGLE, 9);
    expect(motionAt(LOCKED_MS, 'open').bolt).toBe(0);
  });

  it('meets the ejector when the case head on the bolt face reaches it', () => {
    expect(boltFaceX(motionAt(EJECT_MS, 'open').carrier)).toBeCloseTo(EJECTOR_X, 6);
    expect(EJECT_MS).toBeGreaterThan(UNLOCKED_MS);
    expect(EJECT_MS).toBeLessThan(REAR_MS);
    expect(motionAt(EJECT_MS, 'open').caseFlight).toBe(0);
    expect(motionAt(EJECT_MS + 11, 'open').caseFlight).toBe(1);
    expect(motionAt(99, 'open').caseFlight).toBe(1);
  });

  it('lets the gas out once the carrier has moved 25 mm', () => {
    expect(motionAt(VENTS_CLEAR_MS, 'open').carrier).toBeCloseTo(25, 6);
  });

  it('compresses the spring with the carrier', () => {
    expect(motionAt(REAR_MS, 'open').spring).toBe(1);
    expect(motionAt(0, 'open').spring).toBe(0);
  });

  it('feeds the next round on the way forward', () => {
    expect(motionAt(48, 'open').feed).toBe(0);
    expect(motionAt(67, 'open').feed).toBeCloseTo(0.5, 9);
    expect(motionAt(86, 'open').feed).toBe(1);
    expect(motionAt(99, 'open').feed).toBe(1);
  });
});

describe('hammer', () => {
  it('falls from the retarder onto the pin and lies there', () => {
    expect(motionAt(0, 'open').hammer).toBeCloseTo(RETARDER_ANGLE, 9);
    expect(motionAt(2, 'open').hammer).toBeCloseTo(RETARDER_ANGLE * 0.75, 9);
    expect(motionAt(HAMMER_TIMES.struck, 'open').hammer).toBe(0);
    expect(motionAt(10, 'open').hammer).toBe(0);
  });

  it('is cocked by the carrier, held back, then caught by the retarder', () => {
    expect(motionAt(17, 'open').hammer).toBeCloseTo(HAMMER.swing / 2, 9);
    expect(motionAt(HAMMER_TIMES.cocked, 'open').hammer).toBeCloseTo(HAMMER.swing, 9);
    expect(motionAt(LOCKED_MS, 'open').hammer).toBeCloseTo(HAMMER.swing, 9);
    expect(motionAt(HAMMER_TIMES.caught, 'open').hammer).toBeCloseTo(RETARDER_ANGLE, 9);
    expect(motionAt(99, 'open').hammer).toBeCloseTo(RETARDER_ANGLE, 9);
  });

  it('keeps the trigger held for automatic fire', () => {
    MILLISECONDS.forEach((ms) => expect(motionAt(ms, 'open').trigger).toBe(1));
  });
});

describe('blocked gas port', () => {
  it('fires once and leaves everything else still', () => {
    MILLISECONDS.forEach((ms) => {
      const motion = motionAt(ms, 'blocked');
      expect(motion).toMatchObject({ carrier: 0, bolt: 0, spring: 0, caseFlight: 0, feed: 0 });
      if (ms >= HAMMER_TIMES.struck) expect(motion.hammer, `${ms} ms`).toBe(0);
    });
    expect(motionAt(0, 'blocked').hammer).toBeCloseTo(RETARDER_ANGLE, 9);
  });
});
