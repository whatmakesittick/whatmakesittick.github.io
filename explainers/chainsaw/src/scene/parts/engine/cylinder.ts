import type { BufferGeometry, MeshStandardMaterial, Object3D } from 'three';
import { box } from '@core/scene/geometry/box';
import type { PortId } from '../../../ids';
import { CROWN_BOTTOM_Y, PORT_WINDOWS } from '../../../model';
import { CYLINDER, DUCTS } from '../../constants';
import { FINISHES } from '../../finishes';
import { mergeParts } from '../../geometry/merge';
import { sector } from '../../geometry/sector';
import { addPart, label, namedGroup } from '../context';
import type { PartContext } from '../context';
import { HALF_IDS, HALVES, WINDOWS, angularRanges, intersect, openRanges } from './windows';
import type { AngleRange, HalfId, PortWindow } from './windows';

const OUTER = CYLINDER.bore + CYLINDER.wall;
const PORT_PART: Readonly<Record<PortId, 'exhaustPort' | 'transferPorts' | 'intakePort'>> = {
  exhaust: 'exhaustPort',
  transfer: 'transferPorts',
  intake: 'intakePort',
};
const RIM_FINISH = { exhaust: 'exhaustRim', transfer: 'transferRim', intake: 'intakeRim' } as const;
const FIN_EXHAUST_CLEAR_DEG = 24;
const FIN_EXHAUST_TOP = 0.194;
const FIN_TRANSFER_TOP = PORT_WINDOWS.transfer.top + 0.004;
const DEGREES_PER_RADIAN = 180 / Math.PI;

export interface CylinderParts {
  readonly halves: Readonly<Record<HalfId, Object3D>>;
  readonly rims: Readonly<Record<PortId, MeshStandardMaterial>>;
}

function bandBreaks(): number[] {
  const edges = WINDOWS.flatMap((window) => [window.bottom, window.top]);
  return [...new Set([CYLINDER.base, ...edges, CYLINDER.headInner])].sort((a, b) => a - b);
}

function wallBand(half: readonly [number, number], bottom: number, top: number): BufferGeometry[] {
  const cuts = WINDOWS.filter((window) => window.bottom <= bottom && window.top >= top).flatMap(
    (window) => angularRanges(window.centreDeg, window.halfDeg),
  );
  return openRanges(half, cuts).map(([fromDeg, toDeg]) =>
    sector({ inner: CYLINDER.bore, outer: OUTER, bottom, top, fromDeg, toDeg }),
  );
}

function finCuts(y: number): AngleRange[] {
  const cuts: AngleRange[] = [];
  if (y < FIN_EXHAUST_TOP) cuts.push(...angularRanges(0, FIN_EXHAUST_CLEAR_DEG));
  if (y < FIN_TRANSFER_TOP)
    WINDOWS.filter((window) => window.port === 'transfer').forEach((window) =>
      cuts.push(...angularRanges(window.centreDeg, window.halfDeg)),
    );
  return cuts;
}

function fins(half: AngleRange): BufferGeometry[] {
  const pitch = (CYLINDER.finTo - CYLINDER.finFrom) / (CYLINDER.finCount - 1);
  return Array.from({ length: CYLINDER.finCount }, (_, index) => {
    const y = CYLINDER.finFrom + index * pitch;
    return openRanges(half, finCuts(y)).map(([fromDeg, toDeg]) =>
      sector({
        inner: OUTER - 0.0005,
        outer: CYLINDER.finOuter,
        bottom: y - CYLINDER.finThickness / 2,
        top: y + CYLINDER.finThickness / 2,
        fromDeg,
        toDeg,
      }),
    );
  }).flat();
}

function cylinderHalf(half: AngleRange): BufferGeometry {
  const breaks = bandBreaks();
  const bands = breaks
    .slice(0, -1)
    .flatMap((bottom, index) => wallBand(half, bottom, breaks[index + 1]));
  const head = sector({
    inner: 0,
    outer: OUTER + 0.002,
    bottom: CYLINDER.headInner,
    top: CYLINDER.headTop,
    fromDeg: half[0],
    toDeg: half[1],
  });
  return mergeParts([...bands, ...fins(half), head]);
}

function rimStrips(window: PortWindow, range: AngleRange): BufferGeometry[] {
  const inner = CYLINDER.bore - CYLINDER.rimDepth;
  const edgeDeg = (CYLINDER.rimWidth / CYLINDER.bore) * DEGREES_PER_RADIAN;
  const strip = (bottom: number, top: number, fromDeg: number, toDeg: number) =>
    sector({ inner, outer: OUTER + 0.0003, bottom, top, fromDeg, toDeg });
  const strips = [
    strip(window.top - CYLINDER.rimWidth, window.top, range[0], range[1]),
    strip(window.bottom, window.bottom + CYLINDER.rimWidth, range[0], range[1]),
  ];
  const [from, to] = [window.centreDeg - window.halfDeg, window.centreDeg + window.halfDeg];
  [from, to - edgeDeg].forEach((edge) => {
    angularRanges(edge + edgeDeg / 2, edgeDeg / 2).forEach((edgeRange) => {
      const inside = intersect(edgeRange, range);
      if (inside) strips.push(strip(window.bottom, window.top, inside[0], inside[1]));
    });
  });
  return strips;
}

function rimsFor(half: AngleRange, port: PortId): BufferGeometry | null {
  const strips = WINDOWS.filter((window) => window.port === port).flatMap((window) =>
    angularRanges(window.centreDeg, window.halfDeg)
      .map((range) => intersect(range, half))
      .filter((range): range is AngleRange => range !== null)
      .flatMap((range) => rimStrips(window, range)),
  );
  return strips.length > 0 ? mergeParts(strips) : null;
}

function exhaustDuct(half: HalfId): BufferGeometry {
  const { exhaustReach, exhaustHalfWidth, wall } = DUCTS;
  const top = PORT_WINDOWS.exhaust.top;
  const bottom = CROWN_BOTTOM_Y;
  const sign = half === 'back' ? -1 : 1;
  const zIn = 0;
  const zOut = sign * (exhaustHalfWidth + wall);
  const [minZ, maxZ] = [Math.min(zIn, zOut), Math.max(zIn, zOut)];
  const minX = OUTER - 0.001;
  const plate = (minY: number, maxY: number) =>
    box({ minX, maxX: exhaustReach, minY, maxY, minZ, maxZ });
  const side = box({
    minX,
    maxX: exhaustReach,
    minY: bottom - wall,
    maxY: top + wall,
    minZ: sign < 0 ? minZ : maxZ - wall,
    maxZ: sign < 0 ? minZ + wall : maxZ,
  });
  return mergeParts([plate(top, top + wall), plate(bottom - wall, bottom), side]);
}

function transferDuct(half: HalfId): BufferGeometry {
  const sign = half === 'back' ? -1 : 1;
  const near = sign * (CYLINDER.bore - 0.0005);
  const far = sign * DUCTS.transferOuter;
  return box({
    minX: -DUCTS.transferHalfWidth,
    maxX: DUCTS.transferHalfWidth,
    minY: DUCTS.transferBottom,
    maxY: PORT_WINDOWS.transfer.top + 0.001,
    minZ: Math.min(near, far),
    maxZ: Math.max(near, far),
  });
}

function windowMiddle(port: PortId): number {
  const window = WINDOWS.find((candidate) => candidate.port === port);
  return window ? (window.bottom + window.top) / 2 : CYLINDER.base;
}

export function buildCylinder(context: PartContext, parent: Object3D): CylinderParts {
  const halves = {
    back: namedGroup('cylinderBack', parent),
    front: namedGroup('cylinderFront', parent),
  };
  HALF_IDS.forEach((id) => {
    const half = HALVES[id];
    addPart(context, halves[id], cylinderHalf(half), 'cylinder');
    (Object.keys(PORT_PART) as PortId[]).forEach((port) => {
      const rims = rimsFor(half, port);
      if (rims) addPart(context, halves[id], rims, PORT_PART[port], RIM_FINISH[port]);
    });
    addPart(context, halves[id], exhaustDuct(id), 'exhaustPort', 'castAlloy');
    addPart(context, halves[id], transferDuct(id), 'transferPorts', 'duct');
  });
  label(context, 'cylinder', halves.back, [-0.031, 0.212, -0.031]);
  label(context, 'exhaustPort', halves.back, [
    CYLINDER.bore + 0.002,
    windowMiddle('exhaust'),
    -0.004,
  ]);
  label(context, 'transferPorts', halves.back, [
    0,
    windowMiddle('transfer'),
    -CYLINDER.bore - 0.002,
  ]);
  label(context, 'intakePort', halves.back, [
    -CYLINDER.bore - 0.002,
    windowMiddle('intake'),
    -0.004,
  ]);
  const rims = {
    exhaust: context.materials.get('exhaustPort', FINISHES.exhaustRim),
    transfer: context.materials.get('transferPorts', FINISHES.transferRim),
    intake: context.materials.get('intakePort', FINISHES.intakeRim),
  };
  return { halves, rims };
}
