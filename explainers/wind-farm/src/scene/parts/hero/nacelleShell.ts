import { DoubleSide, Path, Shape, ShapeGeometry, Vector2 } from 'three';
import type { BufferGeometry } from 'three';
import { mergeParts } from '../../geometry/merge';
import { rimProfile, scaleAt, stationsBetween, sweepProfile } from '../../geometry/sweep';
import type { SweepStation } from '../../geometry/sweep';
import { FINISHES } from '../../finishes';
import { NACELLE } from './constants';
import { PANEL_PROFILES, SHELL, SHELL_CENTRE, SHELL_STATIONS, perimeter } from './nacelleProfile';
import type { PanelId } from './nacelleProfile';

export const SHELL_FINISH = { ...FINISHES.paint, side: DoubleSide };
export const SEAM_FINISH = { ...FINISHES.paintShade, side: DoubleSide };

const SHAFT_HOLE = { radius: 0.82, segments: 32 } as const;
const SEAM = { xs: [-2.3, 0.9, 4.0, 6.3], halfWidth: 0.035, lift: 1.008 } as const;

interface Piece {
  readonly panel: PanelId;
  readonly from: number;
  readonly to: number;
  readonly openable: boolean;
}

const PIECES: readonly Piece[] = [
  { panel: 'floor', from: NACELLE.minX, to: NACELLE.maxX, openable: false },
  { panel: 'wallMinus', from: NACELLE.minX, to: NACELLE.maxX, openable: false },
  { panel: 'roofMinus', from: NACELLE.minX, to: NACELLE.maxX, openable: false },
  { panel: 'wallPlus', from: NACELLE.minX, to: NACELLE.maxX, openable: true },
  { panel: 'roofPlus', from: NACELLE.minX, to: NACELLE.maxX, openable: true },
];

function inward(point: Vector2): Vector2 {
  const { y, z } = SHELL_CENTRE;
  return new Vector2(z + (point.x - z) * SHELL.innerScale, y + (point.y - y) * SHELL.innerScale);
}

function pieceGeometry(piece: Piece): BufferGeometry {
  const profile = PANEL_PROFILES[piece.panel];
  const stations = stationsBetween(SHELL_STATIONS, piece.from, piece.to);
  const inner = stations.map((station) => ({
    ...station,
    scale: station.scale * SHELL.innerScale,
  }));
  const edges = [profile[0], profile[profile.length - 1]].map((point) =>
    sweepProfile([point, inward(point)], stations, SHELL_CENTRE),
  );
  const rims = [stations[0], stations[stations.length - 1]].map((station) =>
    rimProfile(profile, station, SHELL.innerScale, SHELL_CENTRE),
  );
  return mergeParts([
    sweepProfile(profile, stations, SHELL_CENTRE),
    sweepProfile(profile, inner, SHELL_CENTRE),
    ...edges,
    ...rims,
  ]);
}

function seamGeometry(piece: Piece): BufferGeometry[] {
  const profile = PANEL_PROFILES[piece.panel];
  return SEAM.xs
    .filter((x) => x - SEAM.halfWidth > piece.from && x + SEAM.halfWidth < piece.to)
    .map((x) => {
      const scale = scaleAt(SHELL_STATIONS, x) * SEAM.lift;
      const lifted = (offset: number): SweepStation => ({ x: x + offset, scale });
      return sweepProfile(profile, [lifted(-SEAM.halfWidth), lifted(SEAM.halfWidth)], SHELL_CENTRE);
    });
}

function capGeometry(station: SweepStation, hole: boolean): BufferGeometry {
  const { y, z } = SHELL_CENTRE;
  const outline = perimeter().map(
    (point) => new Vector2(z + (point.x - z) * station.scale, y + (point.y - y) * station.scale),
  );
  const shape = new Shape(outline);
  if (hole) {
    const circle = new Path();
    circle.absarc(z, y, SHAFT_HOLE.radius, 0, Math.PI * 2, true);
    shape.holes.push(circle);
  }
  const geometry = new ShapeGeometry(shape, SHAFT_HOLE.segments);
  geometry.rotateY(-Math.PI / 2);
  geometry.translate(station.x, 0, 0);
  return geometry;
}

export interface ShellGeometries {
  readonly closed: BufferGeometry;
  readonly open: BufferGeometry;
  readonly closedSeams: BufferGeometry;
  readonly openSeams: BufferGeometry;
}

export function shellGeometries(): ShellGeometries {
  const closedPieces = PIECES.filter((piece) => !piece.openable);
  const openPieces = PIECES.filter((piece) => piece.openable);
  const caps = [
    capGeometry(SHELL_STATIONS[0], true),
    capGeometry(SHELL_STATIONS[SHELL_STATIONS.length - 1], false),
  ];
  return {
    closed: mergeParts([...closedPieces.map(pieceGeometry), ...caps]),
    open: mergeParts(openPieces.map(pieceGeometry)),
    closedSeams: mergeParts(closedPieces.flatMap(seamGeometry)),
    openSeams: mergeParts(openPieces.flatMap(seamGeometry)),
  };
}
