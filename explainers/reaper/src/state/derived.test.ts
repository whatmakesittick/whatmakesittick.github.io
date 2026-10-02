import { describe, expect, it } from 'vitest';
import {
  HANDBACK_MIN,
  HANDOVER_MIN,
  MOMENTS,
  flightAt,
  fuelAt,
  sensorAt,
  strikeAt,
  unitsAt,
} from '../model';
import { missionAt } from './derived';

describe('mission readings', () => {
  it('reads the flight, the strike, the sensor, the link and the fuel under the scrubber', () => {
    const reading = missionAt({ phase: 50, sensorMode: 'infrared', load: 'armed' });
    expect(reading.clock).toBeCloseTo(90 + (10 / 22) * 390, 9);
    expect(reading.flight).toEqual(flightAt(50));
    expect(reading.strike).toEqual(strikeAt(50, 'armed'));
    expect(reading.sensor).toEqual(sensorAt(50, 'infrared', 'armed'));
    expect(reading.link).toBe('sat');
    expect(reading.fuel).toEqual(fuelAt(50, 'armed'));
  });

  it('flies by radio near the airfield and through the satellite in between', () => {
    const at = (minutes: number) =>
      missionAt({ phase: unitsAt(minutes), sensorMode: 'day', load: 'armed' });
    expect(at(HANDOVER_MIN - 1).link).toBe('los');
    expect(at(HANDOVER_MIN).link).toBe('sat');
    expect(at(HANDBACK_MIN - 1).link).toBe('sat');
    expect(at(HANDBACK_MIN).link).toBe('los');
  });

  it('neither launches nor lases on the unarmed load', () => {
    const clean = missionAt({ phase: MOMENTS.launch + 1, sensorMode: 'laser', load: 'clean' });
    expect(clean.strike.stage).toBe('none');
    expect(clean.sensor.lasing).toBe(false);
  });

  it('reuses the reading until the time, the sensor mode or the load changes', () => {
    const first = missionAt({ phase: 30, sensorMode: 'day', load: 'armed' });
    expect(missionAt({ phase: 30, sensorMode: 'day', load: 'armed' })).toBe(first);
    expect(missionAt({ phase: 30, sensorMode: 'laser', load: 'armed' })).not.toBe(first);
    const clean = missionAt({ phase: 30, sensorMode: 'laser', load: 'clean' });
    expect(clean.fuel.kg).toBeGreaterThan(first.fuel.kg);
  });
});
