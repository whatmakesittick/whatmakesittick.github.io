import { describe, expect, it } from 'vitest';
import { BEAMS } from '../../constants';

const DRONE_END_WIDTH = 0.3;
const FAR_FADE = 0.15;

describe('link beams', () => {
  it('draws the control link as a thin path that widens a little toward the drone', () => {
    const { startRadius, endRadius, fade } = BEAMS.control;
    expect(endRadius * 2).toBeLessThanOrEqual(DRONE_END_WIDTH);
    expect(startRadius).toBeLessThan(endRadius);
    expect(fade[0]).toBeGreaterThanOrEqual(FAR_FADE);
  });

  it('draws the video link as a faint thin path that tapers toward the goggles', () => {
    const { startRadius, endRadius, fade, opacity } = BEAMS.video;
    expect(startRadius * 2).toBeLessThanOrEqual(DRONE_END_WIDTH);
    expect(endRadius).toBeLessThan(startRadius);
    expect(fade[1]).toBeGreaterThanOrEqual(FAR_FADE);
    expect(opacity).toBeLessThan(BEAMS.control.opacity);
  });
});
