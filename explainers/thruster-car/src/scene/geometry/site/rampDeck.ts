import { Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { FULL_TURN } from '@core/math';
import { mergeParts } from '../../parts/context';
import { arrayGeometry } from './arrays';
import type { RampFrame } from './rampFrame';
import { APRON, DECK, RAIL, RIB, ribBack } from './rampSpec';
import { rampStations } from './stations';
import {
  endCaps,
  rampSweep,
  rectLoop,
  sweepCapped,
  sweepLoop,
  sweepStrip,
  sweepTube,
} from './sweep';
import type { CrossPoint, CrossRect, Sweep } from './sweep';

const SIDES = [1, -1] as const;
const QUAD = [0, 1, 2, 0, 2, 3];

export function deckSweep(): Sweep {
  return rampSweep(DECK.sections);
}

function deckRect(): CrossRect {
  const { halfWidth, thickness } = DECK;
  return { minAcross: -halfWidth, maxAcross: halfWidth, minDepth: -thickness, maxDepth: 0 };
}

function quad(
  corners: readonly Vector3[],
  normal: Vector3,
  uvs: readonly number[],
): BufferGeometry {
  return arrayGeometry(
    {
      position: corners.flatMap((corner) => corner.toArray()),
      normal: corners.flatMap(() => normal.toArray()),
      uv: [...uvs],
    },
    QUAD,
  );
}

function apronUv(x: number, z: number): [number, number] {
  return [(x - APRON.to) / DECK.plateLength, (DECK.halfWidth - z) / (DECK.halfWidth * 2)];
}

export function apronGeometry(): BufferGeometry {
  const { from, to, lift, chamfer } = APRON;
  const half = DECK.halfWidth;
  const ridge = from + chamfer;
  const flat = [
    new Vector3(ridge, lift, half),
    new Vector3(to, lift, half),
    new Vector3(to, lift, -half),
    new Vector3(ridge, lift, -half),
  ];
  const slope = [
    new Vector3(from, 0, half),
    new Vector3(ridge, lift, half),
    new Vector3(ridge, lift, -half),
    new Vector3(from, 0, -half),
  ];
  const uvsOf = (corners: Vector3[]) => corners.flatMap((corner) => apronUv(corner.x, corner.z));
  return mergeParts([
    quad(flat, new Vector3(0, 1, 0), uvsOf(flat)),
    quad(slope, new Vector3(-lift, chamfer, 0).normalize(), uvsOf(slope)),
  ]);
}

export function deckTopGeometry(sweep: Sweep): BufferGeometry {
  const half = DECK.halfWidth;
  return mergeParts([sweepStrip(sweep, [half, 0], [-half, 0], DECK.plateLength), apronGeometry()]);
}

function deckSlabGeometry(sweep: Sweep): BufferGeometry {
  const loop = rectLoop(deckRect());
  const [bottomLeft, bottomRight, topRight, topLeft] = loop;
  return mergeParts([
    sweepLoop(sweep, [topLeft, bottomLeft, bottomRight, topRight], DECK.plateLength, false),
    ...endCaps(sweep, loop),
  ]);
}

export function ribLoop(): CrossPoint[] {
  const reach = DECK.halfWidth - RIB.edgeInset;
  const back = -DECK.thickness;
  return [
    [-reach, ribBack(reach)],
    [-RIB.hubHalfWidth, ribBack(0)],
    [RIB.hubHalfWidth, ribBack(0)],
    [reach, ribBack(reach)],
    [reach, back],
    [-reach, back],
  ];
}

function shifted(frame: RampFrame, distance: number): RampFrame {
  return { ...frame, centre: frame.centre.clone().addScaledVector(frame.tangent, distance) };
}

export function ribGeometry(frame: RampFrame): BufferGeometry {
  const half = RIB.thickness / 2;
  const prism: Sweep = {
    frames: [shifted(frame, -half), shifted(frame, half)],
    arc: [0, RIB.thickness],
  };
  return sweepCapped(prism, ribLoop(), DECK.plateLength);
}

export function deckBodyGeometry(sweep: Sweep): BufferGeometry {
  return mergeParts([deckSlabGeometry(sweep), ...rampStations().map(ribGeometry)]);
}

function kerbRect(side: 1 | -1): CrossRect {
  const outer = side * DECK.halfWidth;
  const inner = side * (DECK.halfWidth - RAIL.thickness);
  return {
    minAcross: Math.min(outer, inner),
    maxAcross: Math.max(outer, inner),
    minDepth: 0,
    maxDepth: RAIL.height,
  };
}

function tubeOutline(centre: CrossPoint): CrossPoint[] {
  return Array.from({ length: RAIL.tubeSegments }, (_, step) => {
    const angle = (FULL_TURN * step) / RAIL.tubeSegments;
    return [
      centre[0] + Math.cos(angle) * RAIL.tubeRadius,
      centre[1] + Math.sin(angle) * RAIL.tubeRadius,
    ];
  });
}

function railGeometry(sweep: Sweep, side: 1 | -1): BufferGeometry {
  const rect = kerbRect(side);
  const [bottomLeft, bottomRight, topRight, topLeft] = rectLoop(rect);
  const centre: CrossPoint = [(rect.minAcross + rect.maxAcross) / 2, RAIL.height + RAIL.tubeRadius];
  return mergeParts([
    sweepLoop(sweep, [bottomRight, topRight, topLeft, bottomLeft], DECK.plateLength, false),
    sweepTube(sweep, centre, RAIL.tubeRadius, RAIL.tubeSegments, DECK.plateLength),
    ...endCaps(sweep, rectLoop(rect)),
    ...endCaps(sweep, tubeOutline(centre)),
  ]);
}

export function railsGeometry(sweep: Sweep): BufferGeometry {
  return mergeParts(SIDES.map((side) => railGeometry(sweep, side)));
}
