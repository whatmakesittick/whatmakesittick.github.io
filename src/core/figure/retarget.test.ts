import { describe, expect, it } from 'vitest';
import { decodeFigure } from './figure';
import { Retargeter } from './retarget';
import { TargetReader, loadSwimSamples } from './retarget.testkit';

const { athleteData } =
  await import('../../../explainers/freestyle-swim/src/scene/parts/swimmer/figure/athlete.data');
const figure = decodeFigure(athleteData);
const samples = loadSwimSamples(figure);
const reader = new TargetReader(figure);
const retargeter = new Retargeter(figure);
const MM = 1000;
const STRIDE = 12;
const AXES = 3;
const JOINT_TOLERANCE_MM = 10;
const SPEED_MS = 4;
const RUNS = 200;
const WARM_UP = 20;

function joint(name: string): number[] {
  const at = figure.jointIndex(name) * AXES;
  return Array.from(figure.jointPositions.slice(at, at + AXES));
}

function distanceMm(a: number[], b: number[]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) * MM;
}

describe('retarget', () => {
  it('lands the legs and the hands on joints it was given', () => {
    const names = ['r_lowleg', 'r_foot', 'l_lowleg', 'l_foot', 'r_wrist', 'l_wrist'];
    let worst = 0;
    samples.forEach((parameters, i) => {
      if (i % STRIDE) return;
      const target = reader.read(parameters);
      figure.solveSkeleton(parameters);
      const expected = names.map(joint);
      figure.solveSkeleton(retargeter.solve(target));
      names.forEach((name, k) => (worst = Math.max(worst, distanceMm(joint(name), expected[k]))));
    });
    expect(worst).toBeLessThan(JOINT_TOLERANCE_MM);
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
    const start = performance.now();
    for (let i = 0; i < RUNS; i++) run();
    expect((performance.now() - start) / RUNS).toBeLessThan(SPEED_MS);
  });
});
