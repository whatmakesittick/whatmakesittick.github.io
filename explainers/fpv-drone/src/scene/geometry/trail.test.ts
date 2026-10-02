import { describe, expect, it } from 'vitest';
import { TrailSamples } from './trail';
import type { TrailSample } from './trail';

const STEP = 0.25;
const CAPACITY = 64;
const MAX_GAP = 8;

function at(x: number): TrailSample {
  return { point: [x, 10, 0], heading: 0 };
}

describe('trail samples', () => {
  it('keeps one slot per step and runs back over the filled slots', () => {
    const trail = new TrailSamples(STEP, CAPACITY, MAX_GAP);
    for (let phase = 0; phase <= 2; phase += 1 / 60) trail.record(phase, at(phase));
    const run = trail.run(2);
    expect(run.to).toBe(8);
    expect(run.from).toBe(0);
    const fourth = trail.sampleAt(4)?.point[0] ?? 0;
    expect(fourth).toBeGreaterThanOrEqual(1);
    expect(fourth).toBeLessThan(1.25);
  });

  it('fills the slots a normal tick skips by interpolation', () => {
    const trail = new TrailSamples(STEP, CAPACITY, MAX_GAP);
    trail.record(0, at(0));
    trail.record(1, at(4));
    expect(trail.sampleAt(2)?.point[0]).toBeCloseTo(2);
    expect(trail.run(1)).toEqual({ from: 0, to: 4 });
  });

  it('starts a fresh run after a jump that is too long to bridge', () => {
    const trail = new TrailSamples(STEP, CAPACITY, MAX_GAP);
    trail.record(0, at(0));
    trail.record(10, at(100));
    expect(trail.sampleAt(20)).toBeNull();
    expect(trail.run(10)).toEqual({ from: 40, to: 40 });
  });

  it('keeps earlier samples when the phase scrubs back', () => {
    const trail = new TrailSamples(STEP, CAPACITY, MAX_GAP);
    for (let phase = 0; phase <= 3; phase += 0.1) trail.record(phase, at(phase));
    trail.record(1.5, at(1.5));
    expect(trail.run(1.5)).toEqual({ from: 0, to: 6 });
  });

  it('clamps the slot to the capacity', () => {
    const trail = new TrailSamples(STEP, CAPACITY, MAX_GAP);
    expect(trail.slotOf(1000)).toBe(CAPACITY - 1);
    expect(trail.slotOf(-1)).toBe(0);
  });
});
