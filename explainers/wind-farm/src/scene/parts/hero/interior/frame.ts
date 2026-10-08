import type { BufferGeometry, Object3D } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { extrudeProfileAlongX } from '@core/scene/geometry/extrude';
import { TURBINE_GEOMETRY } from '../../../../model/layout';
import { groupMesh } from '../../context';
import type { PartContext } from '../../context';
import { FLOOR_Y, FRAME_TOP_Y, WALKWAY_Y } from './constants';
import { iBeamShape, merge, span } from './geometry';
import type { Range } from './geometry';

const REAR_X: Range = [TURBINE_GEOMETRY.bedplate.maxX - 0.1, TURBINE_GEOMETRY.nacelle.maxX - 0.1];
const BEAM = { width: 0.22, bottom: FLOOR_Y, top: FRAME_TOP_Y, web: 0.04, flange: 0.04 } as const;
const BEAM_ZS = [-1.65, -0.9, 0.9, 1.75] as const;
const CROSS_BEAMS = { xs: [2.5, 4.4, 6.2, 8.2], half: 0.06, drop: 0.04, z: [-1.8, 1.85] } as const;

const GRATING = { bar: 0.012, height: 0.04, pitchX: 0.3, pitchZ: 0.25 } as const;
const REAR_WALKWAY = { x: [2.55, 8.2], z: [-1.2, 1.95] } as const;
const FRONT_WALKWAY = { x: [-4.2, -1.65], z: [1.6, 2.0] } as const;
const FRONT_RAILS = [
  [1.58, 1.65],
  [1.93, 2.0],
] as const;

function bars(from: number, to: number, pitch: number): number[] {
  const count = Math.floor((to - from) / pitch);
  const step = (to - from) / count;
  return Array.from({ length: count + 1 }, (_, index) => from + index * step);
}

function grating(x: Range, z: Range): BufferGeometry[] {
  const y: Range = [WALKWAY_Y, WALKWAY_Y + GRATING.height];
  const along = bars(z[0], z[1], GRATING.pitchZ).map((barZ) =>
    span(x, y, [barZ - GRATING.bar, barZ + GRATING.bar]),
  );
  const across = bars(x[0], x[1], GRATING.pitchX).map((barX) =>
    span([barX - GRATING.bar, barX + GRATING.bar], y, z),
  );
  return [...along, ...across];
}

function rearFrame(): BufferGeometry {
  const beams = BEAM_ZS.map((z) => extrudeProfileAlongX(iBeamShape(z, BEAM), REAR_X[0], REAR_X[1]));
  const cross = CROSS_BEAMS.xs.map((x) =>
    span(
      [x - CROSS_BEAMS.half, x + CROSS_BEAMS.half],
      [FLOOR_Y, FRAME_TOP_Y - CROSS_BEAMS.drop],
      CROSS_BEAMS.z,
    ),
  );
  const rails = FRONT_RAILS.map((z) => span(FRONT_WALKWAY.x, [FLOOR_Y, WALKWAY_Y], z));
  return merge([...beams, ...cross, ...rails]);
}

export function buildFrame(context: PartContext, parent: Object3D): void {
  const walkways = merge([
    ...grating(REAR_WALKWAY.x, REAR_WALKWAY.z),
    ...grating(FRONT_WALKWAY.x, FRONT_WALKWAY.z),
  ]);
  parent.add(
    groupMesh(context, rearFrame(), STRUCTURE_GROUP, 'paintShade'),
    groupMesh(context, walkways, STRUCTURE_GROUP, 'gridSteel'),
  );
}
