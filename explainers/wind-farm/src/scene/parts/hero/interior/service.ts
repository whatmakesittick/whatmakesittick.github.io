import { CatmullRomCurve3, TubeGeometry, Vector3 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { extrudeProfileAlongX } from '@core/scene/geometry/extrude';
import type { Point } from '../../../../ids';
import { groupMesh } from '../../context';
import type { PartContext } from '../../context';
import { ROOF_Y, SEGMENTS, WALL_Z } from './constants';
import { iBeamShape, merge, rodAlongX, span } from './geometry';
import type { Range } from './geometry';

const RAIL = {
  x: [-3.8, 8.2],
  beam: { width: 0.18, bottom: 106.44, top: 106.62, web: 0.03, flange: 0.035 },
} as const;
const HANGERS = { xs: [-3.4, -0.4, 2.6, 5.6, 7.9], half: 0.05, depth: 0.04 } as const;
const HOIST = {
  body: { x: [6.6, 7.1], y: [106.14, RAIL.beam.bottom], z: 0.18 },
  chain: { half: 0.025, y: [105.78, 106.14] },
  block: { half: 0.08, y: [105.66, 105.78], z: 0.06 },
} as const;

const TRAY = {
  x: [-3.5, 5.9],
  y: [105.85, 105.95],
  z: [-WALL_Z + 0.05, -1.75],
  skin: 0.02,
} as const;
const TRAY_BRACKETS = { every: 1.6, half: 0.03, drop: 0.05 } as const;
const TRAY_CABLES = { zs: [-1.96, -1.9, -1.84], radius: 0.03, y: 105.9 } as const;

const GENERATOR_CABLE = { radius: 0.04, segments: 20 } as const;
const GENERATOR_CABLE_ROUTES: readonly (readonly Point[])[] = [-0.15, 0, 0.15].map(
  (offset, index) => [
    [4.45 + offset, 105.98, -0.2],
    [4.55 + offset, 106.02, -0.9],
    [5.6, 105.95 - index * 0.06, -1.45 - index * 0.08],
    [6.05, 105.85 - index * 0.08, -1.55 - index * 0.08],
  ],
);

function craneRail(): BufferGeometry {
  const hangerTop = ROOF_Y;
  return merge([
    extrudeProfileAlongX(iBeamShape(0, RAIL.beam), RAIL.x[0], RAIL.x[1]),
    ...HANGERS.xs.map((x) =>
      span(
        [x - HANGERS.half, x + HANGERS.half],
        [RAIL.beam.top, hangerTop],
        [-HANGERS.depth, HANGERS.depth],
      ),
    ),
  ]);
}

function hoist(): BufferGeometry {
  const { body, chain, block } = HOIST;
  const centre = (body.x[0] + body.x[1]) / 2;
  return merge([
    span(body.x, body.y, [-body.z, body.z]),
    span([centre - chain.half, centre + chain.half], chain.y, [-chain.half, chain.half]),
    span([centre - block.half, centre + block.half], block.y, [-block.z, block.z]),
  ]);
}

function tray(): BufferGeometry {
  const { x, y, z, skin } = TRAY;
  const floor: Range = [y[0], y[0] + skin];
  const count = Math.floor((x[1] - x[0]) / TRAY_BRACKETS.every);
  const brackets = Array.from({ length: count + 1 }, (_, index) => {
    const at = x[0] + index * TRAY_BRACKETS.every;
    return span(
      [at - TRAY_BRACKETS.half, at + TRAY_BRACKETS.half],
      [y[0] - TRAY_BRACKETS.drop, y[0]],
      [-WALL_Z, z[1]],
    );
  });
  return merge([
    span(x, floor, z),
    span(x, y, [z[0], z[0] + skin]),
    span(x, y, [z[1] - skin, z[1]]),
    ...brackets,
  ]);
}

function cables(): BufferGeometry {
  const runs = TRAY_CABLES.zs.map((z) =>
    rodAlongX(TRAY.x, TRAY_CABLES.radius, SEGMENTS.cable).translate(0, TRAY_CABLES.y, z),
  );
  const leads = GENERATOR_CABLE_ROUTES.map((route) => {
    const curve = new CatmullRomCurve3(route.map((point) => new Vector3(...point)));
    return new TubeGeometry(
      curve,
      GENERATOR_CABLE.segments,
      GENERATOR_CABLE.radius,
      SEGMENTS.cable,
    );
  });
  return merge([...runs, ...leads]);
}

export function buildService(context: PartContext, parent: Object3D): void {
  parent.add(
    groupMesh(context, craneRail(), STRUCTURE_GROUP, 'steel'),
    groupMesh(context, hoist(), STRUCTURE_GROUP, 'castIron'),
    groupMesh(context, tray(), STRUCTURE_GROUP, 'gridSteel'),
    groupMesh(context, cables(), STRUCTURE_GROUP, 'cableDark'),
  );
}
