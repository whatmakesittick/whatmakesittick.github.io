import type { BufferGeometry, Object3D } from 'three';
import { BARREL, GAS_BLOCK, RIFLING } from '../../model/layout';
import { BARREL_OUTLINE, BORE_RADIUS, CHAMBER_BORE, COMPENSATOR, SEGMENTS } from '../constants';
import { turnedPiece } from '../geometry/pieces';
import type { CutPiece } from '../geometry/pieces';
import { turnOutline } from '../geometry/turned';
import type { TurnStrand } from '../geometry/turned';
import { addPiece } from './context';
import type { PartContext } from './context';

const CHAMBER_END = CHAMBER_BORE.leadeEnd;
const MUZZLE = BARREL.x[1];

function chamberPiece(): CutPiece {
  const { base, shoulder, neck, shoulderStart, neckStart, neckEnd, throatEnd } = CHAMBER_BORE;
  const strands: TurnStrand[] = [
    [
      [BARREL.x[0], BARREL_OUTLINE.breech],
      [CHAMBER_END, BARREL_OUTLINE.breech],
    ],
    [
      [CHAMBER_END, BORE_RADIUS],
      [throatEnd, BORE_RADIUS],
      [neckEnd, neck],
    ],
    [
      [neckEnd, neck],
      [neckStart, neck],
    ],
    [
      [neckStart, neck],
      [shoulderStart, shoulder],
    ],
    [
      [shoulderStart, shoulder],
      [BARREL.x[0], base],
    ],
    [
      [BARREL.x[0], base],
      [BARREL.x[0], BARREL_OUTLINE.breech],
    ],
  ];
  return turnedPiece({ strands, segments: SEGMENTS.barrel });
}

function barrelPiece(): CutPiece {
  const { breech, shoulderX, taperEndX, middle, gasBlock, front, frontStartX, crown } =
    BARREL_OUTLINE;
  const outer: TurnStrand[] = [
    [
      [CHAMBER_END, breech],
      [shoulderX, breech],
    ],
    [
      [shoulderX, breech],
      [taperEndX, middle],
    ],
    [
      [taperEndX, middle],
      [GAS_BLOCK.x[0], gasBlock],
      [frontStartX, front],
      [MUZZLE - crown, front],
    ],
    [
      [MUZZLE - crown, front],
      [MUZZLE, front - crown],
    ],
    [
      [MUZZLE, front - crown],
      [MUZZLE, BORE_RADIUS],
    ],
  ];
  const boreLine: TurnStrand = [
    [MUZZLE, BORE_RADIUS],
    [CHAMBER_END, BORE_RADIUS],
  ];
  const cap = turnOutline([...outer, boreLine]);
  return turnedPiece({ strands: outer, segments: SEGMENTS.barrel, cap });
}

function borePiece(): CutPiece {
  return turnedPiece({
    strands: [
      [
        [MUZZLE, BORE_RADIUS],
        [RIFLING.x[0], BORE_RADIUS],
      ],
    ],
    segments: SEGMENTS.barrel,
    cap: null,
  });
}

function lipReach(y: number, z: number): number {
  const radius = Math.hypot(y, z);
  if (radius === 0) return 0;
  return (y * COMPENSATOR.lip.y + z * COMPENSATOR.lip.z) / radius;
}

function slantFront(geometry: BufferGeometry): void {
  const position = geometry.getAttribute('position');
  const [start, end] = COMPENSATOR.x;
  const cutStart = end - COMPENSATOR.shortSide;
  for (let vertex = 0; vertex < position.count; vertex += 1) {
    if (position.getX(vertex) < end - 1e-3) continue;
    const reach = (1 + lipReach(position.getY(vertex), position.getZ(vertex))) / 2;
    position.setX(vertex, Math.max(start, cutStart + (end - cutStart) * reach));
  }
  position.needsUpdate = true;
}

function compensatorPiece(): CutPiece {
  const [start, end] = COMPENSATOR.x;
  const { outer, inner } = COMPENSATOR;
  const cutPiece = turnedPiece({
    strands: [
      [
        [start, outer],
        [end, outer],
      ],
      [
        [end, outer],
        [end, inner],
      ],
      [
        [end, inner],
        [start, inner],
      ],
      [
        [start, inner],
        [start, outer],
      ],
    ],
    segments: SEGMENTS.barrel,
  });
  for (const geometry of [cutPiece.whole, cutPiece.half]) {
    slantFront(geometry);
    geometry.computeVertexNormals();
  }
  if (cutPiece.face) slantFront(cutPiece.face);
  return cutPiece;
}

export function addBarrel(context: PartContext, parent: Object3D): void {
  addPiece(context, parent, chamberPiece(), 'chamber', context.looks.blued);
  addPiece(context, parent, barrelPiece(), 'barrel', context.looks.blued);
  addPiece(context, parent, borePiece(), 'rifling', context.looks.steel);
  addPiece(context, parent, compensatorPiece(), 'muzzle', context.looks.blued);
}
