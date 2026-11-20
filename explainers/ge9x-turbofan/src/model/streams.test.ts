import { describe, expect, it } from 'vitest';
import {
  COLD_BUFFER,
  FAR_SHARE,
  HOT_BUFFER,
  HOT_TO_COLD_RATIO,
  REVERSE_COLD_DIRECTION,
  coldDirection,
  particleCounts,
  streamSpeeds,
} from './streams';

describe('streams', () => {
  it('makes the hot stream faster than the cold one', () => {
    const speeds = streamSpeeds(0.5, 0);
    expect(speeds.hot / speeds.cold).toBeCloseTo(HOT_TO_COLD_RATIO);
  });

  it('speeds up with the lever and slows when reversing at full lever', () => {
    expect(streamSpeeds(1, 0).cold).toBe(1);
    expect(streamSpeeds(1, 1).cold).toBeLessThan(1);
  });

  it('turns the cold stream forward only', () => {
    expect(coldDirection(0)).toBe(1);
    expect(coldDirection(1)).toBe(REVERSE_COLD_DIRECTION);
    expect(coldDirection(0.5)).toBeGreaterThan(REVERSE_COLD_DIRECTION);
  });

  it('draws the buffers near, fewer far, none for a hidden stream', () => {
    expect(particleCounts('both', 'near')).toEqual({ cold: COLD_BUFFER, hot: HOT_BUFFER });
    expect(particleCounts('both', 'far').cold).toBe(Math.round(COLD_BUFFER * FAR_SHARE));
    expect(particleCounts('cold', 'near').hot).toBe(0);
    expect(particleCounts('hot', 'near').cold).toBe(0);
  });
});
