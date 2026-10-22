import { SphereGeometry } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { CUT_X, SECTION_EXTENTS } from '../../../model';
import type { Finish } from '../../finishes';
import { partMesh } from '../context';
import type { PartContext } from '../context';
import { buildBellows } from './bellows';
import { BODY, JOINT, ROOF_FAIRING } from './constants';
import { TRAIN_FINISHES } from './finishes';
import { LEAD_SECTION, TAIL_SECTION, isAhead } from './layout';
import { mergeAll } from './mirror';
import type { SectionEnds } from './nose';
import type { BodyRegion } from './profile';
import { buildShell } from './shell';
import { buildLamps } from './lamps';
import { buildWindscreen } from './windscreen';

const REGION_FINISH: Readonly<Record<BodyRegion, Finish>> = {
  underbody: 'underbody',
  white: 'trainWhite',
  band: 'windowBand',
};

type Pieces = Map<BodyRegion, BufferGeometry[]>;

export function sectionEnds(index: number): SectionEnds {
  const [from, to] = SECTION_EXTENTS[index];
  const rearNose = index === TAIL_SECTION;
  const frontNose = index === LEAD_SECTION;
  return {
    rearX: rearNose ? from : from + JOINT.halfGap,
    frontX: frontNose ? to : to - JOINT.halfGap,
    rear: rearNose ? 'nose' : 'joint',
    front: frontNose ? 'nose' : 'joint',
  };
}

function shellPieces(): Pieces[] {
  const sides: Pieces[] = [new Map(), new Map()];
  SECTION_EXTENTS.forEach((_, index) => {
    const ends = sectionEnds(index);
    const splits = ends.rearX < CUT_X && ends.frontX > CUT_X ? [CUT_X] : [];
    const edges = [ends.rearX, ...splits, ends.frontX];
    edges.slice(1).forEach((to, piece) => {
      const from = edges[piece];
      const pieces = sides[isAhead((from + to) / 2) ? 1 : 0];
      buildShell(ends, [from, to], splits).forEach((geometry, region) =>
        pieces.set(region, [...(pieces.get(region) ?? []), geometry]),
      );
    });
  });
  return sides;
}

function roofFairing(x: number): BufferGeometry {
  const geometry = new SphereGeometry(
    1,
    ROOF_FAIRING.segments,
    ROOF_FAIRING.rings,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );
  geometry.scale(ROOF_FAIRING.length / 2, ROOF_FAIRING.height, ROOF_FAIRING.width / 2);
  geometry.translate(x, BODY.roofY - ROOF_FAIRING.sink, 0);
  return geometry;
}

function addRoofFairings(context: PartContext, behind: Object3D, ahead: Object3D): void {
  const centres = SECTION_EXTENTS.map(([from, to], index) => {
    if (index === LEAD_SECTION) return from + (to - from) * ROOF_FAIRING.endShare;
    if (index === TAIL_SECTION) return to - (to - from) * ROOF_FAIRING.endShare;
    return (from + to) / 2;
  });
  [behind, ahead].forEach((parent, side) => {
    const xs = centres.filter((x) => isAhead(x) === side > 0);
    if (xs.length > 0)
      parent.add(partMesh(context, mergeAll(xs.map(roofFairing)), 'train', 'trainWhite'));
  });
}

export function buildBody(context: PartContext, behind: Object3D, ahead: Object3D): void {
  shellPieces().forEach((pieces, side) =>
    pieces.forEach((list, region) =>
      [behind, ahead][side].add(partMesh(context, mergeAll(list), 'train', REGION_FINISH[region])),
    ),
  );
  const boundaries = SECTION_EXTENTS.slice(1).map(([, to]) => to);
  behind.add(partMesh(context, buildBellows(boundaries), 'train', 'joint'));
  addRoofFairings(context, behind, ahead);
  const noses = [
    [sectionEnds(LEAD_SECTION), ahead, TRAIN_FINISHES.lamp],
    [sectionEnds(TAIL_SECTION), behind, TRAIN_FINISHES.tailLamp],
  ] as const;
  noses.forEach(([ends, parent, lamp]) => buildLamps(context, ends, lamp, parent));
  noses.forEach(([ends, parent]) => buildWindscreen(context, ends, parent));
}
