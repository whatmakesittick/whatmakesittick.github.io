import { BufferAttribute, BufferGeometry, Matrix4, Sphere, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FULL_TURN } from '@core/math';
import { BLADE_LENGTH_M, ROTOR_RADIUS_M, TURBINE_GEOMETRY } from '../../../model';
import { degrees } from '../context';

interface Station {
  readonly radius: number;
  readonly chord: number;
  readonly thickness: number;
  readonly twistDeg: number;
}

const ROOT = TURBINE_GEOMETRY.bladeRootRadius;
const STATIONS: readonly Station[] = [
  { radius: ROOT, chord: 2.6, thickness: 1, twistDeg: 13 },
  { radius: ROOT + 0.06 * BLADE_LENGTH_M, chord: 3.6, thickness: 0.6, twistDeg: 13 },
  { radius: ROOT + 0.17 * BLADE_LENGTH_M, chord: 4.2, thickness: 0.34, twistDeg: 10 },
  { radius: ROOT + 0.36 * BLADE_LENGTH_M, chord: 3.4, thickness: 0.24, twistDeg: 6 },
  { radius: ROOT + 0.59 * BLADE_LENGTH_M, chord: 2.5, thickness: 0.2, twistDeg: 3 },
  { radius: ROOT + 0.82 * BLADE_LENGTH_M, chord: 1.7, thickness: 0.18, twistDeg: 1 },
  { radius: ROOT + 0.96 * BLADE_LENGTH_M, chord: 1, thickness: 0.18, twistDeg: 0 },
  { radius: ROTOR_RADIUS_M, chord: 0.35, thickness: 0.18, twistDeg: 0 },
];
const LEADING_SHARE = 0.25;
const OUTLINE: readonly (readonly [along: number, half: number])[] = [
  [0, 0],
  [0.08, 0.36],
  [0.3, 0.5],
  [0.65, 0.3],
  [1, 0.02],
  [0.65, -0.3],
  [0.3, -0.5],
  [0.08, -0.36],
];
const BLADE_COUNT = 3;
const XYZ = 3;
const BOUNDS_MARGIN_M = 1;

function ring({ radius, chord, thickness, twistDeg }: Station): number[] {
  const twist = degrees(twistDeg);
  const cos = Math.cos(twist);
  const sin = Math.sin(twist);
  return OUTLINE.flatMap(([along, half]) => {
    const chordwise = (LEADING_SHARE - along) * chord;
    const across = half * thickness * chord;
    return [across * cos - chordwise * sin, radius, across * sin + chordwise * cos];
  });
}

function bladeIndices(): number[] {
  const sides = OUTLINE.length;
  return STATIONS.slice(1).flatMap((_, span) =>
    OUTLINE.flatMap((__, side) => {
      const next = (side + 1) % sides;
      const a = span * sides + side;
      const b = span * sides + next;
      const c = a + sides;
      const d = b + sides;
      return [a, b, c, b, d, c];
    }),
  );
}

function bladeGeometry(): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array(STATIONS.flatMap(ring)), XYZ),
  );
  geometry.setIndex(bladeIndices());
  geometry.computeVertexNormals();
  return geometry;
}

export function rotorGeometry(): BufferGeometry {
  const blade = bladeGeometry();
  const rotor = mergeGeometries(
    Array.from({ length: BLADE_COUNT }, (_, index) =>
      blade.clone().applyMatrix4(new Matrix4().makeRotationX((index * FULL_TURN) / BLADE_COUNT)),
    ),
  );
  blade.dispose();
  if (!rotor) throw new Error('Farm rotor blades do not share attributes');
  rotor.boundingSphere = new Sphere(new Vector3(), ROTOR_RADIUS_M + BOUNDS_MARGIN_M);
  return rotor;
}
