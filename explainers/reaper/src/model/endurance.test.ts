import { describe, expect, it } from 'vitest';
import { AREA_DISTANCE_KM, CRUISE_KMH, ENDURANCE_H, stationHours, transitHours } from './endurance';

describe('endurance', () => {
  it('stays up about 27 h clean and about 14 h fully armed', () => {
    expect(ENDURANCE_H).toEqual({ clean: 27, armed: 14 });
    expect(CRUISE_KMH).toBe(370);
  });

  it('cruises 400 km out in about 1 h 05 min', () => {
    expect(transitHours(400)).toBeCloseTo(1.081, 3);
  });

  it('keeps about 10.8 h on station 400 km away armed and 23.8 h clean', () => {
    expect(stationHours(400, 'armed')).toBeCloseTo(10.838, 3);
    expect(stationHours(400, 'clean')).toBeCloseTo(23.838, 3);
  });

  it('never gives negative hours on station', () => {
    expect(stationHours(5000, 'armed')).toBe(0);
    expect(stationHours(AREA_DISTANCE_KM.max, 'armed')).toBeGreaterThan(0);
  });

  it('starts the slider at 400 km', () => {
    expect(AREA_DISTANCE_KM).toEqual({ min: 100, max: 2000, step: 50, default: 400 });
  });
});
