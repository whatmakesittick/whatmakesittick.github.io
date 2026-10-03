import { describe, expect, it } from 'vitest';
import { SPEEDSTER_IDS } from '../ids';
import { SPEEDSTERS, secondsOverField } from './speeds';

describe('speedsters', () => {
  it('lists the long range class, the racer and the record holder', () => {
    expect(Object.keys(SPEEDSTERS)).toEqual([...SPEEDSTER_IDS]);
    expect(SPEEDSTERS.longRange.topKmh).toBe(140);
    expect(SPEEDSTERS.racer.topKmh).toBe(263);
    expect(SPEEDSTERS.record.topKmh).toBe(657.59);
    SPEEDSTER_IDS.forEach((id) => expect(SPEEDSTERS[id].whoKey).toBe(`speeds.who.${id}`));
  });

  it('crosses the 350 m to the crossroads in nine, five and two seconds', () => {
    expect(secondsOverField(140)).toBeCloseTo(9, 0);
    expect(secondsOverField(263)).toBeCloseTo(4.8, 1);
    expect(secondsOverField(657.59)).toBeCloseTo(1.9, 1);
    expect(secondsOverField(70)).toBeCloseTo(18, 0);
  });
});
