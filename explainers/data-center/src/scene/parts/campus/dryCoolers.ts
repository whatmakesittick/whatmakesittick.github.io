import { BoxGeometry, CanvasTexture, CylinderGeometry, DoubleSide, Matrix4 } from 'three';
import { Quaternion, RepeatWrapping, SRGBColorSpace, Vector3 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FULL_TURN } from '@core/math';
import { createMaterial } from '@core/scene/materials';
import type { Point } from '../../../ids';
import { DRY_COOLER, DRY_COOLERS, ROOF_PIPE_Y } from '../../../model';
import { FINISHES } from '../../finishes';
import { boundInstances, registeredMaterial } from '../context';
import type { PartContext } from '../context';
import { PIPE_R, SIDES, at, drawer, mirror, rod } from './pipeKit';
import type { Draw, Span } from './pipeKit';

export interface CoilUnit {
  readonly length: number;
  readonly edge: number;
  readonly coilFrom: number;
  readonly apexHalf: number;
  readonly deckY: number;
  readonly fans: readonly [columns: number, rows: number, scale: number];
  readonly ends: readonly number[];
}

export type FanSet = ReturnType<typeof buildCoilUnits>;

export const DECK_M = 0.1;
export const SHROUD_M = 0.25;
const COIL = { thick: 0.1, inset: 0.06, gap: 0.1, drop: 0.08, plate: 0.04 } as const;
const FIN = { px: 64, tileM: 0.5, pitch: 4, tubes: 16, line: 2 } as const;
const FIN_INK = ['#d3d8dc', '#8d949a', '#f0f2f4'] as const;
const SHROUD = { top: 0.54, bottom: 0.5, sides: 28 } as const;
const SHROUD_FINISH = { ...FINISHES.steelLight, side: DoubleSide } as const;
const BLADE = { count: 5, root: 0.07, tip: 0.47, chord: 0.14, thick: 0.012, pitch: 0.42 } as const;
const HUB = { radius: 0.08, height: 0.07, sides: 12, lift: 0.12 } as const;
const FAN_PHASE_STEP = 0.73;
const UP = new Vector3(0, 1, 0);
const ACROSS = new Vector3(1, 0, 0);
const spinMatrix = new Matrix4();
const spinTurn = new Quaternion();

const HALF = DRY_COOLER.width / 2;
const EDGE = DRY_COOLER.depth / 2;
const DECK_Y = DRY_COOLER.height - SHROUD_M - DECK_M;
const COOLER: CoilUnit = {
  length: DRY_COOLER.width,
  edge: EDGE,
  coilFrom: 0.66,
  apexHalf: 0.4,
  deckY: DECK_Y,
  fans: [3, 2, 1.08],
  ends: SIDES,
};
const FRAME: readonly Span[] = [
  ...mirror([HALF + 0.025, HALF - 0.075, 0, DECK_Y, EDGE + 0.025, EDGE - 0.075], SIDES, SIDES),
  ...mirror([0.075 - HALF, HALF - 0.075, 0.18, 0.3, EDGE - 0.01, EDGE - 0.09], [1], SIDES),
  ...mirror([HALF - 0.02, HALF - 0.08, 0.18, 0.3, 0.075 - EDGE, EDGE - 0.075], SIDES),
  ...mirror([HALF - 0.02, HALF - 0.08, 0.3, 0.42, -0.05, 0.05], SIDES),
];

function finMaterial({ context, group }: Draw, length: number, slant: number) {
  const canvas = document.createElement('canvas');
  [canvas.width, canvas.height] = [FIN.px, FIN.px];
  const paint = canvas.getContext('2d');
  const stripe = (ink: number, x: number, y: number, width: number, height: number) => {
    if (!paint) return;
    paint.fillStyle = FIN_INK[ink];
    paint.fillRect(x, y, width, height);
  };
  stripe(0, 0, 0, FIN.px, FIN.px);
  for (let step = 0; step < FIN.px; step += FIN.pitch) {
    stripe(1, step, 0, FIN.pitch / 2, FIN.px);
    if (step % FIN.tubes === 0) stripe(2, 0, step + FIN.tubes / 2, FIN.px, FIN.line);
  }
  const map = context.tracker.track(new CanvasTexture(canvas));
  [map.wrapS, map.wrapT, map.colorSpace] = [RepeatWrapping, RepeatWrapping, SRGBColorSpace];
  map.repeat.set(length / FIN.tileM, slant / FIN.tileM);
  return registeredMaterial(context, group, createMaterial({ ...FINISHES.coil, map }));
}

function rotorGeometry(): BufferGeometry {
  const span = BLADE.tip - BLADE.root;
  const parts: BufferGeometry[] = Array.from({ length: BLADE.count }, (_, index) =>
    new BoxGeometry(span, BLADE.thick, BLADE.chord)
      .rotateX(BLADE.pitch)
      .translate(BLADE.root + span / 2, 0, 0)
      .rotateY((index * FULL_TURN) / BLADE.count),
  );
  parts.push(new CylinderGeometry(HUB.radius, HUB.radius, HUB.height, HUB.sides));
  const rotor = mergeGeometries(parts).translate(0, HUB.lift, 0);
  parts.forEach((part) => part.dispose());
  return rotor;
}

export function spinFans({ blades, hubs, scale }: FanSet, angle: number): void {
  hubs.forEach((hub, index) => {
    spinTurn.setFromAxisAngle(UP, angle + index * FAN_PHASE_STEP);
    blades.setMatrixAt(index, spinMatrix.compose(hub, spinTurn, scale));
  });
  boundInstances(blades);
}

export function buildCoilUnits(
  draw: Draw,
  unit: CoilUnit,
  bases: readonly Point[],
  frame: readonly Span[] = [],
) {
  const { length, edge, coilFrom, apexHalf, deckY, fans } = unit;
  const [coilTo, reach] = [deckY - COIL.gap, edge - COIL.inset - apexHalf];
  const tilt = Math.atan2(reach, coilTo - coilFrom);
  const faces = bases.flatMap(([x, y, z]) =>
    SIDES.map((side) =>
      new Matrix4().compose(
        new Vector3(x, y + (coilFrom + coilTo) / 2, z + side * (apexHalf + reach / 2)),
        new Quaternion().setFromAxisAngle(ACROSS, side * tilt),
        new Vector3(1, 1, 1),
      ),
    ),
  );
  const [coilLength, slant] = [length - 2 * COIL.plate, Math.hypot(reach, coilTo - coilFrom)];
  const coil = new BoxGeometry(coilLength, slant, COIL.thick);
  draw.mesh(coil, finMaterial(draw, coilLength, slant), faces);
  const [columns, rows, size] = fans;
  const hubs = bases.flatMap(([x, y, z]) =>
    Array.from({ length: columns * rows }, (_, index) => {
      const along = (((index % columns) + 0.5) / columns - 0.5) * length;
      const across = ((Math.floor(index / columns) + 0.5) / rows - 0.5) * 2 * edge;
      return new Vector3(x + along, y + deckY + DECK_M, z + across);
    }),
  );
  const scale = new Vector3().setScalar(size);
  const homes = hubs.map((hub) => new Matrix4().compose(hub, new Quaternion(), scale));
  const shroud = new CylinderGeometry(SHROUD.top, SHROUD.bottom, SHROUD_M, SHROUD.sides, 1, true);
  draw.mesh(shroud.translate(0, SHROUD_M / 2, 0), draw.look(SHROUD_FINISH), homes);
  const blades = draw.mesh(rotorGeometry(), draw.look('fan'), homes);
  const [half, inner] = [length / 2, length / 2 - COIL.plate];
  const spans: Span[] = [
    [-half, half, deckY, deckY + DECK_M, -edge, edge],
    ...mirror([-inner, inner, coilTo - COIL.drop, deckY, edge, edge - COIL.plate], [1], SIDES),
    ...frame,
  ];
  const placed = (list: readonly Span[]) =>
    bases.flatMap((base) => list.map((span) => at(base, span)));
  draw.boxes('steel', placed(spans));
  const bottom = coilFrom - COIL.drop;
  draw.boxes(
    'steelLight',
    placed(unit.ends.map((side): Span => [side * half, side * inner, bottom, deckY, -edge, edge])),
  );
  return { blades, hubs, scale };
}

export function buildDryCoolers(context: PartContext, group: Object3D): FanSet {
  const draw = drawer(context, 'dryCoolers', group);
  const bases = DRY_COOLERS.map(({ base }) => base);
  const fans = buildCoilUnits(draw, COOLER, bases, FRAME);
  const [y, reach] = [ROOF_PIPE_Y, HALF - COIL.plate / 2];
  draw.rods(
    'steel',
    bases.map(([x, , z]) => rod([x - reach, y, z], [x + reach, y, z], PIPE_R)),
  );
  return fans;
}
