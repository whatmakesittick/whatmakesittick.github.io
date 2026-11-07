import { CylinderGeometry, LatheGeometry, Vector2 } from 'three';
import type { BufferGeometry, Mesh } from 'three';
import { box } from '@core/scene/geometry/box';
import { CASE, LEG_SPOTS } from '../../../model';
import { FINISHES } from '../../finishes';
import { partMesh } from '../context';
import type { PartContext } from '../context';
import { mergeParts } from './geometry';
import { GLOSS } from './gloss';

type Profile = readonly (readonly [radius: number, y: number])[];

const SEGMENTS = 20;
const BLOCK = { half: 0.066, bottom: 0.56 } as const;
const SHAFT: Profile = [
  [0, 0.09],
  [0.039, 0.09],
  [0.041, 0.112],
  [0.05, 0.33],
  [0.058, 0.52],
  [0.068, 0.532],
  [0.068, 0.548],
  [0.06, 0.556],
  [0.06, BLOCK.bottom],
  [0, BLOCK.bottom],
];
const FERRULE: Profile = [
  [0, 0.046],
  [0.03, 0.046],
  [0.044, 0.056],
  [0.044, 0.098],
  [0.041, 0.104],
  [0, 0.104],
];
const WHEEL = { radius: 0.026, width: 0.026, z: 0.012 } as const;
const QUARTER_TURN = Math.PI / 2;

function lathe(profile: Profile): BufferGeometry {
  return new LatheGeometry(
    profile.map(([radius, y]) => new Vector2(radius, y)),
    SEGMENTS,
  );
}

function leg(): BufferGeometry {
  const block = box({
    minX: -BLOCK.half,
    maxX: BLOCK.half,
    minY: BLOCK.bottom,
    maxY: CASE.rimBottom,
    minZ: -BLOCK.half,
    maxZ: BLOCK.half,
  });
  return mergeParts([lathe(SHAFT), block]);
}

function caster(): BufferGeometry {
  const wheel = new CylinderGeometry(WHEEL.radius, WHEEL.radius, WHEEL.width, SEGMENTS)
    .rotateZ(QUARTER_TURN)
    .translate(0, WHEEL.radius, WHEEL.z);
  return mergeParts([lathe(FERRULE), wheel]);
}

function placed(make: () => BufferGeometry): BufferGeometry {
  return mergeParts(LEG_SPOTS.map(([x, z]) => make().translate(x, 0, z)));
}

export function buildLegs(context: PartContext): Mesh[] {
  return [
    partMesh(context, placed(leg), 'case', GLOSS.case),
    partMesh(context, placed(caster), 'case', FINISHES.brass),
  ];
}
