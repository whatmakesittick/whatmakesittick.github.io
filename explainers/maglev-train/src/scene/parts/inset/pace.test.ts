import { describe, expect, it } from 'vitest';
import { KMH_300, KMH_430, toMs } from '../../../model';
import { FIELD_WAVELENGTH_DRAWN } from './layout';
import { INSET_PACE, fieldLead, insetPace, patternOffset } from './pace';

const SLOW_MS = 0.5;
const CLOSE = 3;

describe('insetPace', () => {
  it('stays still when the train stands', () => {
    expect(insetPace(0)).toBe(0);
    expect(insetPace(-1)).toBe(0);
  });

  it('is nearly proportional at walking speed', () => {
    const slope = INSET_PACE.ceilingDrawnMs / INSET_PACE.halfSpeedMs;
    expect(insetPace(SLOW_MS) / SLOW_MS).toBeCloseTo(slope, 1);
    expect(insetPace(2 * SLOW_MS)).toBeCloseTo(2 * insetPace(SLOW_MS), 1);
  });

  it('reaches half its ceiling at the half speed', () => {
    expect(insetPace(INSET_PACE.halfSpeedMs)).toBeCloseTo(INSET_PACE.ceilingDrawnMs / 2, CLOSE);
  });

  it('keeps the bands readable at top speed and still tells the two top speeds apart', () => {
    const top = insetPace(toMs(KMH_430));
    const lower = insetPace(toMs(KMH_300));
    expect(top).toBeLessThan(INSET_PACE.ceilingDrawnMs);
    expect(top / FIELD_WAVELENGTH_DRAWN).toBeLessThan(1);
    expect(top).toBeGreaterThan(lower);
  });

  it('grows with speed', () => {
    const speeds = [0, 1, 5, 20, 60, 120];
    const paces = speeds.map(insetPace);
    paces.slice(1).forEach((pace, index) => expect(pace).toBeGreaterThan(paces[index]));
  });
});

describe('patternOffset', () => {
  it('wraps the shift into one wavelength', () => {
    expect(patternOffset(0)).toBe(0);
    expect(patternOffset(FIELD_WAVELENGTH_DRAWN * 2.25)).toBeCloseTo(0.25, CLOSE);
    expect(patternOffset(-FIELD_WAVELENGTH_DRAWN * 0.25)).toBeCloseTo(0.75, CLOSE);
  });
});

describe('fieldLead', () => {
  it('leads the poles while driving and trails them while braking', () => {
    expect(fieldLead(false)).toBeGreaterThan(0);
    expect(fieldLead(true)).toBe(-fieldLead(false));
  });
});
