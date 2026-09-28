import {
  BoxGeometry,
  ConeGeometry,
  LatheGeometry,
  Matrix4,
  Quaternion,
  Vector2,
  Vector3,
} from 'three';
import type { BufferGeometry, ColorRepresentation } from 'three';
import { barGeometry, rodGeometry } from '../../geometry/bars';
import type { Point } from '../../geometry/bars';
import { mergePainted } from '../../geometry/merge';
import { SEGMENTS } from '../../constants';

type Painted = readonly [BufferGeometry, ColorRepresentation];
type Profile = readonly (readonly [radius: number, height: number])[];

const TONES = {
  body: '#4d545a',
  blade: '#5d656c',
  cutter: '#e3e7ea',
  cone: '#5b636a',
  tooth: '#d5dadd',
  shank: '#6e767d',
} as const;

const LATHE_SEGMENTS = 18;
const FULL_TURN = Math.PI * 2;
const UP = new Vector3(0, 1, 0);

const PDC = {
  profile: [
    [0, 0.2],
    [0.24, 0.14],
    [0.46, 0.12],
    [0.62, 0.16],
    [0.72, 0.26],
    [0.76, 0.38],
    [0.76, 0.6],
    [0.6, 0.7],
    [0.46, 0.8],
    [0.42, 1.02],
    [0.36, 1.2],
    [0, 1.2],
  ] as Profile,
  blades: 5,
  bladeFrom: 1,
  bladeTo: 6,
  bladeWidth: 0.12,
  bladeDepth: 0.26,
  bladeSink: 0.03,
  cutterRadius: 0.07,
  cutterDepth: 0.05,
} as const;

const ROLLER = {
  shank: [
    [0, 0.62],
    [0.5, 0.66],
    [0.58, 0.8],
    [0.56, 0.96],
    [0.42, 1.1],
    [0.38, 1.28],
    [0, 1.28],
  ] as Profile,
  cones: 3,
  coneRadius: 0.44,
  coneHeight: 0.7,
  coneReach: 0.62,
  coneY: 0.44,
  journal: 0.62,
  legWidth: 0.4,
  legDepth: 0.3,
  legTop: { reach: 0.34, height: 0.95 },
  legFoot: { reach: 0.84, height: 0.4 },
  rows: [
    { share: 0.15, teeth: 11 },
    { share: 0.45, teeth: 8 },
    { share: 0.72, teeth: 5 },
  ],
  toothRadius: 0.075,
  toothHeight: 0.16,
} as const;

function lathe(profile: Profile): BufferGeometry {
  return new LatheGeometry(
    profile.map(([radius, height]) => new Vector2(radius, height)),
    LATHE_SEGMENTS,
  );
}

function radial(angle: number, radius: number, height: number): Point {
  return [radius * Math.cos(angle), height, radius * Math.sin(angle)];
}

interface BladeFrame {
  tangent: Vector3;
  along: Vector3;
  outward: Vector3;
}

function bladeFrame(
  angle: number,
  from: readonly [number, number],
  to: readonly [number, number],
): BladeFrame {
  const radialAxis = new Vector3(Math.cos(angle), 0, Math.sin(angle));
  const [dr, dy] = [to[0] - from[0], to[1] - from[1]];
  const length = Math.hypot(dr, dy);
  const along = radialAxis
    .clone()
    .multiplyScalar(dr / length)
    .addScaledVector(UP, dy / length);
  const outward = radialAxis
    .clone()
    .multiplyScalar(dy / length)
    .addScaledVector(UP, -dr / length);
  return { tangent: new Vector3(-Math.sin(angle), 0, Math.cos(angle)), along, outward };
}

function pointOn(angle: number, [radius, height]: readonly [number, number]): Vector3 {
  return new Vector3(...radial(angle, radius, height));
}

function blade(angle: number): Painted[] {
  const { profile, bladeFrom, bladeTo, bladeWidth, bladeDepth, bladeSink } = PDC;
  const pieces: Painted[] = [];
  for (let index = bladeFrom; index < bladeTo; index++) {
    const frame = bladeFrame(angle, profile[index], profile[index + 1]);
    const start = pointOn(angle, profile[index]);
    const end = pointOn(angle, profile[index + 1]);
    const centre = start
      .add(end)
      .multiplyScalar(1 / 2)
      .addScaledVector(frame.outward, bladeDepth / 2 - bladeSink);
    const inward = frame.tangent.clone().cross(frame.along);
    const matrix = new Matrix4()
      .makeBasis(frame.tangent, frame.along, inward)
      .scale(new Vector3(bladeWidth, end.distanceTo(start) || bladeWidth, bladeDepth))
      .setPosition(centre);
    pieces.push([new BoxGeometry(1, 1, 1).applyMatrix4(matrix), TONES.blade]);
  }
  return pieces;
}

function cutters(angle: number): Painted[] {
  const {
    profile,
    bladeFrom,
    bladeTo,
    bladeDepth,
    bladeSink,
    cutterRadius,
    cutterDepth,
    bladeWidth,
  } = PDC;
  return profile.slice(bladeFrom + 1, bladeTo).map((point, index): Painted => {
    const frame = bladeFrame(angle, profile[bladeFrom + index], point);
    const edge = pointOn(angle, point)
      .addScaledVector(frame.outward, bladeDepth - bladeSink - cutterRadius)
      .addScaledVector(frame.tangent, bladeWidth / 2);
    const tip = edge.clone().addScaledVector(frame.tangent, cutterDepth);
    return [
      rodGeometry(edge.toArray() as Point, tip.toArray() as Point, cutterRadius, SEGMENTS.rod),
      TONES.cutter,
    ];
  });
}

export function pdcBitGeometry(): BufferGeometry {
  const parts: Painted[] = [[lathe(PDC.profile), TONES.body]];
  for (let index = 0; index < PDC.blades; index++) {
    const angle = (index / PDC.blades) * FULL_TURN;
    parts.push(...blade(angle), ...cutters(angle));
  }
  return mergePainted(parts);
}

function coneFrame(angle: number): Matrix4 {
  const axis = new Vector3(-Math.cos(angle), -ROLLER.journal, -Math.sin(angle)).normalize();
  const base = new Vector3(...radial(angle, ROLLER.coneReach, ROLLER.coneY));
  const centre = base.addScaledVector(axis, ROLLER.coneHeight / 2);
  const turn = new Quaternion().setFromUnitVectors(UP, axis);
  return new Matrix4().compose(centre, turn, new Vector3(1, 1, 1));
}

function teeth(): BufferGeometry[] {
  const { coneRadius, coneHeight, toothRadius, toothHeight } = ROLLER;
  return ROLLER.rows.flatMap((row) => {
    const radius = coneRadius * (1 - row.share);
    const y = -coneHeight / 2 + row.share * coneHeight;
    return Array.from({ length: row.teeth }, (_, index) => {
      const angle = (index / row.teeth) * FULL_TURN;
      const tooth = new ConeGeometry(toothRadius, toothHeight, 4);
      const outward = new Vector3(
        Math.cos(angle),
        coneRadius / coneHeight,
        Math.sin(angle),
      ).normalize();
      tooth.applyQuaternion(new Quaternion().setFromUnitVectors(UP, outward));
      tooth.translate(radius * Math.cos(angle), y, radius * Math.sin(angle));
      return tooth;
    });
  });
}

function cone(angle: number): Painted[] {
  const frame = coneFrame(angle);
  const body = new ConeGeometry(ROLLER.coneRadius, ROLLER.coneHeight, 14).applyMatrix4(frame);
  const { legTop, legFoot } = ROLLER;
  const leg = barGeometry(
    radial(angle, legTop.reach, legTop.height),
    radial(angle, legFoot.reach, legFoot.height),
    ROLLER.legWidth,
    ROLLER.legDepth,
  );
  return [
    [body, TONES.cone],
    [leg, TONES.shank],
    ...teeth().map((tooth): Painted => [tooth.applyMatrix4(frame), TONES.tooth]),
  ];
}

export function rollerConeBitGeometry(): BufferGeometry {
  const parts: Painted[] = [[lathe(ROLLER.shank), TONES.shank]];
  for (let index = 0; index < ROLLER.cones; index++) {
    parts.push(...cone((index / ROLLER.cones) * FULL_TURN));
  }
  return mergePainted(parts);
}

export const BIT_HEIGHT = Math.max(
  PDC.profile[PDC.profile.length - 1][1],
  ROLLER.shank[ROLLER.shank.length - 1][1],
);
