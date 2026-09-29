import { describe, expect, it } from 'vitest';
import {
  ALTITUDE_KEYS,
  CUTOFF_TIME,
  END_TIME,
  MAX_Q_TIME,
  RUN_LENGTH,
  START_LEAD,
  START_SEQUENCE,
  altitudeKm,
  chamberGlow,
  engineState,
  flightTime,
  gimbal,
  isRunning,
  phaseAt,
  phaseAtAltitude,
  preburnerGlow,
  speedKmh,
  spin,
  throttle,
} from './flight';

describe('flight clock', () => {
  it('starts three seconds before liftoff and ends two after cutoff', () => {
    expect(START_LEAD).toBe(3);
    expect(RUN_LENGTH).toBe(145);
    expect(flightTime(START_LEAD)).toBe(0);
    expect(phaseAt(CUTOFF_TIME)).toBe(143);
    expect(flightTime(RUN_LENGTH)).toBe(END_TIME);
  });
});

describe('profile', () => {
  it('passes through the webcast points', () => {
    ALTITUDE_KEYS.forEach(([time, km]) => expect(altitudeKm(time)).toBeCloseTo(km, 6));
    expect(speedKmh(CUTOFF_TIME)).toBeCloseTo(5800, 6);
  });

  it('rises the whole way up', () => {
    for (let time = 1; time <= CUTOFF_TIME; time += 1) {
      expect(altitudeKm(time)).toBeGreaterThan(altitudeKm(time - 1));
      expect(speedKmh(time)).toBeGreaterThan(speedKmh(time - 1));
    }
  });

  it('holds the rocket on the pad before liftoff', () => {
    expect(altitudeKm(-2)).toBe(0);
    expect(speedKmh(-2)).toBe(0);
  });
});

describe('throttle', () => {
  it('is off before the chamber lights and after cutoff', () => {
    expect(throttle(START_SEQUENCE.preburnerLight)).toBe(0);
    expect(throttle(CUTOFF_TIME)).toBe(0);
    expect(throttle(END_TIME)).toBe(0);
  });

  it('is full at liftoff and dips around max-Q', () => {
    expect(throttle(0)).toBe(1);
    expect(throttle(MAX_Q_TIME)).toBeLessThan(1);
    expect(throttle(100)).toBe(1);
  });
});

describe('start sequence', () => {
  it('spins the pumps before the preburners light', () => {
    expect(spin(START_SEQUENCE.spinStart - 0.1)).toBe(0);
    expect(spin(START_SEQUENCE.preburnerLight - 0.1)).toBeGreaterThan(0);
    expect(preburnerGlow(START_SEQUENCE.preburnerLight - 0.1)).toBe(0);
  });

  it('lights the preburners before the chamber', () => {
    const between = (START_SEQUENCE.preburnerLight + START_SEQUENCE.chamberLight) / 2;
    expect(preburnerGlow(between)).toBeGreaterThan(0);
    expect(chamberGlow(between)).toBe(0);
    expect(isRunning(between)).toBe(false);
    expect(isRunning(0)).toBe(true);
  });

  it('spins down and cools after cutoff', () => {
    expect(spin(CUTOFF_TIME + 0.5)).toBeGreaterThan(0);
    expect(spin(END_TIME)).toBe(0);
    expect(chamberGlow(CUTOFF_TIME + 0.5)).toBeGreaterThan(0);
    expect(chamberGlow(END_TIME)).toBe(0);
    expect(isRunning(CUTOFF_TIME)).toBe(false);
  });
});

describe('gimbal', () => {
  it('stays small and centred on the pad and after cutoff', () => {
    expect(gimbal(-1)).toEqual({ pitch: 0, yaw: 0 });
    expect(gimbal(CUTOFF_TIME)).toEqual({ pitch: 0, yaw: 0 });
    for (let time = 0; time <= CUTOFF_TIME; time += 0.5) {
      const { pitch, yaw } = gimbal(time);
      expect(Math.abs(pitch)).toBeLessThan(2);
      expect(Math.abs(yaw)).toBeLessThan(0.5);
    }
  });
});

describe('engineState', () => {
  it('reads sea level air at liftoff', () => {
    const state = engineState(START_LEAD);
    expect(state.time).toBe(0);
    expect(state.altitudeKm).toBe(0);
    expect(state.airPressurePa).toBeCloseTo(101325, 0);
    expect(state.running).toBe(true);
  });
});

describe('phaseAtAltitude', () => {
  it('finds the moment the rocket passes a height', () => {
    const phase = phaseAtAltitude(19.9);
    expect(flightTime(phase)).toBeCloseTo(90, 0);
    expect(phaseAtAltitude(0)).toBe(START_LEAD);
    expect(phaseAtAltitude(60)).toBe(phaseAt(CUTOFF_TIME));
  });
});
