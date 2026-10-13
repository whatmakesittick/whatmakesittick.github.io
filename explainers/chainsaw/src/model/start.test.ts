import { describe, expect, it } from 'vitest';
import { START_STEP_IDS } from '../ids';
import { SPARK_DEG, wrapDegrees } from './cycle';
import { STARTER_GEOMETRY } from './scale';
import {
  PULL_ROPE_SHARE,
  READY_POSE,
  START_SHOW_SECONDS,
  START_STEP_SECONDS,
  magnetAngle,
  pulleyDegrees,
  startPose,
  startStepAt,
} from './start';

const SAMPLE_STEP = 0.01;

function samples(): number[] {
  const count = Math.floor(START_SHOW_SECONDS / SAMPLE_STEP);
  return Array.from({ length: count }, (_, index) => index * SAMPLE_STEP);
}

describe('start sequence', () => {
  it('plays the cold start steps in order', () => {
    const seen = [...new Set(samples().map((seconds) => startPose(seconds).step))];
    expect(seen).toEqual([...START_STEP_IDS]);
    expect(START_SHOW_SECONDS).toBeCloseTo(11.4, 9);
    expect(startStepAt(START_STEP_SECONDS.brake)).toBe('choke');
  });

  it('rests before it starts and after it ends', () => {
    expect(startPose(-0.1)).toEqual(READY_POSE);
    expect(startPose(START_SHOW_SECONDS)).toEqual(READY_POSE);
  });

  it('never runs the engine on full choke', () => {
    samples().forEach((seconds) => {
      const pose = startPose(seconds);
      if (pose.engine === 'fastIdle' || pose.engine === 'running') {
        expect(pose.chokeLever).toBe(0);
      }
    });
  });

  it('puts the chain brake on before anything else and keeps it on', () => {
    samples()
      .filter((seconds) => seconds >= START_STEP_SECONDS.brake)
      .forEach((seconds) => expect(startPose(seconds).guardForward).toBe(1));
  });

  it('never pulls the rope to its full length', () => {
    expect(PULL_ROPE_SHARE).toBeLessThan(1);
    samples().forEach((seconds) => {
      expect(startPose(seconds).ropeOut).toBeLessThanOrEqual(PULL_ROPE_SHARE + 1e-9);
    });
  });

  it('turns the crank forward only, and with the pulley while the pawls grip', () => {
    let last = 0;
    samples().forEach((seconds) => {
      const pose = startPose(seconds);
      expect(pose.crankDeg).toBeGreaterThanOrEqual(last - 1e-9);
      last = pose.crankDeg;
      if (pose.step === 'firstPull') expect(pose.crankDeg).toBeCloseTo(pose.pulleyDeg, 6);
    });
  });

  it('turns the pulley by the rope over its rim', () => {
    const circumference = 2 * Math.PI * STARTER_GEOMETRY.pulley.radius;
    expect(pulleyDegrees(circumference)).toBeCloseTo(360, 9);
  });

  it('closes the decompression valve when the engine first fires', () => {
    const popStart = samples().find((seconds) => startPose(seconds).step === 'pop') ?? 0;
    expect(startPose(popStart - SAMPLE_STEP).decompressionIn).toBe(true);
    expect(startPose(popStart).decompressionIn).toBe(false);
  });

  it('fires once at the pop, stops, then catches on the second pull', () => {
    const engines = samples()
      .map((seconds) => startPose(seconds).engine)
      .filter((engine, index, all) => index === 0 || engine !== all[index - 1]);
    expect(engines).toEqual(['stopped', 'cranking', 'stopped', 'cranking', 'fastIdle', 'running']);
    samples().forEach((seconds) => {
      const pose = startPose(seconds);
      if (pose.burn) expect(['pop', 'fastIdle', 'idle']).toContain(pose.step);
    });
  });

  it('presses the primer six times', () => {
    const peaks = samples().filter((seconds) => {
      const now = startPose(seconds).primerSqueeze;
      return (
        now > startPose(seconds - SAMPLE_STEP).primerSqueeze &&
        now >= startPose(seconds + SAMPLE_STEP).primerSqueeze
      );
    });
    expect(peaks).toHaveLength(6);
  });
});

describe('magnet', () => {
  it('passes the ignition coil exactly at the spark', () => {
    expect(wrapDegrees(magnetAngle(SPARK_DEG))).toBeCloseTo(STARTER_GEOMETRY.coilAngleDeg, 9);
  });
});
