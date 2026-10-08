import { describe, expect, it } from 'vitest';
import {
  advanceAzimuth,
  generatorRpm,
  operatingAt,
  operatingAtWind,
  parkedWindow,
  runningPitchDeg,
  runningRpm,
  runningState,
  tipSpeed,
} from './control';
import { dayWind } from './day';

const FULL_TURN_RAD = 2 * Math.PI;

describe('running turbine', () => {
  it('follows the wind with the rotor speed up to 10.4 rpm', () => {
    expect(runningRpm(8)).toBeCloseTo(8.15, 2);
    expect(runningRpm(15)).toBe(10.4);
    expect(runningRpm(-1)).toBe(0);
  });

  it('moves the blade tip at about 82 m/s at full speed', () => {
    expect(tipSpeed(10.4)).toBeCloseTo(81.68, 2);
  });

  it('gears the rotor up to about 1487 rpm at the generator', () => {
    expect(generatorRpm(10.4)).toBeCloseTo(1487.2, 9);
  });

  it('pitches the blades only above 11 m/s', () => {
    expect(runningPitchDeg(10)).toBe(0);
    expect(runningPitchDeg(15)).toBe(12);
  });

  it('names the state by the wind speed', () => {
    expect(runningState(2.9)).toBe('idle');
    expect(runningState(3)).toBe('partial');
    expect(runningState(12)).toBe('full');
    expect(runningState(20)).toBe('full');
    expect(runningState(20.5)).toBe('rampDown');
    expect(runningState(24.5)).toBe('parked');
  });
});

describe('parkedWindow', () => {
  it('stops in the storm and restarts as it eases at every site', () => {
    expect(parkedWindow('typical')).toEqual({ stop: 993, restart: 1122 });
    expect(parkedWindow('calm')).toEqual({ stop: 995, restart: 1115 });
    expect(parkedWindow('windy')).toEqual({ stop: 989, restart: 1132 });
  });
});

describe('operatingAt', () => {
  const { stop, restart } = parkedWindow('typical') ?? { stop: 0, restart: 0 };

  it('runs at full power at noon', () => {
    const noon = operatingAt(720, 'typical');
    expect(noon.state).toBe('full');
    expect(noon.producing).toBe(true);
    expect(noon.braked).toBe(false);
  });

  it('feathers the blades while stopping', () => {
    const halfway = operatingAt(stop + 10, 'typical');
    const runningPitch = runningPitchDeg(dayWind(stop, 'typical'));
    expect(halfway.state).toBe('stopping');
    expect(halfway.producing).toBe(false);
    expect(halfway.braked).toBe(false);
    expect(halfway.pitchDeg).toBeGreaterThan(runningPitch);
    expect(halfway.pitchDeg).toBeLessThan(90);
    expect(operatingAt(stop + 19, 'typical').braked).toBe(true);
  });

  it('parks the rotor feathered and braked in the storm core', () => {
    expect(operatingAt(1050, 'typical')).toEqual({
      state: 'parked',
      rpm: 0,
      pitchDeg: 90,
      braked: true,
      producing: false,
    });
  });

  it('releases the brake while starting and runs again afterwards', () => {
    const starting = operatingAt(restart + 10, 'typical');
    expect(starting.state).toBe('starting');
    expect(starting.braked).toBe(false);
    expect(starting.producing).toBe(false);
    const running = operatingAt(restart + 20, 'typical');
    expect(running.producing).toBe(true);
    expect(running.braked).toBe(false);
  });
});

describe('operatingAtWind', () => {
  it('parks at cut-out and ramps down just below it', () => {
    expect(operatingAtWind(25).state).toBe('parked');
    expect(operatingAtWind(23).state).toBe('rampDown');
  });
});

describe('advanceAzimuth', () => {
  it('turns one full revolution in 6 s at 10 rpm', () => {
    const azimuth = advanceAzimuth(0, 10, 6);
    expect(Math.min(azimuth, FULL_TURN_RAD - azimuth)).toBeCloseTo(0, 9);
  });

  it('keeps the angle within one turn', () => {
    [-10, -1, -FULL_TURN_RAD].forEach((start) => {
      const azimuth = advanceAzimuth(start, 0, 1);
      expect(azimuth).toBeGreaterThanOrEqual(0);
      expect(azimuth).toBeLessThan(FULL_TURN_RAD);
    });
    expect(advanceAzimuth(-1, 0, 1)).toBeCloseTo(FULL_TURN_RAD - 1, 9);
  });
});
