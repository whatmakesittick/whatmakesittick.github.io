import { describe, expect, it } from 'vitest';
import { FARM_RATED_KW, RATED_KW } from '../model';
import { WIND_OVERRIDE_RANGE, createWindFarmStore, liveReading } from '../state';
import { WIND_FARM_READOUTS } from './readouts';

const RATED_WIND = 12;
const HALF = 0.5;

function meterOf(id: string) {
  const meter = WIND_FARM_READOUTS.find((row) => row.id === id)?.meter;
  if (!meter) throw new Error(`No meter on ${id}`);
  return meter;
}

describe('gauge readouts', () => {
  it('shows the wind, the turbine power and the farm power', () => {
    expect(WIND_FARM_READOUTS.map((row) => row.id)).toEqual(['wind', 'power', 'farm']);
    WIND_FARM_READOUTS.forEach((row) => expect(row.labelKey).toBe(`readouts.${row.id}`));
    WIND_FARM_READOUTS.forEach((row) => expect(row.numeric).toBe(true));
  });

  it('meters the wind against the slider range and the power against the ratings', () => {
    const state = createWindFarmStore({ windOverride: RATED_WIND }).getState();
    const reading = liveReading(state);
    expect(meterOf('wind').share(state)).toBeCloseTo(RATED_WIND / WIND_OVERRIDE_RANGE.max);
    expect(meterOf('power').share(state)).toBeCloseTo(reading.heroKw / RATED_KW);
    expect(meterOf('power').share(state)).toBeCloseTo(1);
    expect(meterOf('farm').share(state)).toBeCloseTo(reading.farmKw / FARM_RATED_KW);
    expect(meterOf('farm').share(state)).toBeGreaterThan(HALF);
  });
});
