import { describe, expect, it } from 'vitest';
import { PHASE_RANGES } from './cycle';
import { stitchProfile } from './fabric';
import { BOBBIN_CASE, HOOK } from './hook';
import { LOOP_PEAK_LENGTH, createLoopPoints, loopLength, writeLoopPoints } from './loop';
import type { Point3 } from './loop';

const STEP = 0.5;
const FAR_SIDE = HOOK.catchAngle + 90;
const CATCH_LOOP = { min: 1, max: 2.5 } as const;

function anglesBetween(start: number, end: number): number[] {
  return Array.from(
    { length: Math.round((end - start) / STEP) },
    (_, index) => start + index * STEP,
  );
}

function loopAt(angle: number): Point3[] {
  const points = createLoopPoints();
  writeLoopPoints(angle, 'balanced', points);
  return points;
}

function radiusFromHookAxis(point: Point3): number {
  return Math.hypot(point.x, point.z - HOOK.axisOffset);
}

describe('loopLength', () => {
  it('is zero while the fabric feeds and the needle pierces it', () => {
    anglesBetween(0, PHASE_RANGES.loop.start).forEach((angle) =>
      expect(loopLength(angle, 'balanced')).toBe(0),
    );
  });

  it('starts from nothing as the needle turns back up', () => {
    expect(loopLength(PHASE_RANGES.loop.start, 'balanced')).toBeCloseTo(0, 1);
  });

  it('bulges by a millimetre or two by the time the hook catches it', () => {
    const atCatch = loopLength(HOOK.catchAngle, 'balanced');
    expect(atCatch).toBeGreaterThan(CATCH_LOOP.min);
    expect(atCatch).toBeLessThan(CATCH_LOOP.max);
  });

  it('keeps growing from the bulge until the hook reaches the far side', () => {
    const lengths = anglesBetween(PHASE_RANGES.loop.start, FAR_SIDE).map((angle) =>
      loopLength(angle, 'balanced'),
    );
    lengths
      .slice(1)
      .forEach((length, index) => expect(length).toBeGreaterThanOrEqual(lengths[index] - 1e-9));
  });

  it('is at its longest while the hook holds it around the bobbin case', () => {
    const peak = loopLength(FAR_SIDE, 'balanced');
    expect(peak).toBeCloseTo(LOOP_PEAK_LENGTH, 1);
    expect(loopLength(PHASE_RANGES.wrap.end, 'balanced')).toBeCloseTo(peak, 1);
  });

  it('only shrinks while the take-up lever pulls the loop up', () => {
    const lengths = anglesBetween(PHASE_RANGES.set.start, PHASE_RANGES.set.end).map((angle) =>
      loopLength(angle, 'balanced'),
    );
    lengths
      .slice(1)
      .forEach((length, index) => expect(length).toBeLessThanOrEqual(lengths[index] + 1e-9));
  });

  it('is back to zero by the end of the set phase', () => {
    expect(loopLength(PHASE_RANGES.set.end - 1e-6, 'tight')).toBeCloseTo(0, 1);
    expect(loopLength(PHASE_RANGES.set.end, 'tight')).toBe(0);
  });
});

describe('loop shape', () => {
  it('bulges out behind the needle so the hook point passes inside it at the catch', () => {
    const widest = Math.max(...loopAt(HOOK.catchAngle).map(radiusFromHookAxis));
    expect(widest).toBeGreaterThan(HOOK.pointRadius);
  });

  it('spreads over and under the bobbin case on the far side', () => {
    const points = loopAt(FAR_SIDE);
    const farthest = Math.max(...points.map((point) => point.z));
    expect(farthest).toBeGreaterThan(HOOK.axisOffset + BOBBIN_CASE.radius);
    expect(Math.max(...points.map((point) => point.y))).toBeGreaterThan(BOBBIN_CASE.top);
    expect(Math.min(...points.map((point) => point.y))).toBeLessThan(BOBBIN_CASE.bottom);
  });

  it('comes back round to the needle side before it is pulled up', () => {
    const points = loopAt(
      PHASE_RANGES.set.start + (PHASE_RANGES.set.end - PHASE_RANGES.set.start) / 2,
    );
    points.forEach((point) => expect(point.z).toBeLessThan(HOOK.axisOffset - BOBBIN_CASE.radius));
  });

  it('pulls the loop into the knot by the end of the stitch', () => {
    const points = loopAt(PHASE_RANGES.set.end - 1e-6);
    const { topDip } = stitchProfile('balanced');
    expect(Math.min(...points.map((point) => point.y))).toBeCloseTo(topDip, 3);
    points.forEach((point) => expect(Math.abs(point.z)).toBeLessThan(1));
  });
});
