import { describe, expect, it } from 'vitest';
import { DEMO_HOVER_SHARE } from '../../../model/motors';
import { GROUND_WASH } from '../../constants';
import { groundWashRadius, groundWashStrength } from './groundWash';

const HOVER = [DEMO_HOVER_SHARE, DEMO_HOVER_SHARE, DEMO_HOVER_SHARE, DEMO_HOVER_SHARE] as const;
const IDLE = HOVER.map((share) => share / 4) as unknown as typeof HOVER;

describe('ground wash', () => {
  it('blows hardest just above the ground in a hover', () => {
    expect(groundWashStrength(0, HOVER)).toBeCloseTo(1);
    expect(groundWashStrength(GROUND_WASH.reach.full, HOVER)).toBeCloseTo(1);
  });

  it('fades with height and is gone above its reach', () => {
    const low = groundWashStrength(2, HOVER);
    const high = groundWashStrength(4, HOVER);
    expect(high).toBeLessThan(low);
    expect(high).toBeGreaterThan(0);
    expect(groundWashStrength(GROUND_WASH.reach.none, HOVER)).toBe(0);
    expect(groundWashStrength(40, HOVER)).toBe(0);
  });

  it('grows with the thrust while the props spin up', () => {
    expect(groundWashStrength(0, IDLE)).toBeLessThan(groundWashStrength(0, HOVER) / 2);
    expect(groundWashStrength(0, [0, 0, 0, 0])).toBe(0);
  });

  it('spreads wider the higher the drone hovers', () => {
    expect(groundWashRadius(0)).toBe(GROUND_WASH.radius);
    expect(groundWashRadius(3)).toBeGreaterThan(groundWashRadius(1));
  });
});
