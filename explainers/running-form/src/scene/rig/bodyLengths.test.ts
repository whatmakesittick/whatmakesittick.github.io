import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { decodeFigure } from '@core/figure';
import { FIGURE_FROM_RUNNER } from '../parts/runner/figure/frame';
import { REST_FOOT, REST_JOINTS, REST_SOLE_Y, RIG_BODY } from './body';

const { athleteData } = await import('../parts/runner/figure/runner.data');
const figure = decodeFigure(athleteData);
const toRunner = FIGURE_FROM_RUNNER.clone().invert();
const TOLERANCE_M = 0.001;
const AXIS_TOLERANCE = 0.002;
const AXES = 3;
const MATRIX = 9;

const JOINT_NAMES: Readonly<Record<keyof typeof REST_JOINTS, string>> = {
  hip: 'r_upleg',
  knee: 'r_lowleg',
  ankle: 'r_foot',
  ball: 'r_ball',
  shoulder: 'r_uparm',
  elbow: 'r_lowarm',
  wrist: 'r_wrist',
  hand: 'r_middle_null',
  neck: 'c_neck',
  head: 'c_head',
  headTop: 'c_head_null',
};

function joint(name: string): Vector3 {
  return new Vector3()
    .fromArray(figure.jointPositions, figure.jointIndex(name) * AXES)
    .applyMatrix4(toRunner);
}

function ballAxis(column: number): Vector3 {
  const at = figure.jointIndex('r_ball') * MATRIX;
  const m = figure.jointMatrices;
  return new Vector3(m[at + column], m[at + 3 + column], m[at + 6 + column]).transformDirection(
    toRunner,
  );
}

function footVertices(): Vector3[] {
  const points: Vector3[] = [];
  const ankle = joint('r_foot');
  for (let v = 0; v < figure.vertexCount; v++) {
    const point = new Vector3().fromArray(figure.positions, v * AXES).applyMatrix4(toRunner);
    if (point.z > 0 && point.y < ankle.y + 0.05) points.push(point);
  }
  return points;
}

describe('rig body against the exported runner', () => {
  it('places every rest joint of the rig on the MHR joint', () => {
    figure.solveSkeleton(figure.createParameters());
    Object.entries(JOINT_NAMES).forEach(([key, name]) => {
      const rest = new Vector3(...REST_JOINTS[key as keyof typeof REST_JOINTS]);
      expect(rest.distanceTo(joint(name))).toBeLessThan(TOLERANCE_M);
    });
  });

  it('matches the foot landmarks and the toe joint axes', () => {
    figure.pose(figure.createParameters());
    const foot = footVertices();
    const lowest = Math.min(...foot.map((p) => p.y));
    const back = foot.reduce((best, p) => (p.x < best.x ? p : best));
    const tip = foot.reduce((best, p) => (p.x > best.x ? p : best));
    expect(Math.abs(lowest - REST_SOLE_Y)).toBeLessThan(TOLERANCE_M);
    expect(back.distanceTo(new Vector3(...REST_FOOT.heelBack))).toBeLessThan(TOLERANCE_M);
    expect(tip.distanceTo(new Vector3(...REST_FOOT.toeTip))).toBeLessThan(TOLERANCE_M);
    expect(ballAxis(0).distanceTo(new Vector3(...REST_FOOT.toeAxis))).toBeLessThan(AXIS_TOLERANCE);
    expect(
      ballAxis(2)
        .negate()
        .distanceTo(new Vector3(...REST_FOOT.toeBendAxis)),
    ).toBeLessThan(AXIS_TOLERANCE);
  });

  it('reports the segment lengths of the runner', () => {
    const lengths = {
      thigh: RIG_BODY.thighM,
      shank: RIG_BODY.shankM,
      hipWidth: RIG_BODY.hipHalfWidthM * 2,
      trunk: RIG_BODY.trunkM,
      upperArm: RIG_BODY.upperArmM,
      forearm: RIG_BODY.forearmM,
    };
    expect(lengths.thigh).toBeCloseTo(joint('r_upleg').distanceTo(joint('r_lowleg')), 3);
    expect(lengths.shank).toBeCloseTo(joint('r_lowleg').distanceTo(joint('r_foot')), 3);
    expect(lengths.hipWidth).toBeCloseTo(joint('r_upleg').distanceTo(joint('l_upleg')), 3);
    expect(lengths.upperArm).toBeCloseTo(joint('r_uparm').distanceTo(joint('r_lowarm')), 3);
    expect(lengths.forearm).toBeCloseTo(joint('r_lowarm').distanceTo(joint('r_wrist')), 3);
  });
});
