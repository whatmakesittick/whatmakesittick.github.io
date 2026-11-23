import { describe, expect, it } from 'vitest';
import { decodeFigure } from './figure';
import type { Figure } from './figure';
import { Retargeter } from './retarget';
import { TargetReader, loadSwimSamples } from './retarget.testkit';
import { TEST_BODIES } from './bodies.testkit';

const MM = 1000;
const STRIDE = 12;
const AXES = 3;
const JOINT_TOLERANCE_MM = 10;
const SPEED_MS = 8;
const RUNS = 40;
const BATCHES = 5;
const WARM_UP = 20;
const REST_TOLERANCE_RAD = 0.005;
const FINGER = /thumb|index|middle|ring|pinky/;

function joint(figure: Figure, name: string): number[] {
  const at = figure.jointIndex(name) * AXES;
  return Array.from(figure.jointPositions.slice(at, at + AXES));
}

function distanceMm(a: number[], b: number[]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) * MM;
}

const bodies = await Promise.all(
  TEST_BODIES.map(async (body) => ({ ...body, figure: decodeFigure(await body.loadData()) })),
);

describe.each(bodies)('retarget on the $name body', (body) => {
  const { figure } = body;
  const samples = loadSwimSamples(figure, body.samples);
  const reader = new TargetReader(figure);
  const retargeter = new Retargeter(figure);

  it('lands the legs and the hands on joints it was given', () => {
    const names = ['r_lowleg', 'r_foot', 'l_lowleg', 'l_foot', 'r_wrist', 'l_wrist'];
    let worst = 0;
    samples.forEach((parameters, i) => {
      if (i % STRIDE) return;
      const target = reader.read(parameters);
      figure.solveSkeleton(parameters);
      const expected = names.map((name) => joint(figure, name));
      figure.solveSkeleton(retargeter.solve(target));
      names.forEach(
        (name, k) => (worst = Math.max(worst, distanceMm(joint(figure, name), expected[k]))),
      );
    });
    expect(worst).toBeLessThan(JOINT_TOLERANCE_MM);
  });

  it('leaves the rest pose alone apart from the relaxed fingers', () => {
    const solved = retargeter.solve(reader.read(figure.createParameters()));
    const moved = figure.parameterNames.filter(
      (name, index) => !FINGER.test(name) && Math.abs(solved[index]) > REST_TOLERANCE_RAD,
    );
    expect(moved).toEqual([]);
  });

  it('is a pure function of its input', () => {
    const first = reader.read(samples[100]);
    const second = reader.read(samples[700]);
    const a = retargeter.solve(first).slice();
    retargeter.solve(second);
    const b = retargeter.solve(first).slice();
    expect(Array.from(b)).toEqual(Array.from(a));
  });

  it('solves and poses within the frame budget', () => {
    const target = reader.read(samples[300]);
    const run = () => figure.pose(retargeter.solve(target));
    for (let i = 0; i < WARM_UP; i++) run();
    const batches = Array.from({ length: BATCHES }, () => {
      const start = performance.now();
      for (let i = 0; i < RUNS; i++) run();
      return (performance.now() - start) / RUNS;
    });
    expect(Math.min(...batches)).toBeLessThan(SPEED_MS);
  });
});
