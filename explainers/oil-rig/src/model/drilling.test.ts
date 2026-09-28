import { describe, expect, it } from 'vitest';
import {
  CASING_RUN_HOURS,
  RATE_OF_PENETRATION,
  campaignDay,
  campaignHours,
  drillStringWeightT,
  holeDiameterMm,
  roundTripHours,
  standsInHole,
} from './drilling';
import { RISER_LANDED_DEPTH_M, SEABED_DEPTH_M, STAND_LENGTH_M, TOTAL_DEPTH_M } from './wellPlan';

describe('drilling the well', () => {
  it('drills tens of metres an hour in soft rock and a few in hard rock', () => {
    expect(RATE_OF_PENETRATION.pdc.seabed).toBeGreaterThanOrEqual(10);
    expect(RATE_OF_PENETRATION.pdc.base).toBeLessThan(10);
    expect(RATE_OF_PENETRATION.rollerCone.claystone).toBeCloseTo(
      RATE_OF_PENETRATION.pdc.claystone * 0.75,
    );
    expect(RATE_OF_PENETRATION.rollerCone.base).toBe(RATE_OF_PENETRATION.pdc.base);
  });

  it('starts on day 1 and reaches total depth near day 30', () => {
    expect(campaignDay(0, 'pdc')).toBe(1);
    expect(campaignDay(SEABED_DEPTH_M, 'pdc')).toBe(1);
    expect(campaignDay(TOTAL_DEPTH_M, 'pdc')).toBeGreaterThanOrEqual(28);
    expect(campaignDay(TOTAL_DEPTH_M, 'pdc')).toBeLessThanOrEqual(32);
  });

  it('takes longer with a roller-cone bit', () => {
    expect(campaignHours(TOTAL_DEPTH_M, 'rollerCone')).toBeGreaterThan(
      campaignHours(TOTAL_DEPTH_M, 'pdc'),
    );
  });

  it('adds the casing, the round trip and the riser once the bit passes the surface shoe', () => {
    const before = campaignHours(RISER_LANDED_DEPTH_M - 1, 'pdc');
    const after = campaignHours(RISER_LANDED_DEPTH_M + 1, 'pdc');
    const extra = CASING_RUN_HOURS + roundTripHours(RISER_LANDED_DEPTH_M);
    expect(after - before).toBeGreaterThan(extra);
  });

  it('takes about half a day for a round trip at 3,000 m', () => {
    expect(roundTripHours(3000)).toBe(12);
  });

  it('counts pipe in 28 m stands', () => {
    expect(STAND_LENGTH_M).toBe(28);
    expect(standsInHole(0)).toBe(0);
    expect(standsInHole(28)).toBe(1);
    expect(standsInHole(29)).toBe(2);
  });

  it('hangs about 160 t from the hook at total depth in 1.40 mud', () => {
    expect(drillStringWeightT(TOTAL_DEPTH_M, 1.4)).toBeCloseTo(160, -1);
    expect(drillStringWeightT(TOTAL_DEPTH_M, 1.4)).toBeLessThan(
      drillStringWeightT(TOTAL_DEPTH_M, 1),
    );
    expect(drillStringWeightT(0, 1.4)).toBe(0);
  });

  it('narrows the hole from 36 in at the top to 8½ in at the bottom', () => {
    expect(holeDiameterMm(SEABED_DEPTH_M)).toBeCloseTo(914, 0);
    expect(holeDiameterMm(3000)).toBeCloseTo(444.5);
    expect(holeDiameterMm(TOTAL_DEPTH_M)).toBeCloseTo(216, 0);
  });
});
