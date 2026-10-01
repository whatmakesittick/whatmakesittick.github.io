import { describe, expect, it } from 'vitest';
import { pressureAtTravel, speedAtTravel, travelAtTime } from './bore';
import { MUZZLE_PRESSURE_MPA, PEAK_PRESSURE_MPA, START_PRESSURE_MPA } from './constants';
import { BULLET_TRAVEL, RIFLED_LENGTH } from './layout';
import { VENTS_CLEAR_MS } from './motion';
import { BARREL_TIME_MS, EXIT_SPIN, EXIT_TURNS, shotAt, travelTimeMs } from './shot';
import { EXIT_MS, PEAK_MS, PORT_MS, PORT_TRAVEL_MM, START_MS, STRIKE_MS } from './timing';

const TRAVEL_STEPS = Array.from({ length: 387 }, (_, index) => Math.min(index, BULLET_TRAVEL));

describe('pressure behind the bullet', () => {
  it('starts at the pressure that moves the bullet and peaks at 275 MPa near 5 cm', () => {
    expect(pressureAtTravel(0)).toBe(START_PRESSURE_MPA);
    const peak = TRAVEL_STEPS.reduce((best, travel) =>
      pressureAtTravel(travel) > pressureAtTravel(best) ? travel : best,
    );
    expect(peak).toBeGreaterThanOrEqual(45);
    expect(peak).toBeLessThanOrEqual(55);
    expect(pressureAtTravel(peak)).toBeCloseTo(PEAK_PRESSURE_MPA, 6);
  });

  it('falls all the way to the muzzle after the peak', () => {
    const after = TRAVEL_STEPS.filter((travel) => travel >= 50);
    after
      .slice(1)
      .forEach((travel, index) =>
        expect(pressureAtTravel(travel)).toBeLessThan(pressureAtTravel(after[index])),
      );
    expect(pressureAtTravel(BULLET_TRAVEL)).toBeCloseTo(MUZZLE_PRESSURE_MPA, 6);
  });
});

describe('the bullet in the barrel', () => {
  it('leaves at 715 m/s about a millisecond after it starts to move', () => {
    expect(speedAtTravel(BULLET_TRAVEL)).toBeCloseTo(715, 0);
    expect(BARREL_TIME_MS).toBeGreaterThan(0.7);
    expect(BARREL_TIME_MS).toBeLessThan(1.3);
    expect(EXIT_MS).toBeCloseTo(START_MS + BARREL_TIME_MS, 9);
  });

  it('speeds up the whole way and inverts travel and time', () => {
    TRAVEL_STEPS.slice(1).forEach((travel, index) =>
      expect(speedAtTravel(travel)).toBeGreaterThanOrEqual(speedAtTravel(TRAVEL_STEPS[index])),
    );
    [10, 50, 200, PORT_TRAVEL_MM].forEach((travel) =>
      expect(travelAtTime(travelTimeMs(travel))).toBeCloseTo(travel, 6),
    );
  });

  it('spins about 2979 times a second at the muzzle after one and a half turns', () => {
    expect(EXIT_SPIN).toBeCloseTo(2979.2, 1);
    expect(EXIT_TURNS).toBeCloseTo(RIFLED_LENGTH / 240, 9);
    expect(EXIT_TURNS).toBeGreaterThan(1.5);
    expect(EXIT_TURNS).toBeLessThan(1.6);
  });

  it('passes the gas port a fraction of a millisecond before it leaves', () => {
    const lead = EXIT_MS - PORT_MS;
    expect(lead).toBeGreaterThan(0.1);
    expect(lead).toBeLessThan(0.3);
    expect(PEAK_MS).toBeGreaterThan(START_MS);
    expect(PEAK_MS).toBeLessThan(PORT_MS);
  });
});

describe('shot readings', () => {
  it('waits for the hammer, then builds pressure while the bullet stays seated', () => {
    expect(shotAt(0)).toMatchObject({ pressure: 0, travel: 0, speed: 0, stage: 'seated' });
    expect(shotAt(STRIKE_MS).pressure).toBe(0);
    expect(shotAt((STRIKE_MS + START_MS) / 2)).toMatchObject({ stage: 'seated', travel: 0 });
    expect(shotAt((STRIKE_MS + START_MS) / 2).pressure).toBeCloseTo(START_PRESSURE_MPA / 2, 6);
  });

  it('moves the bullet down the barrel, the pressure peaking at the peak moment', () => {
    const peak = shotAt(PEAK_MS);
    expect(peak.stage).toBe('moving');
    expect(peak.travel).toBeCloseTo(50, 3);
    expect(peak.pressure).toBeCloseTo(PEAK_PRESSURE_MPA, 3);
    expect(shotAt(PORT_MS).travel).toBeCloseTo(PORT_TRAVEL_MM, 3);
  });

  it('lets the pressure and the flash die away once the bullet has gone', () => {
    expect(shotAt(EXIT_MS)).toMatchObject({
      stage: 'gone',
      travel: BULLET_TRAVEL,
      speed: 715,
      pressure: MUZZLE_PRESSURE_MPA,
      muzzleFlash: 1,
    });
    expect(shotAt(EXIT_MS + 0.5).pressure).toBe(0);
    expect(shotAt(EXIT_MS + 0.5).muzzleFlash).toBeCloseTo(0.5, 9);
    expect(shotAt(EXIT_MS + 1).muzzleFlash).toBe(0);
    expect(shotAt(60)).toMatchObject({ spin: EXIT_SPIN, turns: EXIT_TURNS, stage: 'gone' });
  });

  it('fills the gas chamber from the port crossing to the exit and empties it after the vents', () => {
    expect(shotAt(PORT_MS).gas).toBe(0);
    expect(shotAt((PORT_MS + EXIT_MS) / 2).gas).toBeCloseTo(0.5, 6);
    expect(shotAt(EXIT_MS).gas).toBe(1);
    expect(shotAt(VENTS_CLEAR_MS).gas).toBe(1);
    expect(shotAt(VENTS_CLEAR_MS + 1).gas).toBeCloseTo(0.5, 6);
    expect(shotAt(VENTS_CLEAR_MS + 2).gas).toBe(0);
  });

  it('keeps the gas chamber empty with the port blocked', () => {
    [PORT_MS, EXIT_MS, VENTS_CLEAR_MS].forEach((ms) => expect(shotAt(ms, 'blocked').gas).toBe(0));
    expect(shotAt(EXIT_MS, 'blocked').stage).toBe('gone');
  });
});
