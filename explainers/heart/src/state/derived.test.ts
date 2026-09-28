import { describe, expect, it } from 'vitest';
import { heartRateOf, outputOf, pressuresOf, timeOf, valveStateOf, volumeOf } from './derived';

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

  it('turns the effort into a heart rate and an output', () => {
    expect(heartRateOf({ fitness: 'typical', effort: 0 })).toBe(75);
    expect(heartRateOf({ fitness: 'typical', effort: 1 })).toBe(190);
    expect(heartRateOf({ fitness: 'athlete', effort: 0 })).toBe(50);
    expect(outputOf({ fitness: 'typical', effort: 0 })).toBeCloseTo(5.25);
    expect(outputOf({ fitness: 'athlete', effort: 1 })).toBeCloseTo(27.75);
  });
});
