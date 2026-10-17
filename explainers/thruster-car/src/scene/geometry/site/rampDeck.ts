import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';
import { mergeParts } from '../../parts/context';
import type { RampFrame } from './rampFrame';
import { APRON, DECK, RAIL, RIB, ribBack } from './rampSpec';
import { rampStations } from './stations';
import {
  frameCap,
  rampSweep,
  rectLoop,
  sweepCapped,
  sweepLoop,
  sweepStrip,
  sweepTube,
} from './sweep';
import type { CrossPoint, CrossRect, Sweep } from './sweep';

const SIDES = [1, -1] as const;
const XYZ = 3;
const UV = 2;
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
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new Float32BufferAttribute(
      corners.flatMap((corner) => corner.toArray()),
      XYZ,
    ),
  );
  geometry.setAttribute(
    'normal',
    new Float32BufferAttribute(
      corners.flatMap(() => normal.toArray()),
      XYZ,
    ),
  );
  geometry.setAttribute('uv', new Float32BufferAttribute([...uvs], UV));
  geometry.setIndex(QUAD);
  return geometry;
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
  const { frames } = sweep;
  return mergeParts([
    sweepLoop(sweep, [topLeft, bottomLeft, bottomRight, topRight], DECK.plateLength, false),
    frameCap(frames[0], loop, -1),
    frameCap(frames[frames.length - 1], loop, 1),
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
    const angle = (Math.PI * 2 * step) / RAIL.tubeSegments;
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
  const { frames } = sweep;
  const ends = [frames[0], frames[frames.length - 1]] as const;
  const caps = (loop: readonly CrossPoint[]) => [
    frameCap(ends[0], loop, -1),
    frameCap(ends[1], loop, 1),
  ];
  return mergeParts([
    sweepLoop(sweep, [bottomRight, topRight, topLeft, bottomLeft], DECK.plateLength, false),
    sweepTube(sweep, centre, RAIL.tubeRadius, RAIL.tubeSegments, DECK.plateLength),
    ...caps(rectLoop(rect)),
    ...caps(tubeOutline(centre)),
  ]);
}

export function railsGeometry(sweep: Sweep): BufferGeometry {
  return mergeParts(SIDES.map((side) => railGeometry(sweep, side)));
}
