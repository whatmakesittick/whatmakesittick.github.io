import { toRadians } from '@core/math';
import { DRAW_DEG, IMPULSE_DEG, PALLET_SPAN_DEG } from '../../../model/escapement';
import { BALANCE, BANKING_PINS, DIRECTIONS_DEG, LEVER, PALLET_STAFF } from '../../../model/layout';
import { BANKING_PIN, ESCAPE_TOOTH, FORK, IMPULSE_JEWEL, PALLETS, SEGMENTS } from '../../constants';
import type { Vec2 } from '../../geometry/outline';
import {
  angleOf,
  arcPoints,
  counterClockwise,
  polar,
  polarDeg,
  rotateAbout,
  roundCorners,
} from '../../geometry/outline';

export type StoneId = 'entry' | 'exit';

export interface StoneLayout {
  readonly corners: readonly Vec2[];
  readonly lockingCorner: Vec2;
  readonly letOffCorner: Vec2;
  readonly face: Vec2;
}

const STAFF: Vec2 = { x: 0, y: 0 };
const ESCAPE: Vec2 = { x: -LEVER.palletStaffFromEscapeMm, y: 0 };
export const BALANCE_IN_FORK: Vec2 = {
  x: LEVER.balanceFromEscapeMm - LEVER.palletStaffFromEscapeMm,
  y: 0,
};
export const LEVER_LINE = toRadians(DIRECTIONS_DEG.leverLine);
const HALF_SPAN = PALLET_SPAN_DEG / 2;
const BANKING_DEG = 5;
const LEVER_FILLET = 0.08;
const FILLET_TURN_DEG = 25;

function fromWorld(point: Vec2): Vec2 {
  const shifted = { x: point.x - PALLET_STAFF.x, y: point.y - PALLET_STAFF.y };
  return rotateAbout(shifted, STAFF, -LEVER_LINE);
}

function neutral(point: Vec2, forkDeg: number): Vec2 {
  return rotateAbout(point, STAFF, -toRadians(forkDeg));
}

function onWheel(radius: number, frameDeg: number): Vec2 {
  return polarDeg(ESCAPE, radius, frameDeg);
}

interface StoneTiming {
  readonly atDeg: number;
  readonly unlockForkDeg: number;
  readonly impulseEndForkDeg: number;
  readonly drawSign: number;
}

const TIMING: Readonly<Record<StoneId, StoneTiming>> = {
  exit: {
    atDeg: -HALF_SPAN,
    unlockForkDeg: -PALLETS.unlockForkDeg,
    impulseEndForkDeg: PALLETS.impulseEndForkDeg,
    drawSign: -1,
  },
  entry: {
    atDeg: HALF_SPAN,
    unlockForkDeg: PALLETS.unlockForkDeg,
    impulseEndForkDeg: -PALLETS.impulseEndForkDeg,
    drawSign: -1,
  },
};

export function stoneLayout(id: StoneId): StoneLayout {
  const timing = TIMING[id];
  const heelRadius = ESCAPE_TOOTH.tipRadius - PALLETS.heelDrop;
  const heelDeg = timing.atDeg - IMPULSE_DEG + ESCAPE_TOOTH.clubDeg;
  const lockingCorner = neutral(
    onWheel(ESCAPE_TOOTH.tipRadius, timing.atDeg),
    timing.unlockForkDeg,
  );
  const letOffCorner = neutral(onWheel(heelRadius, heelDeg), timing.impulseEndForkDeg);
  const radial = angleOf(ESCAPE, lockingCorner);
  const faceAngle = radial + timing.drawSign * toRadians(DRAW_DEG);
  const face = { x: Math.cos(faceAngle), y: Math.sin(faceAngle) };
  const outward = (point: Vec2) => ({
    x: point.x + face.x * PALLETS.stoneLength,
    y: point.y + face.y * PALLETS.stoneLength,
  });
  return {
    corners: counterClockwise([
      lockingCorner,
      letOffCorner,
      outward(letOffCorner),
      outward(lockingCorner),
    ]),
    lockingCorner,
    letOffCorner,
    face,
  };
}

export function restingToothDeg(): number {
  const stone = stoneLayout('exit');
  const turn = toRadians(-BANKING_DEG);
  const corner = rotateAbout(stone.lockingCorner, STAFF, turn);
  const face = rotateAbout(stone.face, { x: 0, y: 0 }, turn);
  const relative = { x: corner.x - ESCAPE.x, y: corner.y - ESCAPE.y };
  const b = relative.x * face.x + relative.y * face.y;
  const c = relative.x * relative.x + relative.y * relative.y - ESCAPE_TOOTH.tipRadius ** 2;
  const reach = -b + Math.sqrt(Math.max(0, b * b - c));
  const contact = { x: corner.x + face.x * reach, y: corner.y + face.y * reach };
  const frameDeg = (angleOf(ESCAPE, contact) * 180) / Math.PI;
  return frameDeg + DIRECTIONS_DEG.leverLine;
}

export function jewelInFork(balanceDeg: number, forkDeg: number): Vec2 {
  const angle = toRadians(IMPULSE_JEWEL.restDeg - DIRECTIONS_DEG.leverLine + balanceDeg);
  const world = polar(BALANCE_IN_FORK, BALANCE.impulseJewelRadiusMm, angle);
  return rotateAbout(world, STAFF, -toRadians(forkDeg));
}

export function bankingPinsInFork(): readonly Vec2[] {
  return BANKING_PINS.map(fromWorld);
}

function bankingHalfWidth(): number {
  const pin = bankingPinsInFork()[1];
  const seen = rotateAbout(pin, STAFF, toRadians(BANKING_DEG));
  return Math.abs(seen.y) - BANKING_PIN.radius;
}

function hornReach(side: number): (v: number) => number {
  const turned = rotateAbout(BALANCE_IN_FORK, STAFF, toRadians(-side * BANKING_DEG));
  const clear = BALANCE.impulseJewelRadiusMm + IMPULSE_JEWEL.radius + FORK.jewelClearance;
  return (v) => turned.x - Math.sqrt(Math.max(0, clear * clear - (v - turned.y) ** 2));
}

function hornEdge(side: number): Vec2[] {
  const reach = hornReach(side);
  return Array.from({ length: FORK.hornSamples + 1 }, (_, index) => {
    const v =
      FORK.slotHalfWidth + ((FORK.hornHalfWidth - FORK.slotHalfWidth) * index) / FORK.hornSamples;
    return { x: reach(side * v), y: side * v };
  });
}

export function slotBottom(): number {
  return (
    BALANCE_IN_FORK.x - BALANCE.impulseJewelRadiusMm - IMPULSE_JEWEL.radius - FORK.jewelClearance
  );
}

export function forkOutline(): Vec2[] {
  const bank = LEVER.bankingPinsFromStaffMm;
  const earHalf = bankingHalfWidth();
  const { neckHalfWidth: neck, shoulderHalfWidth: shoulder, bankingHalfLength: ear } = FORK;
  const bottom = slotBottom();
  const hornBase = bottom - FORK.slotHalfWidth;
  const upper = hornEdge(1);
  const lower = hornEdge(-1);
  const boss = arcPoints(STAFF, FORK.bossRadius, Math.PI / 2, (Math.PI * 3) / 2, SEGMENTS.hub / 2);
  const outline = [
    ...boss,
    { x: FORK.bossRadius, y: -neck },
    { x: bank - ear * 2, y: -neck },
    { x: bank - ear, y: -earHalf },
    { x: bank + ear, y: -earHalf },
    { x: bank + ear * 2, y: -shoulder },
    { x: hornBase, y: -FORK.hornHalfWidth },
    ...[...lower].reverse(),
    { x: bottom, y: -FORK.slotHalfWidth },
    { x: bottom, y: FORK.slotHalfWidth },
    ...upper,
    { x: hornBase, y: FORK.hornHalfWidth },
    { x: bank + ear * 2, y: shoulder },
    { x: bank + ear, y: earHalf },
    { x: bank - ear, y: earHalf },
    { x: bank - ear * 2, y: neck },
    { x: FORK.bossRadius, y: neck },
  ];
  return roundCorners(outline, LEVER_FILLET, FILLET_TURN_DEG, SEGMENTS.fillet);
}

export function guardPinTip(): Vec2 {
  return { x: BALANCE_IN_FORK.x - FORK.guardPin.tipFromBalance, y: 0 };
}

export function stoneOuterCentre(id: StoneId): Vec2 {
  const [, , third, fourth] = stoneLayout(id).corners;
  return { x: (third.x + fourth.x) / 2, y: (third.y + fourth.y) / 2 };
}
