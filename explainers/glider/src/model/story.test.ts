import { describe, expect, it } from 'vitest';
import {
  FLIGHT_CYCLE,
  KEYFRAMES,
  PHASE_IDS,
  PHASE_RANGES,
  climbAt,
  heightAt,
  legAt,
  phaseAt,
} from './story';

const CORNER_TOLERANCE_METRES = 25;

describe('keyframes', () => {
  it('pins the heights of the flight loop', () => {
    expect(KEYFRAMES.map(({ time, height }) => [time, height])).toEqual([
      [0, 500],
      [450, 1500],
      [990, 1150],
      [1230, 1400],
      [1710, 2500],
      [1950, 1560],
      [2700, 500],
    ]);
  });

  it('closes the loop at the height it starts', () => {
    expect(KEYFRAMES[KEYFRAMES.length - 1]).toMatchObject({ time: FLIGHT_CYCLE, height: 500 });
  });
});

describe('phases', () => {
  it('cover the 45 minute loop end to end', () => {
    const ranges = PHASE_IDS.map((id) => PHASE_RANGES[id]);
    expect(ranges[0].start).toBe(0);
    expect(ranges[ranges.length - 1].end).toBe(FLIGHT_CYCLE);
    ranges.slice(1).forEach((range, index) => expect(range.start).toBe(ranges[index].end));
  });

  it('names the phase at any moment of the flight', () => {
    expect(phaseAt(0)).toBe('thermal');
    expect(phaseAt(449)).toBe('thermal');
    expect(phaseAt(450)).toBe('glide');
    expect(phaseAt(1100)).toBe('ridge');
    expect(phaseAt(1500)).toBe('wave');
    expect(phaseAt(2699)).toBe('final');
    expect(phaseAt(FLIGHT_CYCLE + 10)).toBe('thermal');
  });
});

describe('legs', () => {
  it('climb at a chosen airspeed in the thermal, along the ridge and in the wave', () => {
    expect(legAt(200)).toMatchObject({ kind: 'climb', airspeed: 90 });
    expect(legAt(1100)).toMatchObject({ kind: 'climb', airspeed: 90 });
    expect(legAt(1500)).toMatchObject({ kind: 'climb', airspeed: 95 });
  });

  it('glide through still air to the ridge and home, and through the sinking wave', () => {
    expect(legAt(700)).toMatchObject({ kind: 'glide', air: 0 });
    expect(legAt(1800)).toMatchObject({ kind: 'glide', air: -2.5 });
    expect(legAt(2300)).toMatchObject({ kind: 'glide', air: 0 });
  });
});

describe('heightAt', () => {
  it('is linear between keyframes away from the transitions', () => {
    expect(heightAt(225)).toBeCloseTo(1000, 6);
    expect(heightAt(720)).toBeCloseTo(1325, 6);
    expect(heightAt(1110)).toBeCloseTo(1275, 6);
    expect(heightAt(1470)).toBeCloseTo(1950, 6);
    expect(heightAt(2325)).toBeCloseTo(1030, 6);
  });

  it.each(KEYFRAMES)('rounds the corner at $time s close to $height m', ({ time, height }) => {
    expect(Math.abs(heightAt(time) - height)).toBeLessThan(CORNER_TOLERANCE_METRES);
  });

  it('wraps around the loop without a step', () => {
    expect(heightAt(FLIGHT_CYCLE - 0.01)).toBeCloseTo(heightAt(0), 1);
  });
});

describe('climbAt', () => {
  it('matches the slope of each leg', () => {
    expect(climbAt(225)).toBeCloseTo(2.22, 2);
    expect(climbAt(720)).toBeCloseTo(-0.65, 2);
    expect(climbAt(1110)).toBeCloseTo(1.04, 2);
    expect(climbAt(1470)).toBeCloseTo(2.29, 2);
    expect(climbAt(1830)).toBeCloseTo(-3.92, 2);
    expect(climbAt(2325)).toBeCloseTo(-1.41, 2);
  });

  it('eases from one leg to the next over about 30 s', () => {
    expect(climbAt(450)).toBeCloseTo((2.22 - 0.65) / 2, 1);
    expect(climbAt(430)).toBeCloseTo(2.22, 2);
    expect(climbAt(470)).toBeCloseTo(-0.65, 2);
  });
});
