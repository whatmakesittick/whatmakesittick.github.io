import { describe, expect, it } from 'vitest';
import { TRAINING_IDS } from '../ids';
import { BASE_MOTORS, MAX_MOTORS, motorsFor, trainingLevel } from './training';

describe('training levels', () => {
  it('starts untrained with 4.8% mitochondria, the base membrane and four motors', () => {
    expect(trainingLevel('untrained')).toEqual({
      mitochondriaPercent: 4.8,
      membraneFactor: 1,
      motors: BASE_MOTORS,
    });
  });

  it('adds mitochondria after ten weeks without packing the folds any denser', () => {
    const { mitochondriaPercent, membraneFactor, motors } = trainingLevel('tenWeeks');
    expect(mitochondriaPercent).toBe(6.8);
    expect(membraneFactor).toBeCloseTo(1.42, 2);
    expect(motors).toBe(6);
  });

  it('reaches about 10% and two and a half times the fold membrane after years', () => {
    expect(trainingLevel('years')).toEqual({
      mitochondriaPercent: 10,
      membraneFactor: 2.5,
      motors: 10,
    });
  });

  it('draws motors in pairs in proportion to the membrane', () => {
    expect(motorsFor(1)).toBe(4);
    expect(motorsFor(1.2)).toBe(4);
    expect(motorsFor(1.3)).toBe(6);
    expect(motorsFor(4)).toBe(MAX_MOTORS);
    TRAINING_IDS.forEach((id) => expect(trainingLevel(id).motors % 2, id).toBe(0));
  });

  it('grows with every level', () => {
    const levels = TRAINING_IDS.map(trainingLevel);
    levels.slice(1).forEach((next, index) => {
      expect(next.mitochondriaPercent).toBeGreaterThan(levels[index].mitochondriaPercent);
      expect(next.motors).toBeGreaterThan(levels[index].motors);
    });
  });
});
