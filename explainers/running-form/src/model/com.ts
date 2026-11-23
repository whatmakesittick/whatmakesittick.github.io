import type { ComReading, PaceId } from '../ids';
import { GRAVITY_MS2 } from './body';
import { FORCE_SAMPLES, totalForceSamples } from './forces';
import { strideTimeS } from './paces';
import { CYCLE_UNITS } from './playback';

interface ComCurves {
  height: readonly number[];
  surge: readonly number[];
  speedDelta: readonly number[];
}

const UNITS_PER_SAMPLE = CYCLE_UNITS / FORCE_SAMPLES;
const CATMULL_TENSION = 0.5;

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function withoutMean(values: readonly number[]): number[] {
  const offset = mean(values);
  return values.map((value) => value - offset);
}

function integrate(values: readonly number[], dt: number): number[] {
  const out = [0];
  for (let i = 1; i < values.length; i += 1) {
    out.push(out[i - 1] + 0.5 * (values[i] + values[i - 1]) * dt);
  }
  return out;
}

function doubleIntegral(acceleration: readonly number[], dt: number): [number[], number[]] {
  const velocity = withoutMean(integrate(withoutMean(acceleration), dt));
  const position = withoutMean(integrate(velocity, dt));
  return [velocity, position];
}

const cache = new Map<string, ComCurves>();

function curvesFor(pace: PaceId, stepRate: number): ComCurves {
  const key = `${pace}|${stepRate}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const dt = strideTimeS(pace, stepRate) / FORCE_SAMPLES;
  const forces = totalForceSamples(pace, stepRate, false);
  const [, height] = doubleIntegral(
    forces.map((force) => (force.vertBW - 1) * GRAVITY_MS2),
    dt,
  );
  const [speedDelta, surge] = doubleIntegral(
    forces.map((force) => force.fwdBW * GRAVITY_MS2),
    dt,
  );
  const curves = { height, surge, speedDelta };
  cache.set(key, curves);
  return curves;
}

function catmullAt(values: readonly number[], units: number): number {
  const position = units / UNITS_PER_SAMPLE;
  const base = Math.floor(position);
  const share = position - base;
  const at = (offset: number): number =>
    values[(((base + offset) % FORCE_SAMPLES) + FORCE_SAMPLES) % FORCE_SAMPLES];
  const [before, from, to, after] = [at(-1), at(0), at(1), at(2)];
  const slopeFrom = CATMULL_TENSION * (to - before);
  const slopeTo = CATMULL_TENSION * (after - from);
  const squared = share * share;
  const cubed = squared * share;
  return (
    (2 * cubed - 3 * squared + 1) * from +
    (cubed - 2 * squared + share) * slopeFrom +
    (-2 * cubed + 3 * squared) * to +
    (cubed - squared) * slopeTo
  );
}

function range(values: readonly number[]): number {
  return Math.max(...values) - Math.min(...values);
}

export function comAt(units: number, pace: PaceId, stepRate: number): ComReading {
  const curves = curvesFor(pace, stepRate);
  return {
    heightM: catmullAt(curves.height, units),
    surgeM: catmullAt(curves.surge, units),
    speedDeltaMs: catmullAt(curves.speedDelta, units),
    risePeakToPeakM: range(curves.height),
    surgePeakToPeakM: range(curves.surge),
    speedSwingMs: range(curves.speedDelta),
  };
}
