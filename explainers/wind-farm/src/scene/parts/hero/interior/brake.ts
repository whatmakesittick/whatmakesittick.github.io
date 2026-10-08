import { Path, Shape, Vector2 } from 'three';
import type { BufferGeometry, Group, Object3D } from 'three';
import { FULL_TURN } from '@core/math';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { extrudeProfileAlongX } from '@core/scene/geometry/extrude';
import type { ProfilePoint } from '@core/scene/geometry/lathe';
import { TURBINE_GEOMETRY } from '../../../../model/layout';
import { FINISHES } from '../../../finishes';
import { degrees, groupMesh, namedGroup, partMesh } from '../../context';
import type { PartContext } from '../../context';
import { AXIS_Y, SEGMENTS } from './constants';
import { boltRing, circlePoints, merge, rodAlongX, SIDES, span, turned } from './geometry';

export interface Brake {
  readonly spin: Group;
  setBraked(braked: boolean): void;
}

const DISC = {
  x: TURBINE_GEOMETRY.brakeDisc.x,
  radius: TURBINE_GEOMETRY.brakeDisc.radius,
  halfThickness: 0.03,
  holes: 8,
  holeRadius: 0.06,
  holeRing: 0.62,
} as const;

const DISC_HUB: readonly ProfilePoint[] = [
  [2.5, 0],
  [2.5, 0.26],
  [2.7, 0.26],
  [2.7, 0],
];
const HUB_BOLTS = { count: 6, radius: 0.19, x: 2.7, side: 1, head: 0.03, length: 0.04 } as const;

const COUPLING_PROFILE: readonly ProfilePoint[] = [
  [2.45, 0],
  [2.45, 0.12],
  [2.74, 0.12],
  [2.74, 0.34],
  [2.8, 0.34],
  [2.8, 0.17],
  [3.06, 0.17],
  [3.06, 0.34],
  [3.12, 0.34],
  [3.12, 0.12],
  [3.28, 0.12],
  [3.28, 0],
];
const COUPLING_BOLTS = [
  { count: 8, radius: 0.27, x: 2.8, side: 1, head: 0.028, length: 0.04 },
  { count: 8, radius: 0.27, x: 3.06, side: -1, head: 0.028, length: 0.04, phase: FULL_TURN / 16 },
] as const;

const CALIPER_TURN = degrees(-55);
const CALIPER = {
  tangential: 0.19,
  radial: [0.66, 0.98],
  bridge: [0.92, 1.0],
  inner: [2.47, 2.565],
  outer: [2.635, 2.73],
  bracket: { x: [2.4, 2.47], tangential: 0.12, radial: [0.6, 0.9] },
  piston: { radius: 0.075, length: 0.04, offset: 0.09, radial: 0.8 },
} as const;

function discGeometry(): BufferGeometry {
  const shape = new Shape(circlePoints(DISC.radius, SEGMENTS.disc));
  for (let index = 0; index < DISC.holes; index++) {
    const angle = (index / DISC.holes) * FULL_TURN;
    const centre = new Vector2(Math.cos(angle), Math.sin(angle)).multiplyScalar(DISC.holeRing);
    shape.holes.push(new Path(circlePoints(DISC.holeRadius, SEGMENTS.hole, centre)));
  }
  return extrudeProfileAlongX(shape, DISC.x - DISC.halfThickness, DISC.x + DISC.halfThickness);
}

function caliperGeometry(): BufferGeometry {
  const { tangential, radial, bridge, inner, outer, bracket, piston } = CALIPER;
  const across: readonly [number, number] = [-tangential, tangential];
  const pistons = SIDES.flatMap((side) => [
    rodAlongX([inner[0] - piston.length, inner[0]], piston.radius, SEGMENTS.small).translate(
      0,
      side * piston.offset,
      piston.radial,
    ),
    rodAlongX([outer[1], outer[1] + piston.length], piston.radius, SEGMENTS.small).translate(
      0,
      side * piston.offset,
      piston.radial,
    ),
  ]);
  return merge([
    span(inner, across, radial),
    span(outer, across, radial),
    span([inner[0], outer[1]], across, bridge),
    span(bracket.x, [-bracket.tangential, bracket.tangential], bracket.radial),
    ...pistons,
  ])
    .rotateX(CALIPER_TURN)
    .translate(0, AXIS_Y, 0);
}

export function buildBrake(context: PartContext, parent: Object3D): Brake {
  const spin = namedGroup('fastShaftSpin', parent);
  spin.position.y = AXIS_Y;
  const disc = merge([discGeometry(), turned(DISC_HUB, SEGMENTS.medium), ...boltRing(HUB_BOLTS)]);
  spin.add(partMesh(context, disc, 'brakeDisc'));
  const coupling = merge([
    turned(COUPLING_PROFILE, SEGMENTS.medium),
    ...COUPLING_BOLTS.flatMap(boltRing),
  ]);
  spin.add(groupMesh(context, coupling, STRUCTURE_GROUP, 'steel'));

  const caliper = partMesh(context, caliperGeometry(), 'brakeDisc', 'hydraulic');
  const resting = caliper.material;
  const glowing = context.materials.get('brakeDisc', FINISHES.brakeGlow);
  parent.add(caliper);
  return {
    spin,
    setBraked: (braked) => {
      caliper.material = braked ? glowing : resting;
    },
  };
}
