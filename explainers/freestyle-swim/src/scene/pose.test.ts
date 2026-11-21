import { describe, expect, it } from 'vitest';
import { bodyPose } from './pose';

describe('bodyPose', () => {
  it('lies level below the surface with the head down', () => {
    expect(bodyPose(0, 0)).toEqual({ x: 0, y: -0.075, pitchRad: 0 });
  });

  it('pitches up with the head lifted and follows the surge', () => {
    const pose = bodyPose(1, 0.02);
    expect(pose.x).toBe(0.02);
    expect(pose.pitchRad).toBeGreaterThan(0);
  });
});
