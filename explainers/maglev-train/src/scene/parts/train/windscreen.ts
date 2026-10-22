import type { BufferGeometry } from 'three';
import { lerp, smoothstep } from '@core/math';
import { WINDSCREEN } from './constants';
import { emitGrid, gridNormals } from './grid';
import { RegionBuilders } from './mesh';
import { surfacePoint } from './nose';
import type { SectionEnds, Vec3 } from './nose';
import { CONTOUR } from './profile';

interface Window {
  margin: number;
  rowMargin: number;
  lift: number;
}

const ROW_LOW = CONTOUR.firstRow.band;
const ROW_HIGH = CONTOUR.rows.length - 1;
const BAND_TOP_SHARE = (CONTOUR.firstRow.shoulder - ROW_LOW) / (ROW_HIGH - ROW_LOW);

export function windscreenSpan(share: number): [front: number, rear: number] {
  const rake = smoothstep(share, BAND_TOP_SHARE, 1);
  return [
    lerp(WINDSCREEN.frontLow, WINDSCREEN.frontHigh, share),
    lerp(WINDSCREEN.rearLow, WINDSCREEN.rearHigh, rake),
  ];
}

function pointAt(rowIndex: number, x: number, ends: SectionEnds): Vec3 {
  const low = Math.min(Math.floor(rowIndex), ROW_HIGH - 1);
  const share = rowIndex - low;
  const a = surfacePoint(CONTOUR.rows[low], x, ends);
  const b = surfacePoint(CONTOUR.rows[low + 1], x, ends);
  return [lerp(a[0], b[0], share), lerp(a[1], b[1], share), lerp(a[2], b[2], share)];
}

function windowGrid(ends: SectionEnds, tipX: number, window: Window): Vec3[][] {
  const direction = tipX > (ends.rearX + ends.frontX) / 2 ? 1 : -1;
  const rows = Array.from({ length: WINDSCREEN.rows + 1 }, (_, step) => step / WINDSCREEN.rows);
  const columns = Array.from(
    { length: WINDSCREEN.columns + 1 },
    (_, step) => step / WINDSCREEN.columns,
  );
  const ordered = direction > 0 ? columns : [...columns].reverse();
  const rowSpan = ROW_HIGH - ROW_LOW - window.rowMargin;
  return ordered.map((column) =>
    rows.map((share) => {
      const [front, rear] = windscreenSpan(share);
      const distance = lerp(rear - window.margin, front + window.margin, column);
      const rowIndex = ROW_LOW + window.rowMargin + share * rowSpan;
      return pointAt(rowIndex, tipX - direction * distance, ends);
    }),
  );
}

function lifted(points: Vec3[][], normals: Vec3[][], lift: number): Vec3[][] {
  return points.map((column, i) =>
    column.map((point, j): Vec3 => {
      const normal = normals[i][j];
      return [
        point[0] + normal[0] * lift,
        point[1] + normal[1] * lift,
        point[2] + normal[2] * lift,
      ];
    }),
  );
}

function windowGeometry(
  noses: readonly (readonly [SectionEnds, number])[],
  window: Window,
): BufferGeometry | undefined {
  const builders = new RegionBuilders<'window'>();
  noses.forEach(([ends, tipX], index) => {
    const points = windowGrid(ends, tipX, window);
    const normals = gridNormals(points, () => [0, 1, 0], { first: false, last: true });
    emitGrid(
      builders,
      lifted(points, normals, window.lift),
      normals,
      () => 'window',
      `screen${index}`,
    );
  });
  return builders.build().get('window');
}

export function buildWindscreens(noses: readonly (readonly [SectionEnds, number])[]) {
  return {
    frame: windowGeometry(noses, { margin: 0, rowMargin: 0, lift: WINDSCREEN.frameLift }),
    glass: windowGeometry(noses, {
      margin: WINDSCREEN.frameInset,
      rowMargin: WINDSCREEN.frameRows,
      lift: WINDSCREEN.glassLift,
    }),
  };
}
