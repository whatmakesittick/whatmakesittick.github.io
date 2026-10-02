import { describe, expect, it } from 'vitest';
import { flightAt } from './flight';
import { LOITER, TARGET } from './layout';
import { MOMENTS } from './mission';
import { LAUNCH_POINT, missilePointAt, sensorAimAt, sensorAt, strikeAt } from './strike';

describe('strikeAt', () => {
  it('keeps the missile on the rail until the launch moment', () => {
    expect(strikeAt(0, 'armed')).toMatchObject({ stage: 'armed', share: 0, launchPoint: null });
    expect(strikeAt(MOMENTS.launch - 0.1, 'armed').stage).toBe('armed');
  });

  it('flies the missile from the launch point to the target and flashes on impact', () => {
    expect(strikeAt(MOMENTS.launch, 'armed')).toMatchObject({ stage: 'flying', share: 0 });
    const mid = (MOMENTS.launch + MOMENTS.impact) / 2;
    expect(strikeAt(mid, 'armed').share).toBeCloseTo(0.5, 9);
    expect(strikeAt(MOMENTS.impact, 'armed')).toMatchObject({ stage: 'hit', share: 1, flash: 1 });
    expect(strikeAt(MOMENTS.impact + 1, 'armed').flash).toBeCloseTo(0.5, 9);
    expect(strikeAt(MOMENTS.impact + 2, 'armed')).toMatchObject({ stage: 'done', flash: 0 });
  });

  it('launches from where the aircraft is at the launch moment', () => {
    expect(LAUNCH_POINT).toEqual(flightAt(MOMENTS.launch).position);
    expect(missilePointAt(0)).toEqual(LAUNCH_POINT);
    expect(missilePointAt(1)).toEqual(TARGET);
    expect(missilePointAt(0.5)[1]).toBeGreaterThan((LAUNCH_POINT[1] + TARGET[1]) / 2);
  });

  it('launches from the orbit, about eight kilometres from the target', () => {
    const slant = Math.hypot(
      LAUNCH_POINT[0] - TARGET[0],
      LAUNCH_POINT[1] - TARGET[1],
      LAUNCH_POINT[2] - TARGET[2],
    );
    expect(Math.hypot(LAUNCH_POINT[0] - TARGET[0], LAUNCH_POINT[2] - TARGET[2])).toBeCloseTo(
      LOITER.radius,
      6,
    );
    expect(slant * 20).toBeGreaterThan(8000);
    expect(slant * 20).toBeLessThan(8400);
  });
});

describe('clean load', () => {
  it('never launches or lases without weapons on board', () => {
    expect(strikeAt(70, 'clean')).toMatchObject({ stage: 'none', launchPoint: null });
    expect(sensorAt(70, 'laser', 'clean').lasing).toBe(false);
  });
});

describe('sensor', () => {
  it('looks ahead on the way out and at the target on station', () => {
    expect(sensorAimAt(50)).toEqual(TARGET);
    const ahead = sensorAimAt(30);
    const { position } = flightAt(30);
    expect(ahead[0]).toBeGreaterThan(position[0]);
    expect(ahead[1]).toBe(0);
    expect(sensorAt(30, 'day', 'armed').onTarget).toBe(false);
    expect(sensorAt(50, 'infrared', 'armed').onTarget).toBe(true);
  });

  it('lases only while the missile is in the air', () => {
    expect(sensorAt(MOMENTS.launch - 0.1, 'laser', 'armed').lasing).toBe(false);
    expect(sensorAt(MOMENTS.launch + 1, 'laser', 'armed').lasing).toBe(true);
    expect(sensorAt(MOMENTS.impact + 0.1, 'laser', 'armed').lasing).toBe(false);
  });
});
