import type { Object3D } from 'three';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { BARREL, BORE, GAS_BLOCK, RIFLING } from '../../model/layout';
import {
  BARREL_OUTLINE,
  BORE_RADIUS,
  CHAMBER_BORE,
  COMPENSATOR,
  RIFLING_LANDS,
  SEGMENTS,
} from '../constants';
import { FINISHES } from '../finishes';
import { turnedPiece } from '../geometry/pieces';
import type { CutPiece } from '../geometry/pieces';
import { turnOutline } from '../geometry/turned';
import type { TurnStrand } from '../geometry/turned';
import { addPiece, partMesh } from './context';
import type { PartContext } from './context';

const CHAMBER_END = CHAMBER_BORE.leadeEnd;
const FULL_TURN = Math.PI * 2;
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

function landAngle(x: number, land: number): number {
  return (land / BORE.grooves) * FULL_TURN + (FULL_TURN * (x - RIFLING.x[0])) / BORE.twist;
}

function onKeptSide(angle: number): boolean {
  return Math.sin(angle) <= 0;
}

function boreSurfacePoint(x: number, angle: number, offset: number): number[] {
  const radius = BORE_RADIUS - RIFLING_LANDS.lift;
  const turn = angle + offset / radius;
  return [x, radius * Math.cos(turn), radius * Math.sin(turn)];
}

function riflingLands(): BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const half = RIFLING_LANDS.width / 2;
  for (let land = 0; land < BORE.grooves; land += 1) {
    for (let x = RIFLING.x[0]; x < RIFLING.x[1]; x += RIFLING_LANDS.step) {
      const next = Math.min(x + RIFLING_LANDS.step, RIFLING.x[1]);
      const from = landAngle(x, land);
      const to = landAngle(next, land);
      if (!onKeptSide(from) || !onKeptSide(to)) continue;
      const a = boreSurfacePoint(x, from, -half);
      const b = boreSurfacePoint(x, from, half);
      const c = boreSurfacePoint(next, to, half);
      const d = boreSurfacePoint(next, to, -half);
      positions.push(...a, ...c, ...b, ...a, ...d, ...c);
      for (const angle of [from, to, from, from, to, to]) {
        normals.push(0, -Math.cos(angle), -Math.sin(angle));
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  return geometry;
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
  addPiece(context, parent, borePiece(), 'rifling', context.looks.blued);
  parent.add(context.cutaway.opened(partMesh(context, riflingLands(), 'rifling', FINISHES.steel)));
  addPiece(context, parent, compensatorPiece(), 'muzzle', context.looks.blued);
}
