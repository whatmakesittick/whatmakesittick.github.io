import { describe, expect, it } from 'vitest';
import { MACHINE_IDS } from '../ids';
import { dropletsPerSecondText, scanSeconds, secondsPerWafer, wafersPerHour } from './throughput';

describe('throughput', () => {
  it('reads wafers an hour per machine', () => {
    expect(MACHINE_IDS.map(wafersPerHour)).toEqual([160, 220, 150]);
  });

  it('scans one field in 0.29, 0.21 and 0.15 seconds', () => {
    expect(scanSeconds('nxe3600d')).toBeCloseTo(0.29, 2);
    expect(scanSeconds('nxe3800e')).toBeCloseTo(0.21, 2);
    expect(scanSeconds('exe5000')).toBeCloseTo(0.15, 2);
  });

  it('divides the hour by the wafers', () => {
    expect(secondsPerWafer('nxe3600d')).toBe(22.5);
  });

  it('says the droplet rate is exact only for the 3600D', () => {
    expect(MACHINE_IDS.map(dropletsPerSecondText)).toEqual(['exact', 'orMore', 'orMore']);
  });
});
