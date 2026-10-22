import type { BufferGeometry, Object3D } from 'three';
import { lerp, smoothstep } from '@core/math';
import type { PartContext } from '../context';
import { WINDSCREEN } from './constants';
import { TRAIN_FINISHES, trainMesh } from './finishes';
import { emitGrid, gridNormals, shares } from './grid';
import { MeshBuilder } from './mesh';
import { noseTip, surfacePoint } from './nose';
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
  const sweep = 1 - (1 - share) ** 2;
  return [
    lerp(WINDSCREEN.frontLow, WINDSCREEN.frontHigh, sweep),
    lerp(WINDSCREEN.rearLow, WINDSCREEN.rearHigh, rake),
  ];
}

function pointAt(rowIndex: number, x: number, ends: SectionEnds): Vec3 {
  const low = Math.min(Math.floor(rowIndex), ROW_HIGH - 1);
  const high = surfacePoint(CONTOUR.rows[low + 1], x, ends);
  return surfacePoint(CONTOUR.rows[low], x, ends).map((value, axis) =>
    lerp(value, high[axis], rowIndex - low),
  ) as Vec3;
}

function windowGrid(ends: SectionEnds, window: Window): Vec3[][] {
  const [tipX, direction] = noseTip(ends);
  const rows = shares(WINDSCREEN.rows);
  const columns = shares(WINDSCREEN.columns);
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
    column.map(
      (point, j) => point.map((value, axis) => value + normals[i][j][axis] * lift) as Vec3,
    ),
  );
}

function windowGeometry(ends: SectionEnds, window: Window): BufferGeometry {
  const builder = new MeshBuilder();
  const points = windowGrid(ends, window);
  const normals = gridNormals(points, () => [0, 1, 0], false);
  emitGrid(() => builder, lifted(points, normals, window.lift), normals, 'screen');
  return builder.build();
}

export function buildWindscreen(context: PartContext, ends: SectionEnds, parent: Object3D): void {
  const layers = [
    [{ margin: 0, rowMargin: 0, lift: WINDSCREEN.frameLift }, TRAIN_FINISHES.screenFrame],
    [
      {
        margin: WINDSCREEN.frameInset,
        rowMargin: WINDSCREEN.frameRows,
        lift: WINDSCREEN.glassLift,
      },
      TRAIN_FINISHES.screen,
    ],
  ] as const;
  layers.forEach(([window, finish]) =>
    parent.add(trainMesh(context, windowGeometry(ends, window), finish)),
  );
}
