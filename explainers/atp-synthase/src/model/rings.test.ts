import { describe, expect, it } from 'vitest';
import { ringFacts } from './rings';

describe('rotor rings', () => {
  it('needs about 2.7 protons per ATP with the eight blades of an animal ring', () => {
    expect(ringFacts('animal')).toEqual({
      blades: 8,
      protonsPerAtp: 2.7,
      atpPerHundredProtons: 37.5,
    });
  });

  it('needs more protons per ATP with the bigger rings of yeast and spinach', () => {
    expect(ringFacts('yeast')).toEqual({
      blades: 10,
      protonsPerAtp: 3.3,
      atpPerHundredProtons: 30,
    });
    expect(ringFacts('chloroplast')).toEqual({
      blades: 14,
      protonsPerAtp: 4.7,
      atpPerHundredProtons: 21.4,
    });
  });
});
