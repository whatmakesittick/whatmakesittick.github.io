import type { Bin } from './geo';
import { SKIN_M } from './dims';
import { LINER_M, addDoor, addSkin, addVent, addWindow, depth, onFace } from '../enclosure';
import type { Face, Opening, Range } from '../enclosure';

export type FixtureKind = 'door' | 'vent' | 'window' | 'hole';

export interface Fixture {
  readonly kind: FixtureKind;
  readonly opening: Opening;
  readonly hingeLow: boolean;
}

export interface FaceBins {
  readonly skin: Bin;
  readonly fittings: Bin;
}

function fixture(kind: FixtureKind, u: Range, v: Range, hingeLow = true): Fixture {
  return { kind, opening: { u, v }, hingeLow };
}

export const door = (u: Range, v: Range, hingeLow = true): Fixture =>
  fixture('door', u, v, hingeLow);
export const vent = (u: Range, v: Range): Fixture => fixture('vent', u, v);
export const glazing = (u: Range, v: Range): Fixture => fixture('window', u, v);
export const gap = (u: Range, v: Range): Fixture => fixture('hole', u, v);

const FIT: Record<FixtureKind, (bins: FaceBins, face: Face, item: Fixture) => void> = {
  door: (bins, face, item) => addDoor(bins.fittings, face, item.opening, item.hingeLow),
  vent: (bins, face, item) => addVent(bins.fittings, face, item.opening),
  window: (bins, face, item) => addWindow(bins.fittings, face, item.opening, bins.skin),
  hole: () => undefined,
};

export function addFace(
  bins: FaceBins,
  face: Face,
  span: Opening,
  fixtures: readonly Fixture[] = [],
): void {
  addSkin(
    bins.skin,
    face,
    span,
    fixtures.map((item) => item.opening),
  );
  fixtures.forEach((item) => FIT[item.kind](bins, face, item));
}

export function inside(face: Face): Face {
  return { ...face, plane: face.plane - face.side * SKIN_M };
}

export function coat(bin: Bin, face: Face, span: Opening, hole?: Opening): void {
  const w = depth(face, -LINER_M, 0);
  const { u, v } = span;
  const strips: Opening[] = hole
    ? [
        { u, v: [v[0], hole.v[0]] },
        { u, v: [hole.v[1], v[1]] },
        { u: [u[0], hole.u[0]], v: hole.v },
        { u: [hole.u[1], u[1]], v: hole.v },
      ]
    : [span];
  strips.forEach((strip) => bin.add('interior', onFace(face, strip.u, strip.v, w)));
}

export function lining(bin: Bin, face: Face, span: Opening, hole?: Opening): void {
  coat(bin, inside(face), span, hole);
}
