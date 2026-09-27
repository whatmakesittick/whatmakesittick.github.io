import { toDegrees } from '@core/math';
import { describe, expect, it } from 'vitest';
import { flightState } from './air';
import {
  FIELD,
  RIDGE_CREST_X,
  THERMAL_CIRCLE,
  WAVE_HOLD_X,
  bankAt,
  circleSeconds,
  pitchFor,
  poseAt,
  thermalAxisX,
} from './route';
import { FLIGHT_CYCLE, heightAt } from './story';

const SAMPLE_SECONDS = 0.5;
const SPEED_ALLOWANCE = 1.1;
const CIRCLE_SPEED = (2 * Math.PI * THERMAL_CIRCLE.radius) / circleSeconds();
const MAX_SAMPLE_TRAVEL = CIRCLE_SPEED * SAMPLE_SECONDS * SPEED_ALLOWANCE;
const UPWIND = -1;

function bankDegrees(phase: number): number {
  return toDegrees(bankAt(phase, flightState(phase, 'racer18').airspeed));
}

function distance(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

describe('poseAt', () => {
  it('moves without jumps through the whole loop', () => {
    for (let time = 0; time < FLIGHT_CYCLE; time += SAMPLE_SECONDS) {
      expect(distance(poseAt(time), poseAt(time + SAMPLE_SECONDS))).toBeLessThan(MAX_SAMPLE_TRAVEL);
    }
  });

  it('circles the thermal over the field', () => {
    const pose = poseAt(225);
    const center = { x: thermalAxisX(heightAt(225)), z: FIELD.z };
    expect(distance(pose, center)).toBeCloseTo(THERMAL_CIRCLE.radius, 6);
  });

  it('glides downwind toward the ridge', () => {
    expect(poseAt(720).heading).toBeCloseTo(0, 6);
    expect(poseAt(720).x).toBeGreaterThan(poseAt(600).x);
  });

  it('beats along the windward face without crossing the crest', () => {
    for (let time = 990; time < 1225; time += SAMPLE_SECONDS) {
      expect(poseAt(time).x).toBeLessThan(RIDGE_CREST_X);
    }
  });

  it('faces the wind and holds position in the wave', () => {
    expect(poseAt(1500).x).toBeCloseTo(WAVE_HOLD_X, 6);
    expect(Math.cos(poseAt(1500).heading)).toBeCloseTo(UPWIND, 6);
    expect(distance(poseAt(1400), poseAt(1700))).toBe(0);
  });

  it('flies home upwind to the field', () => {
    expect(Math.cos(poseAt(2300).heading)).toBeCloseTo(UPWIND, 6);
    expect(distance(poseAt(FLIGHT_CYCLE - 0.01), poseAt(0))).toBeLessThan(0.01);
  });
});

describe('bankAt', () => {
  it('banks about 45° while circling the thermal', () => {
    expect(Math.abs(bankDegrees(225))).toBeCloseTo(45, 0);
  });

  it('flies wings level on the glides and in the wave', () => {
    expect(bankDegrees(720)).toBeCloseTo(0, 6);
    expect(bankDegrees(1500)).toBeCloseTo(0, 6);
    expect(bankDegrees(2300)).toBeCloseTo(0, 6);
  });

  it('banks about 45° when it turns at the end of a ridge beat', () => {
    let steepest = 0;
    for (let time = 990; time < 1230; time += 1) {
      steepest = Math.max(steepest, Math.abs(bankDegrees(time)));
    }
    expect(steepest).toBeGreaterThan(40);
    expect(steepest).toBeLessThan(50);
  });
});

describe('circleSeconds', () => {
  it('takes about 16 s for one circle', () => {
    expect(circleSeconds()).toBeCloseTo(16, 0);
  });
});

describe('pitchFor', () => {
  it('lowers the nose as the glider flies faster', () => {
    expect(pitchFor(90)).toBeCloseTo(0, 9);
    expect(pitchFor(200)).toBeLessThan(pitchFor(130));
    expect(toDegrees(pitchFor(200))).toBeCloseTo(-6, 6);
  });
});
