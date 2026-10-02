import { describe, expect, it } from 'vitest';
import { HOVER_POWER_REF } from './figures';
import { cruisePowerW, forwardFactor, hoverPowerW, powerAt } from './power';

describe('power', () => {
  it('eases the forward flight saving in by the cruise speed', () => {
    expect(forwardFactor(0)).toBe(1);
    expect(forwardFactor(35)).toBeCloseTo(0.9, 9);
    expect(forwardFactor(70)).toBeCloseTo(0.8, 9);
    expect(forwardFactor(140)).toBeCloseTo(0.8, 9);
  });

  it('grows with thrust to the power of one and a half', () => {
    expect(powerAt(HOVER_POWER_REF.allUpG, 0)).toBe(HOVER_POWER_REF.watts);
    expect(powerAt(4 * HOVER_POWER_REF.allUpG, 0)).toBeCloseTo(8 * HOVER_POWER_REF.watts, 9);
    expect(powerAt(0, 0)).toBe(0);
  });

  it('hovers a 1.4 kg drone on about 360 W and cruises it on about the same', () => {
    expect(hoverPowerW(1400)).toBeCloseTo(359, 0);
    expect(cruisePowerW(1400)).toBeCloseTo(356, 0);
  });
});
