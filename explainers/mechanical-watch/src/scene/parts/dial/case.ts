import { LatheGeometry, Vector2 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import {
  CASE_HEIGHT_MM,
  CASE_INNER_RADIUS_MM,
  CASE_OUTER_RADIUS_MM,
  STEM_AXIS_Z_MM,
} from '../../../model/scale';
import { CASE_RING, SEGMENTS } from '../../constants';
import type { LathePoint } from '../../geometry/extrude';
import { latheZ } from '../../geometry/extrude';
import { merge } from '../../geometry/merge';
import { polarDeg } from '../../geometry/outline';
import { partMesh } from '../context';
import type { PartContext } from '../context';

const ROUND_SAMPLES = 8;
const FLANK_BULGE = 0.1;
const QUARTER_TURN = Math.PI / 2;
const SHOULDER_RISE = 0.8;
const LIP_CHAMFER = 0.25;

type Run = readonly LathePoint[];

function roundedEdge(from: LathePoint, to: LathePoint, corner: LathePoint): LathePoint[] {
  return Array.from({ length: ROUND_SAMPLES + 1 }, (_, index) => {
    const t = index / ROUND_SAMPLES;
    const mix = (a: number, b: number, c: number) =>
      (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
    return [mix(from[0], corner[0], to[0]), mix(from[1], corner[1], to[1])] as LathePoint;
  });
}

function caseRuns(): Run[] {
  const [front, back] = CASE_HEIGHT_MM;
  const inner = CASE_INNER_RADIUS_MM;
  const outer = CASE_OUTER_RADIUS_MM;
  const { frontRadius, backRadius, lipRadius, seatRadius, seat, lip, shoulderInset } = CASE_RING;
  const middle = (front + back) / 2;
  const frontShoulder: LathePoint = [outer - shoulderInset, front + SHOULDER_RISE];
  const backShoulder: LathePoint = [outer - shoulderInset, back - SHOULDER_RISE];
  return [
    roundedEdge([frontRadius, front], frontShoulder, [outer, front]),
    [frontShoulder, [outer, middle - FLANK_BULGE], [outer, middle + FLANK_BULGE], backShoulder],
    roundedEdge(backShoulder, [backRadius, back], [outer, back]),
    [
      [backRadius, back],
      [inner, back],
    ],
    [
      [inner, back],
      [inner, seat[1]],
    ],
    [
      [inner, seat[1]],
      [seatRadius, seat[1]],
    ],
    [
      [seatRadius, seat[1]],
      [seatRadius, seat[0]],
    ],
    [
      [seatRadius, seat[0]],
      [inner, seat[0]],
    ],
    [
      [inner, seat[0]],
      [inner, lip],
    ],
    [
      [inner, lip],
      [lipRadius, lip - LIP_CHAMFER],
    ],
    [
      [lipRadius, lip - LIP_CHAMFER],
      [lipRadius, front],
    ],
    [
      [lipRadius, front],
      [frontRadius, front],
    ],
  ];
}

function runGeometry(run: Run): BufferGeometry {
  const geometry = new LatheGeometry(
    run.map(([radius, z]) => new Vector2(radius, z)),
    SEGMENTS.case,
  );
  geometry.rotateX(QUARTER_TURN);
  return geometry;
}

function tubeGeometry(): BufferGeometry {
  const { tube } = CASE_RING;
  const geometry = latheZ(
    [
      [tube.outer, tube.start],
      [tube.outer, tube.end],
      [tube.inner, tube.end],
      [tube.inner, tube.start],
      [tube.outer, tube.start],
    ],
    SEGMENTS.hub,
  );
  geometry.rotateY(QUARTER_TURN);
  geometry.translate(0, 0, STEM_AXIS_Z_MM);
  return geometry;
}

export function createCase(context: PartContext, frame: Object3D): Object3D {
  const ring = merge([...caseRuns().map(runGeometry), tubeGeometry()]);
  frame.add(partMesh(context, ring, 'case', 'case'));
  const at = polarDeg({ x: 0, y: 0 }, CASE_OUTER_RADIUS_MM, CASE_RING.labelDeg);
  return anchorAt(frame, at.x, at.y, (CASE_HEIGHT_MM[0] + CASE_HEIGHT_MM[1]) / 2);
}
