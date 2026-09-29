import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { NOZZLE_EXIT, PREBURNERS, TURBOPUMPS, wallRadius } from '../../../model';
import type { Canister } from '../../../model';
import {
  BELL_TOP_Y,
  BODY_OUTER,
  CHAMBER_HOUSING,
  COLLAR_BOTTOM_Y,
  COLLAR_OUTER,
  COOLANT_RING,
  HOT_GAS_RING,
  NECK_HOUSING,
  PREBURNER_TEMPLATE,
  PUMP_TEMPLATE,
  SEGMENTS,
  WALL_OUTSET,
} from '../../constants';
import { BELL_INNER_TINT, BELL_OUTER_TINT } from '../../finishes';
import { gradientTint } from '../../geometry/heatTint';
import { circleStrand, smoothStrand, wallStrand } from '../../geometry/profile';
import { revolveStrand } from '../../geometry/revolve';
import type { ProfilePoint } from '../../geometry/revolve';
import { scaleProfile } from '../../geometry/shells';

const SAMPLES = 9;
const SIDE_SAMPLES = 5;
const BELL_SAMPLES = 8;
const INNER_SAMPLES = 5;
const RING_STEPS = 6;

export interface EngineCopyGeometry {
  coat: BufferGeometry;
  bellOuter: BufferGeometry;
  bellInner: BufferGeometry;
}

function mergeAll(parts: BufferGeometry[]): BufferGeometry {
  const result = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  if (!result) throw new Error('Cannot merge the engine copy');
  return result;
}

function sideShell(
  canister: Canister,
  template: { top: number; bottom: number; radius: number; outer: readonly ProfilePoint[] },
): BufferGeometry {
  const strand = smoothStrand(
    scaleProfile(template.outer, {
      radius: canister.radius / template.radius,
      from: [template.top, template.bottom],
      to: [canister.top, canister.bottom],
    }),
    SIDE_SAMPLES,
  );
  const geometry = revolveStrand(strand, { segments: SEGMENTS.clusterSide });
  geometry.translate(canister.centre[0], 0, canister.centre[2]);
  return geometry;
}

export function engineCopyGeometry(): EngineCopyGeometry {
  const lathe = (points: readonly ProfilePoint[]) =>
    revolveStrand(smoothStrand(points, SAMPLES), { segments: SEGMENTS.cluster });
  const coat = mergeAll([
    lathe(BODY_OUTER),
    lathe(CHAMBER_HOUSING),
    lathe(NECK_HOUSING),
    lathe([...COLLAR_OUTER, [wallRadius(COLLAR_BOTTOM_Y) + WALL_OUTSET, COLLAR_BOTTOM_Y]]),
    revolveStrand(
      circleStrand([HOT_GAS_RING.radius, HOT_GAS_RING.y], HOT_GAS_RING.tube, RING_STEPS),
      {
        segments: SEGMENTS.cluster,
      },
    ),
    revolveStrand(
      circleStrand([COOLANT_RING.radius, COOLANT_RING.y], COOLANT_RING.tube, RING_STEPS / 2),
      {
        segments: SEGMENTS.cluster,
      },
    ),
    sideShell(TURBOPUMPS.oxygen, PUMP_TEMPLATE),
    sideShell(TURBOPUMPS.methane, PUMP_TEMPLATE),
    sideShell(PREBURNERS.oxygen, PREBURNER_TEMPLATE),
    sideShell(PREBURNERS.methane, PREBURNER_TEMPLATE),
  ]);
  const bellOuter = revolveStrand(
    wallStrand(WALL_OUTSET, BELL_TOP_Y, NOZZLE_EXIT.y, BELL_SAMPLES),
    { segments: SEGMENTS.cluster, tint: gradientTint(BELL_OUTER_TINT) },
  );
  const bellInner = revolveStrand(wallStrand(0, NOZZLE_EXIT.y, BELL_TOP_Y + 40, INNER_SAMPLES), {
    segments: SEGMENTS.clusterInner,
    tint: gradientTint(BELL_INNER_TINT),
    vRange: [NOZZLE_EXIT.y, -95],
  });
  return { coat, bellOuter, bellInner };
}
