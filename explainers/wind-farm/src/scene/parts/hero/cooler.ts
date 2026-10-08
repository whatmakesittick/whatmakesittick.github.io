import { CylinderGeometry } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { box } from '@core/scene/geometry/box';
import { mergeParts } from '../../geometry/merge';
import { groupMesh, label, partMesh } from '../context';
import type { PartContext } from '../context';
import { COOLER, NACELLE } from './constants';

const BASE = { bottomY: 106.0, topY: 107.0, halfWidth: 2.06 } as const;
const FRAME = { post: 0.16, rim: 0.16, halfWidth: 2.0 } as const;
const GRILLE = { inset: 0.12, thickness: 0.06 } as const;
const FINS = { count: 26, thickness: 0.035, depth: 0.12, margin: 0.2 } as const;
const MAST = { x: 7.9, radius: 0.05, height: 2.2, cup: 0.09, arm: 0.35, segments: 8 } as const;

const TOP = COOLER.topY;

function baseHalfGeometry(side: -1 | 1): BufferGeometry {
  const edge = side * BASE.halfWidth;
  return box({
    minX: COOLER.minX,
    maxX: COOLER.maxX,
    minY: BASE.bottomY,
    maxY: BASE.topY,
    minZ: Math.min(0, edge),
    maxZ: Math.max(0, edge),
  });
}

function frameGeometry(): BufferGeometry {
  const half = FRAME.post / 2;
  const xs = [COOLER.minX + half, (COOLER.minX + COOLER.maxX) / 2, COOLER.maxX - half];
  const posts = xs.flatMap((x) =>
    [-1, 1].map((side) =>
      box({
        minX: x - half,
        maxX: x + half,
        minY: BASE.topY,
        maxY: TOP,
        minZ: side * FRAME.halfWidth - half,
        maxZ: side * FRAME.halfWidth + half,
      }),
    ),
  );
  const rims = [-1, 1].flatMap((side) => [
    box({
      minX: COOLER.minX,
      maxX: COOLER.maxX,
      minY: TOP - FRAME.rim,
      maxY: TOP,
      minZ: side * FRAME.halfWidth - half,
      maxZ: side * FRAME.halfWidth + half,
    }),
    box({
      minX: side < 0 ? COOLER.minX : COOLER.maxX - FRAME.post,
      maxX: side < 0 ? COOLER.minX + FRAME.post : COOLER.maxX,
      minY: BASE.topY,
      maxY: TOP,
      minZ: -FRAME.halfWidth,
      maxZ: FRAME.halfWidth,
    }),
  ]);
  return mergeParts([...posts, ...rims, ...finGeometries(), mastGeometry()]);
}

function finGeometries(): BufferGeometry[] {
  const from = COOLER.minX + FINS.margin;
  const span = COOLER.maxX - FINS.margin - from;
  return [-1, 1].flatMap((side) =>
    Array.from({ length: FINS.count }, (_, index) => {
      const x = from + (span * index) / (FINS.count - 1);
      const z = side * (FRAME.halfWidth - GRILLE.inset);
      return box({
        minX: x - FINS.thickness / 2,
        maxX: x + FINS.thickness / 2,
        minY: BASE.topY,
        maxY: TOP - FRAME.rim,
        minZ: z - FINS.depth / 2,
        maxZ: z + FINS.depth / 2,
      });
    }),
  );
}

function grilleGeometry(): BufferGeometry {
  const inner = FRAME.halfWidth - GRILLE.inset - FINS.depth / 2;
  const sides = [-1, 1].map((side) =>
    box({
      minX: COOLER.minX + FRAME.post,
      maxX: COOLER.maxX - FRAME.post,
      minY: BASE.topY,
      maxY: TOP - FRAME.rim,
      minZ: side * inner - GRILLE.thickness / 2,
      maxZ: side * inner + GRILLE.thickness / 2,
    }),
  );
  const roof = box({
    minX: COOLER.minX + FRAME.post,
    maxX: COOLER.maxX - FRAME.post,
    minY: TOP - FRAME.rim - GRILLE.thickness,
    maxY: TOP - FRAME.rim,
    minZ: -inner,
    maxZ: inner,
  });
  return mergeParts([...sides, roof]);
}

function mastGeometry(): BufferGeometry {
  const pole = new CylinderGeometry(MAST.radius, MAST.radius, MAST.height, MAST.segments);
  pole.translate(MAST.x, TOP + MAST.height / 2, 0);
  const arm = box({
    minX: MAST.x - MAST.radius,
    maxX: MAST.x + MAST.radius,
    minY: TOP + MAST.height - MAST.radius,
    maxY: TOP + MAST.height + MAST.radius,
    minZ: -MAST.arm,
    maxZ: MAST.arm,
  });
  const cups = [-1, 1].map((side) => {
    const cup = new CylinderGeometry(MAST.cup, MAST.cup, MAST.cup * 1.6, MAST.segments);
    cup.translate(MAST.x, TOP + MAST.height + MAST.cup, side * MAST.arm);
    return cup;
  });
  return mergeParts([pole, arm, ...cups]);
}

export function buildCooler(
  context: PartContext,
  parent: Object3D,
  openable: Object3D,
): BufferGeometry {
  const frame = frameGeometry();
  const cooler = partMesh(context, frame, 'cooler');
  cooler.add(
    groupMesh(context, grilleGeometry(), 'cooler', 'grille'),
    groupMesh(context, baseHalfGeometry(-1), 'cooler', 'paint'),
  );
  openable.add(groupMesh(context, baseHalfGeometry(1), 'cooler', 'paint'));
  parent.add(cooler);
  label(context, 'cooler', cooler, [(COOLER.minX + COOLER.maxX) / 2, TOP, NACELLE.halfWidth]);
  return frame;
}
