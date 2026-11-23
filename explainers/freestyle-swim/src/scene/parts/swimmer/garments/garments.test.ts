import { describe, expect, it } from 'vitest';
import { Mesh, Vector3 } from 'three';
import type { Box3, BufferGeometry, Matrix4 } from 'three';
import { decodeFigure } from '@core/figure';
import type { Figure } from '@core/figure';
import { strokeAt } from '../../../../model';
import { bodyPose } from '../../../pose';
import { createSkeleton, solveSkeleton } from '../../../rig/skeleton';
import { FigureRig } from '../figure/figureRig';
import type { PartBuilder } from '../build';
import { outermostHit } from '@core/figure/body/faceProbe';
import { Goggles, gogglePlacement } from './goggles';
import { CHANNELS, JAMMERS, garmentFields } from './regions';
import { RestFrame } from '@core/figure/body/restFrame';

const { athleteData } = await import('../figure/athlete.data');
const figure = decodeFigure(athleteData);
const rig = new FigureRig(figure);
const frame = new RestFrame(figure);
const fields = garmentFields(figure, frame);

const AXES = 3;
const MM = 1000;
const PELVIS_JOINTS = /^(root|[lr]_upleg|[lr]_upleg_twist[012]_proc)$/;
const BELOW_KNEE_JOINTS = /_lowleg|_foot|_ball|_talocrural|_subtalar|_transversetarsal/;
const NAVEL_ABOVE_ROOT = 0.07;
const PELVIS_HEIGHT = 0.03;
const CROWN_DEPTH = 0.02;
const EYE_BAND = { below: 0.03, above: 0.03 } as const;
const FACE_DEPTH = 0.05;
const NOSE_LIMIT_Y = 1.75;
const PROJECTION_LIMIT_MM = 3;
const RIGID_LIMIT_MM = 0.1;
const POSE_STEP = 37;
const SURFACE_LIMIT = 0.008;

function vertex(index: number): Vector3 {
  return new Vector3().fromArray(figure.restPositions, index * AXES);
}

function insideJammers(index: number): boolean {
  return fields.distances[index * CHANNELS] > 0;
}

function insideCap(index: number): boolean {
  return fields.distances[index * CHANNELS + 1] > 0;
}

function verticesWhere(test: (index: number, point: Vector3) => boolean): number[] {
  return Array.from({ length: figure.vertexCount }, (_, index) => index).filter((index) =>
    test(index, vertex(index)),
  );
}

function jointName(index: number): string {
  const { start, joints, weights } = figure.skin;
  let best = start[index];
  for (let i = best + 1; i < start[index + 1]; i++) if (weights[i] > weights[best]) best = i;
  return figure.jointNames[joints[best]];
}

describe('jammers', () => {
  const root = frame.joint('root');

  it('cover every pelvis and upper thigh vertex below the waistband', () => {
    const pelvis = verticesWhere(
      (index, point) => PELVIS_JOINTS.test(jointName(index)) && point.y < root.y + PELVIS_HEIGHT,
    );
    expect(pelvis.length).toBeGreaterThan(200);
    expect(pelvis.filter((index) => !insideJammers(index))).toEqual([]);
  });

  it('stay below the navel and above the knee joints', () => {
    const covered = verticesWhere((index) => insideJammers(index));
    expect(covered.length).toBeGreaterThan(200);
    const knee = Math.max(frame.joint('l_lowleg').y, frame.joint('r_lowleg').y);
    covered.forEach((index) => {
      const point = vertex(index);
      expect(point.y).toBeLessThan(root.y + NAVEL_ABOVE_ROOT);
      expect(point.y).toBeGreaterThan(knee);
      expect(BELOW_KNEE_JOINTS.test(jointName(index))).toBe(false);
    });
  });

  it('end each hem across its own thigh', () => {
    ['l', 'r'].forEach((side) => {
      const hip = frame.joint(`${side}_upleg`);
      const knee = frame.joint(`${side}_lowleg`);
      const axis = knee.clone().sub(hip).normalize();
      const along = verticesWhere(
        (index) => insideJammers(index) && jointName(index).startsWith(`${side}_upleg`),
      ).map((index) => vertex(index).sub(hip).dot(axis));
      expect(Math.max(...along)).toBeLessThanOrEqual(JAMMERS.kneeHemAlongThigh + 1e-6);
      expect(Math.max(...along)).toBeGreaterThan(JAMMERS.kneeHemAlongThigh - 0.03);
    });
  });
});

describe('cap', () => {
  const eye = frame.joint('r_eye');
  const top = frame.joint('c_head_null');

  it('covers the crown', () => {
    const crown = verticesWhere((_, point) => point.y > top.y - CROWN_DEPTH && point.z > -0.1);
    expect(crown.length).toBeGreaterThan(5);
    expect(crown.filter((index) => !insideCap(index))).toEqual([]);
  });

  it('leaves the brows, eyes and nose bare', () => {
    const face = verticesWhere(
      (_, point) =>
        point.z > frame.joint('c_head').z + FACE_DEPTH &&
        point.y < eye.y + EYE_BAND.above &&
        point.y > frame.joint('c_head').y,
    );
    expect(face.length).toBeGreaterThan(30);
    expect(face.filter((index) => insideCap(index))).toEqual([]);
    const nose = verticesWhere(
      (_, point) => point.y < NOSE_LIMIT_Y && point.y > eye.y - EYE_BAND.below,
    )
      .map((index) => ({ index, z: vertex(index).z }))
      .sort((a, b) => b.z - a.z)[0];
    expect(insideCap(nose.index)).toBe(false);
  });

  it('is a head cap and nothing else', () => {
    const covered = verticesWhere((index) => insideCap(index));
    expect(covered.length).toBeGreaterThan(80);
    covered.forEach((index) => expect(vertex(index).y).toBeGreaterThan(frame.joint('c_head').y));
  });
});

function stubBuilder(): PartBuilder {
  return {
    mesh: (geometry: BufferGeometry, _group: string, _finish: string, parent: Mesh['parent']) => {
      const mesh = new Mesh(geometry);
      parent?.add(mesh);
      return mesh;
    },
  } as unknown as PartBuilder;
}

function centreOf(mesh: Mesh, matrix: Matrix4): Vector3 {
  mesh.geometry.computeBoundingBox();
  return (mesh.geometry.boundingBox as Box3).getCenter(new Vector3()).applyMatrix4(matrix);
}

describe('goggles', () => {
  it('finds the face along a ray', () => {
    const triangle = {
      triangleCount: 1,
      indices: Uint16Array.from([0, 1, 2]),
      restPositions: Float32Array.from([-1, -1, 2, 1, -1, 2, 0, 1, 2]),
    } as unknown as Figure;
    expect(outermostHit(triangle, new Vector3(0, 0, 0), new Vector3(0, 0, 1))?.z).toBeCloseTo(2);
    expect(outermostHit(triangle, new Vector3(3, 0, 0), new Vector3(0, 0, 1))).toBeUndefined();
  });

  it('centre on the forward projection of each eye onto the face', () => {
    const sides = gogglePlacement(figure, frame);
    ['r_eye', 'l_eye'].forEach((name, index) => {
      const eye = frame.joint(name);
      const hit = outermostHit(figure, eye, new Vector3(0, 0, 1)) as Vector3;
      expect(sides[index].centre.distanceTo(hit) * MM).toBeLessThan(PROJECTION_LIMIT_MM);
      const nearest = Math.min(
        ...verticesWhere(() => true).map((vertexIndex) => vertex(vertexIndex).distanceTo(hit)),
      );
      expect(nearest).toBeLessThan(SURFACE_LIMIT);
    });
  });

  it('stay rigid to the head across the stroke', () => {
    const goggles = new Goggles(stubBuilder(), figure, frame, rig.toRig);
    const meshes = goggles.group.children as Mesh[];
    const headJoint = figure.jointIndex('c_head');
    const spread = meshes.map(() => ({ min: Infinity, max: -Infinity }));
    for (let units = 0; units < 1000; units += POSE_STEP) {
      const reading = strokeAt(units, {
        pace: 'middle',
        kick: 'two',
        breathing: 'right',
        headUp: false,
      });
      rig.pose(solveSkeleton(createSkeleton(), reading, 0, bodyPose(0, 0).y));
      goggles.update();
      const head = new Vector3()
        .fromArray(figure.jointPositions, headJoint * AXES)
        .applyMatrix4(rig.toRig);
      meshes.forEach((lens, index) => {
        const distance = centreOf(lens, goggles.group.matrix).distanceTo(head) * MM;
        spread[index].min = Math.min(spread[index].min, distance);
        spread[index].max = Math.max(spread[index].max, distance);
      });
    }
    spread.forEach(({ min, max }) => expect(max - min).toBeLessThan(RIGID_LIMIT_MM));
  });
});
