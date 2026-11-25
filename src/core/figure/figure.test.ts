import { beforeAll, describe, expect, it } from 'vitest';
import { decodeFigure } from './figure';
import type { Figure } from './figure';
import { loadGroundTruth } from './groundTruth.testkit';
import type { GroundTruthPose } from './groundTruth.testkit';
import { loadStrokeTruth } from './strokeTruth.testkit';
import { TEST_BODIES } from './bodies.testkit';

const AXES = 3;
const QUATERNION = 4;
const MM = 1000;
const OFF_VERTEX_MM = 0.05;
const OFF_JOINT_MM = 0.05;
const STROKE_WORST_MM = 2;
const STROKE_MEAN_MM = 0.3;
const ROTATION_TOLERANCE_DEG = 0.01;
const DECODE_LOOSE_MS = 300;
const POSE_LOOSE_MS = 15;
const POSE_REPEATS = 200;
const WARM_UP = 20;

const bodies = await Promise.all(
  TEST_BODIES.map(async (body) => {
    const data = await body.loadData();
    return {
      ...body,
      data,
      truth: body.groundTruth ? loadGroundTruth(body.groundTruth) : undefined,
      strokeTruth: loadStrokeTruth(body.strokeTruth),
    };
  }),
);

function parametersOf(
  figure: Figure,
  pose: { readonly parameters: Readonly<Record<string, number>> },
): Float32Array {
  const parameters = figure.createParameters();
  for (const [name, value] of Object.entries(pose.parameters)) {
    const index = figure.parameterIndex(name);
    expect(index, name).toBeGreaterThanOrEqual(0);
    parameters[index] = value;
  }
  return parameters;
}

function vertexErrorsMm(figure: Figure, expected: Float32Array, vertexIds: Uint16Array): number[] {
  return Array.from(vertexIds, (id, i) => {
    const dx = figure.positions[id * AXES] - expected[i * AXES];
    const dy = figure.positions[id * AXES + 1] - expected[i * AXES + 1];
    const dz = figure.positions[id * AXES + 2] - expected[i * AXES + 2];
    return Math.hypot(dx, dy, dz) * MM;
  });
}

function jointErrorsMm(figure: Figure, pose: GroundTruthPose): number[] {
  return Array.from(
    { length: figure.jointCount },
    (_, j) =>
      Math.hypot(
        figure.jointPositions[j * AXES] - pose.jointPositions[j * AXES],
        figure.jointPositions[j * AXES + 1] - pose.jointPositions[j * AXES + 1],
        figure.jointPositions[j * AXES + 2] - pose.jointPositions[j * AXES + 2],
      ) * MM,
  );
}

function relativeAngleDeg(a: Float32Array, b: Float32Array, at: number): number {
  const [ax, ay, az, aw] = [a[at], a[at + 1], a[at + 2], a[at + 3]];
  const [bx, by, bz, bw] = [b[at], b[at + 1], b[at + 2], b[at + 3]];
  const x = aw * bx - bw * ax - (ay * bz - az * by);
  const y = aw * by - bw * ay - (az * bx - ax * bz);
  const z = aw * bz - bw * az - (ax * by - ay * bx);
  const norm = Math.hypot(ax, ay, az, aw) * Math.hypot(bx, by, bz, bw);
  return (2 * Math.asin(Math.min(1, Math.hypot(x, y, z) / norm)) * 180) / Math.PI;
}

function rotationErrorsDeg(figure: Figure, pose: GroundTruthPose): number[] {
  return Array.from({ length: figure.jointCount }, (_, j) =>
    relativeAngleDeg(figure.jointRotations, pose.jointRotations, j * QUATERNION),
  );
}

function enclosedVolume(figure: Figure): number {
  const p = figure.positions;
  let volume = 0;
  for (let t = 0; t < figure.indices.length; t += AXES) {
    const [a, b, c] = [
      figure.indices[t] * AXES,
      figure.indices[t + 1] * AXES,
      figure.indices[t + 2] * AXES,
    ];
    volume +=
      p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) -
      p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) +
      p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c]);
  }
  return volume / 6;
}

describe.each(bodies)('figure against the MHR reference: $name', (body) => {
  const { data, strokeTruth } = body;
  const truth = body.truth;
  const posePrototype = strokeTruth.poses[0];
  let figure: Figure;

  beforeAll(() => {
    figure = decodeFigure(data);
  });

  it('has the expected size', () => {
    expect(figure.vertexCount).toBe(body.vertexCount);
    expect(data.vertexCount).toBe(body.vertexCount);
    expect(figure.positions).toHaveLength(body.vertexCount * AXES);
  });

  it('decodes deterministically', () => {
    const again = decodeFigure(data);
    expect(again.restPositions).toEqual(figure.restPositions);
    expect(again.indices).toEqual(figure.indices);
    const parameters = parametersOf(figure, posePrototype);
    figure.pose(parameters);
    again.pose(parameters);
    expect(again.positions).toEqual(figure.positions);
  });

  if (truth) {
    it('matches vertices, joints and rotations with correctives off', () => {
      for (const pose of truth.poses) {
        figure.pose(parametersOf(figure, pose), false);
        expect(
          Math.max(...vertexErrorsMm(figure, pose.correctivesOff, truth.vertexIds)),
        ).toBeLessThan(OFF_VERTEX_MM);
        expect(Math.max(...jointErrorsMm(figure, pose))).toBeLessThan(OFF_JOINT_MM);
        expect(Math.max(...rotationErrorsDeg(figure, pose))).toBeLessThan(ROTATION_TOLERANCE_DEG);
      }
    });
  }

  it('matches the full model on the stroke poses with and without correctives', () => {
    const ids = strokeTruth.vertexIds;
    const offErrors: number[] = [];
    const onErrors: number[] = [];
    for (const pose of strokeTruth.poses) {
      const parameters = parametersOf(figure, pose);
      figure.pose(parameters, false);
      offErrors.push(...vertexErrorsMm(figure, pose.correctivesOff, ids));
      figure.pose(parameters);
      onErrors.push(...vertexErrorsMm(figure, pose.correctivesOn, ids));
    }
    const mean = onErrors.reduce((sum, e) => sum + e, 0) / onErrors.length;
    console.info(
      `stroke poses, correctives on: worst ${Math.max(...onErrors).toFixed(3)} mm, mean ${mean.toFixed(4)} mm`,
    );
    expect(Math.max(...offErrors)).toBeLessThan(OFF_VERTEX_MM);
    expect(Math.max(...onErrors)).toBeLessThan(STROKE_WORST_MM);
    expect(mean).toBeLessThan(STROKE_MEAN_MM);
  });

  it('produces unit normals on outward facing triangles', () => {
    figure.pose(parametersOf(figure, posePrototype));
    for (let v = 0; v < figure.vertexCount; v++)
      expect(
        Math.hypot(
          figure.normals[v * AXES],
          figure.normals[v * AXES + 1],
          figure.normals[v * AXES + 2],
        ),
      ).toBeCloseTo(1, 4);
    expect(enclosedVolume(figure)).toBeGreaterThan(0);
  });
});

describe.each(bodies)('figure timing: $name', (body) => {
  it('decodes and poses within a loose budget', () => {
    const started = performance.now();
    const figure = decodeFigure(body.data);
    const decodeMs = performance.now() - started;
    const parameters = parametersOf(figure, body.strokeTruth.poses[0]);
    for (let i = 0; i < WARM_UP; i++) figure.pose(parameters);
    const posing = performance.now();
    for (let i = 0; i < POSE_REPEATS; i++) figure.pose(parameters);
    const poseMs = (performance.now() - posing) / POSE_REPEATS;
    console.info(`decode ${decodeMs.toFixed(1)} ms, pose ${poseMs.toFixed(2)} ms`);
    expect(decodeMs).toBeLessThan(DECODE_LOOSE_MS);
    expect(poseMs).toBeLessThan(POSE_LOOSE_MS);
  });
});
