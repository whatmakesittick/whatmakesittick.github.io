import { describe, expect, it } from 'vitest';
import { HARPSICHORD, KEY, UPRIGHT } from '../../../model';
import { leaderSegments } from './leaders';

describe('line-up leaders', () => {
  it('run along the key tops and tick each key front', () => {
    const [level, ...ticks] = leaderSegments();
    expect(level.map(([y]) => y)).toEqual([KEY.top, KEY.top]);
    expect(level[0][1]).toBe(KEY.frontZ - KEY.length);
    expect(level[1][1]).toBeGreaterThan(HARPSICHORD.offsetZ);
    expect(ticks.map(([[, z]]) => z)).toEqual([KEY.frontZ, UPRIGHT.offsetZ, HARPSICHORD.offsetZ]);
    ticks.forEach(([bottom, top]) => {
      expect(bottom[0]).toBeLessThan(KEY.top - KEY.thickness);
      expect(top[0]).toBeGreaterThan(KEY.top);
    });
  });
});
