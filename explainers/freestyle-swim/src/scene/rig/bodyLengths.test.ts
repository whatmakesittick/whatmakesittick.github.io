import { describe, expect, it } from 'vitest';
import { decodeFigure } from '@core/figure';
import { SEGMENT_M } from '../../model/scale';
import { BODY } from './constants';

const { athleteData } = await import('../parts/swimmer/figure/athlete.data');
const figure = decodeFigure(athleteData);
const TOLERANCE_M = 0.002;
const AXES = 3;

function joint(name: string): number[] {
  const at = figure.jointIndex(name) * AXES;
  return Array.from(figure.jointPositions.slice(at, at + AXES));
}

function distance(a: number[], b: number[]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function mean(a: number[], b: number[]): number[] {
  return a.map((value, i) => (value + b[i]) / 2);
}

function toeTip(): number[] {
  const { restPositions: p, vertexCount } = figure;
  let best = 0;
  for (let i = 0; i < vertexCount; i++) {
    if (p[i * AXES] < 0 && p[i * AXES + 1] < 0.2 && p[i * AXES + 2] > p[best * AXES + 2]) best = i;
  }
  return Array.from(p.slice(best * AXES, best * AXES + AXES));
}

function near(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThan(TOLERANCE_M);
}

describe('rig lengths against the MHR body', () => {
  it('matches the limb segments', () => {
    near(BODY.upperArm, distance(joint('r_uparm'), joint('r_lowarm')));
    near(BODY.forearm, distance(joint('r_lowarm'), joint('r_wrist')));
    near(BODY.hand, distance(joint('r_wrist'), joint('r_middle_null')));
    near(BODY.thigh, distance(joint('r_upleg'), joint('r_lowleg')));
    near(BODY.shank, distance(joint('r_lowleg'), joint('r_foot')));
    near(BODY.foot, distance(joint('r_foot'), toeTip()));
  });

  it('matches the trunk, the spacings and the neck offsets', () => {
    const shoulders = mean(joint('r_uparm'), joint('l_uparm'));
    const hips = mean(joint('r_upleg'), joint('l_upleg'));
    const neck = joint('c_neck');
    near(-BODY.hipX, shoulders[1] - hips[1]);
    near(BODY.hipY, shoulders[2] - hips[2]);
    near(SEGMENT_M.shoulderSpacing, distance(joint('r_uparm'), joint('l_uparm')));
    near(BODY.hipHalf * 2, distance(joint('r_upleg'), joint('l_upleg')));
    near(BODY.neckBase[0], neck[1] - shoulders[1]);
    near(BODY.neckBase[1], shoulders[2] - neck[2]);
    near(BODY.neckLength, distance(neck, joint('c_head')));
  });
});
