import type { ChamberId } from '../../ids';
import { CHAMBERS } from '../../model';
import type { Blob, CavityPiece, CoronarySpec, VesselSpec } from '../constants';
import { hugSurface, surfaceCurve } from './surfacePath';
import {
  blend,
  capsule,
  carve,
  cylinder,
  ellipsoid,
  expandBox,
  roundCone,
  squashed,
  union,
} from './field';
import type { Field } from './field';
import type { Bounds } from './grid';
import { portalAt, routeField } from './vesselPath';
import type { Portal } from './vesselPath';

export type HeartSide = 'right' | 'left';

export const SIDE_CHAMBERS: Readonly<Record<HeartSide, readonly [ChamberId, ChamberId]>> = {
  right: ['rightAtrium', 'rightVentricle'],
  left: ['leftAtrium', 'leftVentricle'],
};

export interface ShapeSpec {
  readonly pieces: readonly CavityPiece[];
  readonly extras: readonly Blob[];
  readonly vessels: readonly VesselSpec[];
  readonly cavitySmoothness: number;
  readonly envelopeSmoothness: number;
  readonly collarSmoothness: number;
  readonly coronaries: readonly CoronarySpec[];
  readonly groove: {
    readonly radiusMm: number;
    readonly liftMm: number;
    readonly smoothness: number;
    readonly sampleMm: number;
  };
  readonly carveSmoothness: number;
  readonly vesselWall: number;
  readonly seam: number;
  readonly collarBeyond: number;
  readonly atrialCarve: number;
}

export interface HeartShapes {
  readonly envelope: Field;
  readonly envelopeBounds: Bounds;
  readonly sides: Readonly<Record<HeartSide, Field>>;
  readonly sideBounds: Readonly<Record<HeartSide, Bounds>>;
  readonly chambers: Readonly<Record<ChamberId, Field>>;
  readonly portals: readonly Portal[];
  readonly sidePortals: Readonly<Record<HeartSide, readonly Portal[]>>;
}

export function blobField(blob: Blob): Field {
  if (blob.kind === 'ellipsoid') return ellipsoid(blob.centre, blob.radii, blob.axis);
  if (blob.kind === 'cylinder') return cylinder(blob.from, blob.to, blob.radius);
  const cone = roundCone(blob.from, blob.to, blob.fromRadius, blob.toRadius);
  return blob.squash ? squashed(cone, blob.squash) : cone;
}

export function inflated(field: Field, wall: number): Field {
  return {
    centre: field.centre,
    reach: field.reach + wall,
    box: expandBox(field.box, wall),
    distance: (x, y, z) => field.distance(x, y, z) - wall,
  };
}

export function wallOf(piece: CavityPiece): number {
  return piece.wall ?? CHAMBERS[piece.chamber].wall;
}

function fieldBounds(field: Field, margin: number): Bounds {
  const reach = field.reach + margin;
  const [x, y, z] = field.centre;
  return { min: [x - reach, y - reach, z - reach], max: [x + reach, y + reach, z + reach] };
}

export function blobBounds(blob: Blob, margin = 0): Bounds {
  if (blob.kind !== 'cone') return fieldBounds(blobField(blob), margin);
  const scale = blob.squash ?? [1, 1, 1];
  const reach = Math.max(blob.fromRadius, blob.toRadius) + margin;
  const axis = (index: number): [number, number] => [
    Math.min(blob.from[index], blob.to[index]) - reach * scale[index],
    Math.max(blob.from[index], blob.to[index]) + reach * scale[index],
  ];
  const [x, y, z] = [axis(0), axis(1), axis(2)];
  return { min: [x[0], y[0], z[0]], max: [x[1], y[1], z[1]] };
}

export function unionBounds(all: readonly Bounds[]): Bounds {
  const min = [0, 1, 2].map((axis) => Math.min(...all.map((bounds) => bounds.min[axis])));
  const max = [0, 1, 2].map((axis) => Math.max(...all.map((bounds) => bounds.max[axis])));
  return { min: [min[0], min[1], min[2]], max: [max[0], max[1], max[2]] };
}

function reachOf(vessel: VesselSpec, spec: ShapeSpec): number {
  return (vessel.portalMm ?? 0) + spec.collarBeyond;
}

function vesselField(vessel: VesselSpec, spec: ShapeSpec, inset: number): Field {
  return routeField(vessel.route, reachOf(vessel, spec), inset);
}

function channels(spec: ShapeSpec, chamber: ChamberId): Field[] {
  return spec.vessels
    .filter((vessel) => vessel.chamber === chamber && vessel.portalMm !== undefined)
    .map((vessel) => vesselField(vessel, spec, spec.vesselWall - spec.seam));
}

function carvers(spec: ShapeSpec, chamber: ChamberId): Field[] {
  return spec.vessels
    .filter((vessel) => vessel.carves?.includes(chamber))
    .map((vessel) => vesselField(vessel, spec, -spec.atrialCarve));
}

function collars(spec: ShapeSpec): Field[] {
  return spec.vessels
    .filter((vessel) => vessel.portalMm !== undefined)
    .map((vessel) => vesselField(vessel, spec, spec.seam));
}

export function chamberField(spec: ShapeSpec, chamber: ChamberId): Field {
  const pieces = spec.pieces
    .filter((piece) => piece.chamber === chamber)
    .map((piece) => blobField(piece.blob));
  const inlets = channels(spec, chamber);
  const chamberBody = blend(pieces, spec.cavitySmoothness);
  const body = inlets.length
    ? blend([chamberBody, union(inlets)], spec.carveSmoothness)
    : chamberBody;
  const tools = carvers(spec, chamber);
  return tools.length ? carve(body, tools, spec.carveSmoothness) : body;
}

function grooveTools(heart: Field, spec: ShapeSpec): Field[] {
  const { radiusMm, liftMm, sampleMm } = spec.groove;
  return spec.coronaries
    .filter((coronary) => coronary.groove)
    .flatMap((coronary) => {
      const curve = surfaceCurve(heart, coronary.marks);
      const count = Math.max(1, Math.ceil(curve.getLength() / sampleMm));
      const points = hugSurface(heart, curve, () => liftMm).filter(
        (_, index, all) => index % Math.max(1, Math.floor(all.length / count)) === 0,
      );
      return [
        union(
          points.slice(1).map((point, index) => {
            const previous = points[index];
            return capsule(
              [previous.x, previous.y, previous.z],
              [point.x, point.y, point.z],
              radiusMm,
            );
          }),
        ),
      ];
    });
}

export function envelopeField(spec: ShapeSpec): Field {
  const body = blend(
    [
      ...spec.pieces.map((piece) => inflated(blobField(piece.blob), wallOf(piece))),
      ...spec.extras.map(blobField),
    ],
    spec.envelopeSmoothness,
  );
  const heart = carve(body, grooveTools(body, spec), spec.groove.smoothness);
  return blend([heart, union(collars(spec))], spec.collarSmoothness);
}

function boundsOfFields(fields: readonly Field[], margin: number): Bounds {
  return unionBounds(fields.map((field) => fieldBounds(field, margin)));
}

function sideBounds(spec: ShapeSpec, side: HeartSide): Bounds {
  const chambers = SIDE_CHAMBERS[side];
  return unionBounds([
    ...spec.pieces
      .filter((piece) => chambers.includes(piece.chamber))
      .map((piece) => blobBounds(piece.blob)),
    ...chambers.flatMap((chamber) => channels(spec, chamber)).map((field) => fieldBounds(field, 0)),
  ]);
}

export function heartShapes(spec: ShapeSpec): HeartShapes {
  const chamberFields = {
    rightAtrium: chamberField(spec, 'rightAtrium'),
    rightVentricle: chamberField(spec, 'rightVentricle'),
    leftAtrium: chamberField(spec, 'leftAtrium'),
    leftVentricle: chamberField(spec, 'leftVentricle'),
  };
  const side = (id: HeartSide) => union(SIDE_CHAMBERS[id].map((chamber) => chamberFields[chamber]));
  return {
    envelope: envelopeField(spec),
    envelopeBounds: unionBounds([
      ...spec.pieces.map((piece) =>
        blobBounds(piece.blob, wallOf(piece) + spec.envelopeSmoothness),
      ),
      ...spec.extras.map((blob) => blobBounds(blob, spec.envelopeSmoothness)),
      boundsOfFields(collars(spec), spec.envelopeSmoothness),
    ]),
    sides: { right: side('right'), left: side('left') },
    sideBounds: { right: sideBounds(spec, 'right'), left: sideBounds(spec, 'left') },
    chambers: chamberFields,
    portals: spec.vessels
      .filter((vessel) => vessel.portalMm !== undefined)
      .map((vessel) => portalAt(vessel.route, vessel.portalMm ?? 0)),
    sidePortals: { right: sidePortals(spec, 'right'), left: sidePortals(spec, 'left') },
  };
}

function sidePortals(spec: ShapeSpec, side: HeartSide): Portal[] {
  const chambers = SIDE_CHAMBERS[side];
  return spec.vessels
    .filter(
      (vessel) =>
        vessel.chamber && chambers.includes(vessel.chamber) && vessel.portalMm !== undefined,
    )
    .map((vessel) => portalAt(vessel.route, vessel.portalMm ?? 0, spec.vesselWall - spec.seam));
}
