import type { BufferGeometry } from 'three';
import { lerp } from '@core/math';
import { BACKUP_PANEL_X, FAIRING, PANEL, STARLINK_PANEL_XS } from '../../../model/layout';
import { FAIRING_SHAPE, SHELL } from '../../constants';
import { spread } from '../../geometry/curves';
import { flatPolygon } from '../../geometry/flat';
import { deckYAt, hullSectionAt } from '../../geometry/hullLines';
import type { Pair } from '../../geometry/hullLines';
import { gridSurface, mirrorZ, orientFrom } from '../../geometry/surface';
import type { Uv, Vec3 } from '../../geometry/surface';
import { mergeParts } from '../context';
import { acrossDeck, alongHull, fairingCutBand } from './hullShell';

export interface FairingGeometry {
  outer: BufferGeometry;
  outerPort: BufferGeometry;
  pockets: BufferGeometry;
  pocketsPort: BufferGeometry;
  inner: BufferGeometry;
  cut: BufferGeometry;
}

export const PANEL_XS = [BACKUP_PANEL_X, ...STARLINK_PANEL_XS] as const;

const HALF_FRAME = { x: PANEL.frameLength / 2, z: PANEL.frameWidth / 2 } as const;
const deckUv = (x: number, z: number): Uv => [alongHull(x), acrossDeck(z)];

function baseHalfWidthAt(x: number): number {
  return Math.min(FAIRING.baseHalfWidth, hullSectionAt(x).sheer[0]);
}

function topOutline(): Pair[] {
  const [aft] = FAIRING.x;
  const outline: Pair[] = [[aft, 0]];
  PANEL_XS.forEach((x) => {
    outline.push(
      [x - HALF_FRAME.x, 0],
      [x - HALF_FRAME.x, HALF_FRAME.z],
      [x + HALF_FRAME.x, HALF_FRAME.z],
      [x + HALF_FRAME.x, 0],
    );
  });
  outline.push(
    [FAIRING.frontTopX, 0],
    [FAIRING.frontTopX, FAIRING.topHalfWidth],
    [aft, FAIRING.topHalfWidth],
  );
  return outline;
}

function top(y: number, inset = 0): BufferGeometry {
  const outline = inset > 0 ? insetTop(inset) : topOutline();
  return flatPolygon(outline, (x, z) => [x, y, z], [], deckUv);
}

function insetTop(inset: number): Pair[] {
  const [aft] = FAIRING.x;
  return [
    [aft + inset, 0],
    [FAIRING.frontTopX - inset, 0],
    [FAIRING.frontTopX - inset, FAIRING.topHalfWidth - inset],
    [aft + inset, FAIRING.topHalfWidth - inset],
  ];
}

function sideRows(inset: number): Vec3[][] {
  const [aft, fore] = FAIRING.x;
  const shares = spread(0, 1, FAIRING_SHAPE.sideSamples);
  const upper = shares.map((share): Vec3 => [
    lerp(aft + inset, FAIRING.frontTopX - inset, share),
    FAIRING.top - inset,
    FAIRING.topHalfWidth - inset,
  ]);
  const lower = shares.map((share): Vec3 => {
    const x = lerp(aft + inset, fore - inset, share);
    const z = baseHalfWidthAt(x) - inset;
    return [x, deckYAt(x, z), z];
  });
  return [lower, upper];
}

function frontRows(inset: number): Vec3[][] {
  const [, fore] = FAIRING.x;
  const x = fore - inset;
  const edge = hullSectionAt(x).panelEdge[0];
  const base = baseHalfWidthAt(x) - inset;
  const shares = [
    ...spread(0, edge / base, FAIRING_SHAPE.frontSamples),
    ...spread(edge / base, 1, FAIRING_SHAPE.frontSamples).slice(1),
  ];
  const upper = shares.map((share): Vec3 => [
    FAIRING.frontTopX - inset,
    FAIRING.top - inset,
    share * (FAIRING.topHalfWidth - inset),
  ]);
  const lower = shares.map((share): Vec3 => {
    const z = share * base;
    return [x, deckYAt(x, z) - inset, z];
  });
  return [lower, upper];
}

function aftFace(inset: number): BufferGeometry {
  const x = FAIRING.x[0] + inset;
  const section = hullSectionAt(x);
  const base = baseHalfWidthAt(x) - inset;
  const outline: Pair[] = [
    [0, section.deck - inset],
    [section.panelEdge[0], section.deck - inset],
    [base, deckYAt(x, base) - inset],
    [FAIRING.topHalfWidth - inset, FAIRING.top - inset],
    [0, FAIRING.top - inset],
  ];
  return flatPolygon(
    outline,
    (z, y) => [x, y, z],
    [],
    (z) => deckUv(x, z),
  );
}

function shell(inset: number, withTop: boolean): BufferGeometry {
  const sideUv =
    (rows: Vec3[][]) =>
    (row: number, column: number): Uv => {
      const [x, , z] = rows[row][column];
      return deckUv(x, z);
    };
  const side = sideRows(inset);
  const front = frontRows(inset);
  const parts = [
    gridSurface(side, { uv: sideUv(side) }),
    gridSurface(front, { uv: sideUv(front) }),
    aftFace(inset),
  ];
  if (withTop) parts.push(top(FAIRING.top));
  else parts.push(top(FAIRING.top - inset, inset));
  return mergeParts(parts.map((part) => orientFrom(part, FAIRING_SHAPE.centre, withTop)));
}

function pockets(): BufferGeometry {
  const floor = FAIRING.top - FAIRING_SHAPE.recess;
  const parts = PANEL_XS.flatMap((x) => {
    const [aft, fore] = [x - HALF_FRAME.x, x + HALF_FRAME.x];
    const wall = (from: Vec3, to: Vec3): BufferGeometry =>
      gridSurface([
        [from, to],
        [
          [from[0], FAIRING.top, from[2]],
          [to[0], FAIRING.top, to[2]],
        ],
      ]);
    const centre: Vec3 = [x, floor + FAIRING_SHAPE.recess / 2, 0];
    return [
      flatPolygon(
        [
          [aft, 0],
          [fore, 0],
          [fore, HALF_FRAME.z],
          [aft, HALF_FRAME.z],
        ],
        (px, pz) => [px, floor, pz],
      ),
      wall([aft, floor, 0], [aft, floor, HALF_FRAME.z]),
      wall([fore, floor, 0], [fore, floor, HALF_FRAME.z]),
      wall([aft, floor, HALF_FRAME.z], [fore, floor, HALF_FRAME.z]),
    ].map((part) => orientFrom(part, centre, false));
  });
  return mergeParts(parts);
}

export function buildFairing(): FairingGeometry {
  const outer = shell(0, true);
  const pocket = pockets();
  return {
    outer,
    outerPort: mirrorZ(outer.clone()),
    pockets: pocket,
    pocketsPort: mirrorZ(pocket.clone()),
    inner: shell(SHELL.fairing, false),
    cut: fairingCutBand(),
  };
}
