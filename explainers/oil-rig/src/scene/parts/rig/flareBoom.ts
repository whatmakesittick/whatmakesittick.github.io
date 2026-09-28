import { Group, Matrix4, Vector3 } from 'three';
import type { BufferGeometry, ColorRepresentation, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { FLARE, SEGMENTS } from '../../constants';
import { PAINT } from '../../finishes';
import { barGeometry, rodGeometry } from '../../geometry/bars';
import type { Point } from '../../geometry/bars';
import { mergePainted } from '../../geometry/merge';
import { partMesh } from '../context';
import type { PartContext } from '../context';

type Painted = readonly [BufferGeometry, ColorRepresentation];

export interface FlareBoomPart {
  object: Group;
  anchor: Object3D;
  tip: Vector3;
  direction: Vector3;
}

const CHORD_ANGLES = [
  Math.PI / 2,
  Math.PI / 2 + (Math.PI * 2) / 3,
  Math.PI / 2 + (Math.PI * 4) / 3,
];
const TAPER = 0.45;
const PLATFORM = { length: 2.4, width: 3.2, thickness: 0.25 } as const;
const PILOT = { radius: 0.12, length: 1.4 } as const;
const LABEL_SHARE = 0.5;

function chordPoint(chord: number, along: number): Point {
  const share = along / FLARE.length;
  const radius = (FLARE.width / 2) * (1 - TAPER * share);
  const angle = CHORD_ANGLES[chord];
  return [along, radius * Math.sin(angle), radius * Math.cos(angle)];
}

function truss(): Painted[] {
  const step = FLARE.length / FLARE.panels;
  const members: Painted[] = [];
  CHORD_ANGLES.forEach((_, chord) => {
    members.push([
      barGeometry(chordPoint(chord, 0), chordPoint(chord, FLARE.length), FLARE.chord),
      PAINT.trim,
    ]);
    const next = (chord + 1) % CHORD_ANGLES.length;
    for (let panel = 0; panel < FLARE.panels; panel++) {
      const from = panel * step;
      const to = from + step;
      members.push(
        [barGeometry(chordPoint(chord, from), chordPoint(next, from), FLARE.brace), PAINT.trim],
        [barGeometry(chordPoint(chord, from), chordPoint(next, to), FLARE.brace), PAINT.trim],
      );
    }
  });
  return members;
}

function burner(): Painted[] {
  const { length, burnerRadius, burnerLength } = FLARE;
  const tipEnd = length + burnerLength;
  return [
    [rodGeometry([length, 0, 0], [tipEnd, 0, 0], burnerRadius, SEGMENTS.round), PAINT.darkSteel],
    [rodGeometry([0, 0, 0], [length, 0, 0], burnerRadius / 2, SEGMENTS.rod), PAINT.steel],
    [
      barGeometry(
        [length - PLATFORM.length, -burnerRadius, 0],
        [length, -burnerRadius, 0],
        PLATFORM.thickness,
        PLATFORM.width,
      ),
      PAINT.safetyYellow,
    ],
    [
      rodGeometry(
        [tipEnd, burnerRadius, 0],
        [tipEnd, burnerRadius + PILOT.length, 0],
        PILOT.radius,
        SEGMENTS.wire,
      ),
      PAINT.darkSteel,
    ],
  ];
}

function placement(): Matrix4 {
  const [x, y, z] = FLARE.base;
  const pitch = new Matrix4().makeRotationZ(FLARE.pitch);
  return new Matrix4().makeRotationY(FLARE.yaw).multiply(pitch).setPosition(x, y, z);
}

export function createFlareBoom(context: PartContext): FlareBoomPart {
  const object = new Group();
  const matrix = placement();
  const geometry = mergePainted([...truss(), ...burner()]).applyMatrix4(matrix);
  object.add(partMesh(context, geometry, 'flareBoom', 'paintedMetal'));
  const tip = new Vector3(FLARE.length + FLARE.burnerLength, 0, 0).applyMatrix4(matrix);
  const direction = new Vector3(1, 0, 0).transformDirection(matrix);
  const middle = new Vector3(FLARE.length * LABEL_SHARE, FLARE.width / 2, 0).applyMatrix4(matrix);
  return { object, anchor: anchorAt(object, middle.x, middle.y, middle.z), tip, direction };
}
