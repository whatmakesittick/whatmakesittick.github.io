import { describe, expect, it } from 'vitest';
import { PROPELLANT_IDS } from '../ids';
import { MIXTURE_RATIO } from './performance';
import { PROPELLANTS, propellantFlow, toCelsius } from './propellants';

describe('propellants', () => {
  it('boils methane at 111 K and oxygen at 90 K, each above its freezing point', () => {
    expect(PROPELLANTS.methane.boilsAtK).toBe(111);
    expect(PROPELLANTS.oxygen.boilsAtK).toBe(90);
    PROPELLANT_IDS.forEach((id) =>
      expect(PROPELLANTS[id].freezesAtK, id).toBeLessThan(PROPELLANTS[id].boilsAtK),
    );
  });

  it('splits the mixture 22 to 78 by mass, close to the mixture ratio', () => {
    const { methane, oxygen } = PROPELLANTS;
    expect(methane.massShare + oxygen.massShare).toBeCloseTo(1);
    expect(oxygen.massShare / methane.massShare).toBeCloseTo(MIXTURE_RATIO, 0);
  });

  it('turns kelvin into degrees Celsius', () => {
    expect(toCelsius(111)).toBeCloseTo(-162.15);
    expect(toCelsius(90)).toBeCloseTo(-183.15);
  });

  it('feeds each propellant at its own rate', () => {
    expect(propellantFlow('methane', 1)).toBeCloseTo(165, 0);
    expect(propellantFlow('oxygen', 1)).toBeCloseTo(593, 0);
    expect(propellantFlow('oxygen', 0)).toBe(0);
  });
});
