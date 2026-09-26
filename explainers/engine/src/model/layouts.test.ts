import { describe, expect, it } from 'vitest';
import {
  LAYOUTS,
  crankPinAngle,
  cylinderAngle,
  degreesBetweenFirings,
  firingOrder,
} from './layouts';

describe('layouts', () => {
  it('fires an inline four in the classic 1-3-4-2 order', () => {
    expect(firingOrder(LAYOUTS.inline4)).toEqual([1, 3, 4, 2]);
    expect(firingOrder(LAYOUTS.single)).toEqual([1]);
  });

  it('pairs the outer and inner crank throws', () => {
    const pins = LAYOUTS.inline4.cylinders.map(crankPinAngle);
    expect(pins).toEqual([0, 180, 180, 0]);
  });

  it('spaces the firings evenly', () => {
    expect(degreesBetweenFirings(LAYOUTS.inline4)).toBe(180);
    expect(degreesBetweenFirings(LAYOUTS.single)).toBe(720);
  });

  it('offsets each cylinder from the engine angle', () => {
    const [, second] = LAYOUTS.inline4.cylinders;
    expect(cylinderAngle(700, second)).toBe(160);
  });
});
