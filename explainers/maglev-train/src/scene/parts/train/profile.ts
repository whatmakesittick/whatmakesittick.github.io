import { CubicBezierCurve, LineCurve, Vector2 } from 'three';
import type { Curve } from 'three';
import { BODY, CONTOUR_CELLS } from './constants';

export type BodyRegion = 'underbody' | 'white' | 'band';
export type SegmentId = keyof typeof CONTOUR_CELLS;

export interface ContourRow {
  readonly z: number;
  readonly y: number;
  readonly h: number;
  readonly nz: number;
  readonly ny: number;
}

export interface Contour {
  readonly rows: readonly ContourRow[];
  readonly cellRegions: readonly BodyRegion[];
  readonly firstRow: Readonly<Record<SegmentId, number>>;
}

interface SegmentSpec {
  id: SegmentId;
  region: BodyRegion;
  curve: Curve<Vector2>;
}

const CORNER_HANDLE = 0.05;
const SIDE_HANDLE = 0.45;
const SHOULDER_HANDLE = 0.62;
const SHOULDER_LEAN = 0.03;
const BODY_HEIGHT = BODY.roofY - BODY.floorY;

function point(z: number, y: number): Vector2 {
  return new Vector2(z, y);
}

function segments(): SegmentSpec[] {
  const { floorY, roofY, floorEdgeZ, seamZ, seamY, halfWidth, bandBottom, bandTop } = BODY;
  const floorEdge = point(floorEdgeZ, floorY);
  const seam = point(seamZ, seamY);
  const bandLow = point(halfWidth, bandBottom);
  const bandHigh = point(BODY.bandTopZ, bandTop);
  return [
    { id: 'floor', region: 'underbody', curve: new LineCurve(point(0, floorY), floorEdge) },
    {
      id: 'corner',
      region: 'underbody',
      curve: new CubicBezierCurve(
        floorEdge,
        point(floorEdgeZ + CORNER_HANDLE, floorY),
        point(seamZ, seamY - CORNER_HANDLE),
        seam,
      ),
    },
    {
      id: 'lowerSide',
      region: 'white',
      curve: new CubicBezierCurve(
        seam,
        point(seamZ, seamY + SIDE_HANDLE),
        point(halfWidth, bandBottom - SIDE_HANDLE),
        bandLow,
      ),
    },
    { id: 'band', region: 'band', curve: new LineCurve(bandLow, bandHigh) },
    {
      id: 'shoulder',
      region: 'white',
      curve: new CubicBezierCurve(
        bandHigh,
        point(BODY.bandTopZ - SHOULDER_LEAN, bandTop + SHOULDER_HANDLE),
        point(BODY.crownZ, roofY),
        point(0, roofY),
      ),
    },
  ];
}

function rowAt(curve: Curve<Vector2>, share: number): ContourRow {
  const at = curve.getPoint(share);
  const tangent = curve.getTangent(share);
  const length = Math.hypot(tangent.x, tangent.y) || 1;
  return {
    z: at.x,
    y: at.y,
    h: (at.y - BODY.floorY) / BODY_HEIGHT,
    nz: tangent.y / length,
    ny: -tangent.x / length,
  };
}

export function buildContour(): Contour {
  const rows: ContourRow[] = [];
  const cellRegions: BodyRegion[] = [];
  const firstRow = {} as Record<SegmentId, number>;
  segments().forEach(({ id, region, curve }, index) => {
    const cells = CONTOUR_CELLS[id];
    firstRow[id] = rows.length === 0 ? 0 : rows.length - 1;
    for (let step = index === 0 ? 0 : 1; step <= cells; step += 1) {
      rows.push(rowAt(curve, step / cells));
    }
    for (let cell = 0; cell < cells; cell += 1) cellRegions.push(region);
  });
  return { rows, cellRegions, firstRow };
}

export const CONTOUR = buildContour();

export interface SideSample {
  readonly z: number;
  readonly ny: number;
  readonly nz: number;
}

export function sideAt(y: number): SideSample {
  const { rows } = CONTOUR;
  const start = CONTOUR.firstRow.lowerSide;
  const index = rows.findIndex(
    (_, at) => at >= start && at < rows.length - 1 && rows[at + 1].y >= y,
  );
  const low = rows[Math.max(start, index)];
  const high = rows[Math.max(start, index) + 1];
  const share = Math.min(1, Math.max(0, (y - low.y) / (high.y - low.y || 1)));
  const blend = (a: number, b: number) => a + (b - a) * share;
  const ny = blend(low.ny, high.ny);
  const nz = blend(low.nz, high.nz);
  const length = Math.hypot(ny, nz) || 1;
  return { z: blend(low.z, high.z), ny: ny / length, nz: nz / length };
}
