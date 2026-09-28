import { describe, expect, it } from 'vitest';
import {
  INITIAL_RESERVOIR_PRESSURE_BAR,
  OIL_COLUMN_BAR,
  PERFORATION_DEPTH_M,
  flowState,
  reservoirPressureBar,
  wellheadPressureBar,
} from './flow';

const LATE_LIFE_YEARS = 25;

describe('first oil', () => {
  it('perforates the middle of the oil leg at about 505 bar', () => {
    expect(PERFORATION_DEPTH_M).toBe(4140);
    expect(INITIAL_RESERVOIR_PRESSURE_BAR).toBeCloseTo(505, -1);
  });

  it('holds up a column of oil weighing about 346 bar', () => {
    expect(OIL_COLUMN_BAR).toBeCloseTo(345, 0);
  });

  it('leaves about 160 bar at the wellhead, so the well flows on its own', () => {
    expect(wellheadPressureBar(0)).toBeCloseTo(160, -1);
    expect(flowState(0)).toBe('natural');
  });

  it('loses pressure year by year until the well needs help late in life', () => {
    expect(reservoirPressureBar(10)).toBeLessThan(reservoirPressureBar(0));
    expect(flowState(10)).toBe('natural');
    expect(flowState(LATE_LIFE_YEARS)).toBe('assisted');
    expect(wellheadPressureBar(LATE_LIFE_YEARS)).toBe(0);
  });
});
