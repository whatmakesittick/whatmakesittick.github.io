import { describe, expect, it } from 'vitest';
import { SOLAR_NOON_MIN, SUNRISE_MIN, SUNSET_MIN } from './day';
import {
  LATITUDE_DEG,
  airMass,
  directNormalIrradiance,
  globalHorizontalIrradiance,
  hourAngleDeg,
  incidenceAngleDeg,
  incidenceCosine,
  irradianceParts,
  isSunUp,
  planeOfArrayIrradiance,
  sunAzimuthDeg,
  sunDirection,
  sunElevationDeg,
} from './sun';

const RIGHT_ANGLE = 90;
const TILT = 35;

describe('sun position', () => {
  it('turns fifteen degrees an hour around solar noon', () => {
    expect(hourAngleDeg(SOLAR_NOON_MIN)).toBe(0);
    expect(hourAngleDeg(SOLAR_NOON_MIN + 60)).toBe(15);
  });

  it('peaks at noon at the co-latitude on the equinox', () => {
    expect(sunElevationDeg(SOLAR_NOON_MIN)).toBeCloseTo(RIGHT_ANGLE - LATITUDE_DEG);
    expect(sunElevationDeg(SUNRISE_MIN)).toBeCloseTo(0);
    expect(sunElevationDeg(SUNSET_MIN)).toBeCloseTo(0);
    expect(isSunUp(SUNRISE_MIN - 1)).toBe(false);
    expect(isSunUp(SUNRISE_MIN + 1)).toBe(true);
  });

  it('rises due east, stands due south at noon and sets due west', () => {
    expect(sunAzimuthDeg(SUNRISE_MIN)).toBeCloseTo(90);
    expect(sunAzimuthDeg(SOLAR_NOON_MIN)).toBeCloseTo(180);
    expect(sunAzimuthDeg(SUNSET_MIN)).toBeCloseTo(270);
  });

  it('points toward the sun in world axes, east x, up y, south z', () => {
    const [east, up, south] = sunDirection(SOLAR_NOON_MIN);
    expect(east).toBeCloseTo(0);
    expect(up).toBeGreaterThan(0);
    expect(south).toBeGreaterThan(0);
    const [morningEast] = sunDirection(SUNRISE_MIN + 60);
    expect(morningEast).toBeGreaterThan(0);
  });
});

describe('incidence', () => {
  it('faces the sun squarely at noon when the tilt equals the zenith angle', () => {
    expect(incidenceCosine(SOLAR_NOON_MIN, LATITUDE_DEG)).toBeCloseTo(1);
    expect(incidenceAngleDeg(SOLAR_NOON_MIN, TILT)).toBeCloseTo(LATITUDE_DEG - TILT);
  });

  it('never goes negative when the sun is behind the panel', () => {
    expect(incidenceCosine(SUNRISE_MIN - 30, TILT)).toBe(0);
  });
});

describe('clear sky', () => {
  it('has an air mass of one at the zenith and about thirty eight at the horizon', () => {
    expect(airMass(RIGHT_ANGLE)).toBeCloseTo(1, 2);
    expect(airMass(0)).toBeGreaterThan(35);
    expect(airMass(0)).toBeLessThan(40);
    expect(airMass(50)).toBeCloseTo(1.3, 1);
  });

  it('matches the facts sheet table at noon for the roof, a flat panel and a wall', () => {
    expect(planeOfArrayIrradiance(SOLAR_NOON_MIN, TILT)).toBeCloseTo(973, -1);
    expect(planeOfArrayIrradiance(SOLAR_NOON_MIN, 0)).toBeCloseTo(764, -1);
    expect(planeOfArrayIrradiance(SOLAR_NOON_MIN, RIGHT_ANGLE)).toBeCloseTo(687, -1);
    expect(globalHorizontalIrradiance(SOLAR_NOON_MIN)).toBeCloseTo(764, -1);
  });

  it('matches the facts sheet table in the morning', () => {
    expect(planeOfArrayIrradiance(SOLAR_NOON_MIN - 180, TILT)).toBeCloseTo(636, -1);
    expect(planeOfArrayIrradiance(SOLAR_NOON_MIN - 300, TILT)).toBeCloseTo(167, -1);
  });

  it('is dark before sunrise and after sunset', () => {
    expect(directNormalIrradiance(0)).toBe(0);
    expect(planeOfArrayIrradiance(SUNRISE_MIN - 10, TILT)).toBe(0);
    expect(irradianceParts(SUNSET_MIN + 10, TILT).total).toBe(0);
  });

  it('adds a small diffuse share and a ground bounce to the direct beam', () => {
    const parts = irradianceParts(SOLAR_NOON_MIN, TILT);
    expect(parts.diffuse).toBeGreaterThan(0);
    expect(parts.diffuse).toBeLessThan(parts.direct * 0.15);
    expect(parts.ground).toBeLessThan(parts.diffuse);
    expect(parts.total).toBeCloseTo(parts.direct + parts.diffuse + parts.ground);
    expect(irradianceParts(SOLAR_NOON_MIN, 0).ground).toBe(0);
  });
});
