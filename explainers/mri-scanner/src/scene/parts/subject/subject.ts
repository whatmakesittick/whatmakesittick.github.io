import {
  BoxGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  PlaneGeometry,
  Shape,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import type { PartId } from '../../../ids';
import { HEAD_COIL, ISOCENTRE, PATIENT, TABLE } from '../../../model/layout';
import { SUBJECT_DETAIL } from '../../constants';
import { FINISHES } from '../../finishes';
import type { PartContext, SceneModule } from '../context';
import { mergeParts, partMesh } from '../context';

const QUARTER = Math.PI / 2;
const CRADLE_BASE = TABLE.top - TABLE.cradleThickness;
const [CX, CY, CZ] = ISOCENTRE;
const ROUND = 6;
const STRUT_SIDES = 8;
const RING_SEGMENTS = 48;
const ARC_SEGMENTS = 16;
const LIMB_SIDES = 16;
const HEAD_SEGMENTS = { width: 32, height: 20 } as const;
const WINDOW_STRUT_SCALE = 1.3;
const HEAD_SCALE = [0.82, 1, 1.12] as const;
const NECK = { radius: 0.05, z: [0.08, 0.2] as const, drop: 0.04 };
const TORSO = { radius: 0.1, length: 0.5, widen: 1.8, z: 0.45 };

type Profile = readonly (readonly [number, number])[];

const BODY_HEIGHT: Profile = [
  [0.3, 0.17],
  [0.5, 0.2],
  [0.8, 0.16],
  [1.0, 0.13],
  [1.55, 0.09],
  [1.68, 0.1],
  [1.76, 0.17],
  [1.84, 0.06],
  [1.92, 0],
];
const BODY_HALF_WIDTH: Profile = [
  [0.3, 0.23],
  [0.9, 0.22],
  [1.1, 0.17],
  [1.7, 0.11],
  [1.92, 0.1],
];
const LEG_GROOVE = { from: 1.0, depth: 0.025, width: 0.03 };
const DOME_POWER = 0.6;
const DRAPE_DROP = 0.07;

function sample(profile: Profile, z: number): number {
  const next = profile.findIndex(([at]) => at >= z);
  if (next <= 0) return profile[next === 0 ? 0 : profile.length - 1][1];
  const [z0, v0] = profile[next - 1];
  const [z1, v1] = profile[next];
  const t = (z - z0) / (z1 - z0);
  return v0 + (v1 - v0) * t * t * (3 - 2 * t);
}

function smoothstep(value: number): number {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

export function blanketHeight(x: number, z: number): number {
  const { loft } = SUBJECT_DETAIL.blanket;
  const width = sample(BODY_HALF_WIDTH, z);
  const side = Math.abs(x);
  if (side <= width) {
    const dome = (1 - (side / width) ** 2) ** DOME_POWER;
    const groove =
      z > LEG_GROOVE.from ? LEG_GROOVE.depth * Math.exp(-((x / LEG_GROOVE.width) ** 2)) : 0;
    return TABLE.top + loft + sample(BODY_HEIGHT, z) * dome - groove;
  }
  const overhang =
    (side - TABLE.cradleHalfWidth) / (SUBJECT_DETAIL.blanket.halfWidth - TABLE.cradleHalfWidth);
  return (
    TABLE.top + loft * (1 - smoothstep((side - width) / loft)) - DRAPE_DROP * smoothstep(overhang)
  );
}

function blanket(): BufferGeometry {
  const { startZ, endZ, halfWidth, columns, rows } = SUBJECT_DETAIL.blanket;
  const geometry = new PlaneGeometry(1, 1, columns, rows);
  const position = geometry.getAttribute('position');
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index) * 2 * halfWidth;
    const z = startZ + (position.getY(index) + 0.5) * (endZ - startZ);
    position.setXYZ(index, x, blanketHeight(x, z), z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function roundedSection(halfWidth: number, bottom: number, top: number, corner: number): Shape {
  return new Shape()
    .moveTo(-halfWidth, bottom)
    .lineTo(halfWidth, bottom)
    .lineTo(halfWidth, top - corner)
    .quadraticCurveTo(halfWidth, top, halfWidth - corner, top)
    .lineTo(-halfWidth + corner, top)
    .quadraticCurveTo(-halfWidth, top, -halfWidth, top - corner)
    .closePath();
}

function alongZ(shape: Shape, [from, to]: readonly [number, number]): BufferGeometry {
  return new ExtrudeGeometry(shape, {
    depth: to - from,
    bevelEnabled: false,
    curveSegments: ROUND,
  }).translate(0, 0, from);
}

function pedestal(): BufferGeometry {
  const { pedestal: column, foot } = SUBJECT_DETAIL;
  const section = new Shape()
    .moveTo(-column.bottomHalf, 0)
    .lineTo(column.bottomHalf, 0)
    .lineTo(column.topHalf, column.top)
    .lineTo(-column.topHalf, column.top)
    .closePath();
  const footLength = foot.z[1] - foot.z[0];
  return mergeParts([
    alongZ(section, column.z),
    new BoxGeometry(2 * foot.halfWidth, foot.height, footLength).translate(
      0,
      foot.height / 2,
      (foot.z[0] + foot.z[1]) / 2,
    ),
  ]);
}

function bed(): BufferGeometry {
  const { bed: housing } = SUBJECT_DETAIL;
  return alongZ(
    roundedSection(TABLE.halfWidth, housing.bottom, CRADLE_BASE, housing.corner),
    TABLE.z,
  );
}

function rails(): BufferGeometry {
  const { rail } = SUBJECT_DETAIL;
  const length = TABLE.z[1] - TABLE.z[0];
  const y = (SUBJECT_DETAIL.bed.bottom + CRADLE_BASE) / 2;
  return mergeParts(
    [-1, 1].map((side) =>
      new BoxGeometry(rail.depth, rail.height, length).translate(
        side * (TABLE.halfWidth + rail.depth / 2),
        y,
        (TABLE.z[0] + TABLE.z[1]) / 2,
      ),
    ),
  );
}

function cradle(): BufferGeometry {
  const half = TABLE.cradleHalfWidth;
  const section = new Shape()
    .moveTo(-half, CRADLE_BASE)
    .lineTo(half, CRADLE_BASE)
    .lineTo(half, TABLE.top)
    .quadraticCurveTo(0, TABLE.top - 2 * SUBJECT_DETAIL.cradle.sag, -half, TABLE.top)
    .closePath();
  return alongZ(section, TABLE.cradleZ);
}

function headPad(): BufferGeometry {
  const { pad } = SUBJECT_DETAIL;
  return new BoxGeometry(2 * pad.halfWidth, pad.height, pad.length).translate(
    CX,
    TABLE.top + pad.height / 2 - SUBJECT_DETAIL.cradle.sag,
    CZ,
  );
}

function skin(): BufferGeometry {
  const head = new SphereGeometry(PATIENT.headRadius, HEAD_SEGMENTS.width, HEAD_SEGMENTS.height)
    .scale(...HEAD_SCALE)
    .translate(CX, CY, CZ);
  const neckLength = NECK.z[1] - NECK.z[0];
  const neck = new CylinderGeometry(NECK.radius, NECK.radius, neckLength, LIMB_SIDES)
    .rotateX(QUARTER)
    .translate(CX, CY - NECK.drop, (NECK.z[0] + NECK.z[1]) / 2);
  return mergeParts([head, neck]);
}

function gown(): BufferGeometry {
  return new CapsuleGeometry(TORSO.radius, TORSO.length, STRUT_SIDES, LIMB_SIDES)
    .rotateX(QUARTER)
    .scale(TORSO.widen, 1, 1)
    .translate(CX, TABLE.top + TORSO.radius, TORSO.z);
}

function strut(angle: number, from: number, to: number, radius: number): BufferGeometry {
  return new CylinderGeometry(radius, radius, to - from, STRUT_SIDES)
    .rotateX(QUARTER)
    .translate(
      CX + HEAD_COIL.radius * Math.cos(angle),
      CY + HEAD_COIL.radius * Math.sin(angle),
      CZ + (from + to) / 2,
    );
}

function ring(z: number, start: number, arc: number, segments: number): BufferGeometry {
  const { ringTube } = SUBJECT_DETAIL.coil;
  return new TorusGeometry(HEAD_COIL.radius, ringTube, STRUT_SIDES, segments, arc)
    .rotateZ(start)
    .translate(CX, CY, CZ + z);
}

function coilBase(): BufferGeometry {
  const [start, sweep] = SUBJECT_DETAIL.coil.baseArc;
  const { ringTube } = SUBJECT_DETAIL.coil;
  const outer = HEAD_COIL.radius + ringTube;
  const inner = HEAD_COIL.radius - ringTube;
  const section = new Shape()
    .absarc(0, 0, outer, start, start + sweep, false)
    .absarc(0, 0, inner, start + sweep, start, true);
  const half = HEAD_COIL.length / 2;
  return new ExtrudeGeometry(section, {
    depth: HEAD_COIL.length,
    bevelEnabled: false,
    curveSegments: RING_SEGMENTS / 2,
  }).translate(CX, CY, CZ - half);
}

function coilShell(): BufferGeometry {
  const { strut: radius, strutAngles, window } = SUBJECT_DETAIL.coil;
  const half = HEAD_COIL.length / 2;
  const top = QUARTER;
  return mergeParts([
    coilBase(),
    ring(-half, 0, Math.PI * 2, RING_SEGMENTS),
    ring(half, 0, Math.PI * 2, RING_SEGMENTS),
    ...strutAngles.map((angle) => strut(angle, -half, half, radius)),
    strut(top, -half, window.z[0], radius),
    strut(top, window.z[1], half, radius),
  ]);
}

function coilWindow(): BufferGeometry {
  const { strut: radius, window } = SUBJECT_DETAIL.coil;
  const from = QUARTER - window.halfAngle;
  const sweep = 2 * window.halfAngle;
  const half = HEAD_COIL.length / 2;
  return mergeParts([
    ring(window.z[0], from, sweep, ARC_SEGMENTS),
    ring(window.z[1], from, sweep, ARC_SEGMENTS),
    strut(from, -half, half, radius * WINDOW_STRUT_SCALE),
    strut(from + sweep, -half, half, radius * WINDOW_STRUT_SCALE),
  ]);
}

function part(name: PartId, ...children: Object3D[]): Group {
  const group = new Group();
  group.name = name;
  group.add(...children);
  return group;
}

class SubjectModule implements SceneModule {
  readonly root = new Group();
  readonly labels: ReadonlyMap<PartId, Object3D>;
  readonly anchors: SceneModule['anchors'];

  constructor(context: PartContext) {
    const mesh = (
      id: PartId,
      geometry: BufferGeometry,
      finish: (typeof FINISHES)[keyof typeof FINISHES],
    ) => partMesh(context, geometry, id, finish);
    const table = part(
      'table',
      mesh('table', pedestal(), FINISHES.pedestal),
      mesh('table', bed(), FINISHES.table),
      mesh('table', rails(), FINISHES.rail),
      mesh('table', cradle(), FINISHES.cradle),
    );
    const patient = part(
      'patient',
      mesh('patient', headPad(), FINISHES.pad),
      mesh('patient', skin(), FINISHES.skin),
      mesh('patient', gown(), FINISHES.gown),
      mesh('patient', blanket(), FINISHES.blanket),
    );
    const headCoil = part(
      'headCoil',
      mesh('headCoil', coilShell(), FINISHES.headCoil),
      mesh('headCoil', coilWindow(), FINISHES.coilTrim),
    );
    this.root.add(table, patient, headCoil);
    this.labels = new Map<PartId, Object3D>([
      ['table', anchorAt(table, TABLE.halfWidth, TABLE.top, TABLE.z[1])],
      ['patient', anchorAt(patient, 0, TABLE.top, PATIENT.feetZ)],
      ['headCoil', anchorAt(headCoil, CX, CY + HEAD_COIL.radius, CZ)],
    ]);
    this.anchors = { headCoil: anchorAt(headCoil, ...HEAD_COIL.centre) };
  }

  setState(): void {}

  update(): boolean {
    return false;
  }
}

export function createSubjectModule(context: PartContext): SceneModule {
  return new SubjectModule(context);
}
