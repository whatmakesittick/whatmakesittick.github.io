import { describe, expect, it } from 'vitest';
import { pressuresOf, timeOf, valveStateOf, volumeOf } from './derived';

describe('derived heart values', () => {
  it('reads the moment in the beat from the phase', () => {
    expect(timeOf({ phase: 320 })).toBe(320);
  });

  it('peaks at about 120 over 80 in the left ventricle and the aorta', () => {
    const peak = pressuresOf({ phase: 340 });
    expect(peak.leftVentricle).toBeCloseTo(120, 0);
    expect(peak.aorta).toBeCloseTo(120, 0);
    expect(pressuresOf({ phase: 240 }).aorta).toBeCloseTo(80, 0);
    expect(peak.rightVentricle).toBeLessThan(30);
  });

  it('holds the ventricle at 120 mL while all four valves are shut', () => {
    expect(volumeOf({ phase: 200 })).toBeCloseTo(120);
    expect(valveStateOf({ phase: 200 })).toBe('allClosed');
    expect(valveStateOf({ phase: 400 })).toBe('semilunarOpen');
    expect(valveStateOf({ phase: 700 })).toBe('avOpen');
  });
});
