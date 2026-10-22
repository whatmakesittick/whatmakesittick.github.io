import { SphereGeometry } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import type { Extent } from '@core/scene/regions';
import { CUT_X, SECTION_EXTENTS } from '../../../model';
import type { Finish } from '../../finishes';
import { finishMesh, partMesh } from '../context';
import type { PartContext } from '../context';
import { buildBellows } from './bellows';
import { BODY, JOINT, ROOF_FAIRING } from './constants';
import { TRAIN_FINISHES } from './finishes';
import { LEAD_SECTION, TAIL_SECTION, isAhead } from './layout';
import { mergeAll } from './mirror';
import type { SectionEnds } from './nose';
import type { BodyRegion } from './profile';
import { buildShell } from './shell';
import { buildWindscreens } from './windscreen';

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

function collect(target: Pieces, built: Map<BodyRegion, BufferGeometry>): void {
  built.forEach((geometry, region) => {
    const list = target.get(region) ?? [];
    list.push(geometry);
    target.set(region, list);
  });
}

function shellPieces(): { behind: Pieces; ahead: Pieces } {
  const behind: Pieces = new Map();
  const ahead: Pieces = new Map();
  SECTION_EXTENTS.forEach((_, index) => {
    const ends = sectionEnds(index);
    const cut = ends.rearX < CUT_X && ends.frontX > CUT_X;
    const ranges: Extent[] = cut
      ? [
          [ends.rearX, CUT_X],
          [CUT_X, ends.frontX],
        ]
      : [[ends.rearX, ends.frontX]];
    ranges.forEach((range, piece) => {
      const built = buildShell(ends, range, cut ? [CUT_X] : [], `s${index}p${piece}`);
      collect(isAhead((range[0] + range[1]) / 2) ? ahead : behind, built);
    });
  });
  return { behind, ahead };
}

function addPieces(context: PartContext, pieces: Pieces, parent: Object3D): void {
  pieces.forEach((list, region) =>
    parent.add(partMesh(context, mergeAll(list), 'train', REGION_FINISH[region])),
  );
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
  const split = [centres.filter((x) => !isAhead(x)), centres.filter(isAhead)] as const;
  split.forEach((xs, side) => {
    if (xs.length === 0) return;
    const mesh = partMesh(context, mergeAll(xs.map(roofFairing)), 'train', 'trainWhite');
    (side === 0 ? behind : ahead).add(mesh);
  });
}

export function buildBody(context: PartContext, behind: Object3D, ahead: Object3D): void {
  const { behind: rear, ahead: front } = shellPieces();
  addPieces(context, rear, behind);
  addPieces(context, front, ahead);
  const boundaries = SECTION_EXTENTS.slice(1).map(([, to]) => to);
  const bellows = buildBellows(boundaries);
  if (bellows) behind.add(partMesh(context, bellows, 'train', 'joint'));
  addRoofFairings(context, behind, ahead);
  const lead = buildWindscreens([[sectionEnds(LEAD_SECTION), SECTION_EXTENTS[LEAD_SECTION][1]]]);
  const tail = buildWindscreens([[sectionEnds(TAIL_SECTION), SECTION_EXTENTS[TAIL_SECTION][0]]]);
  const screens = [
    [lead, ahead],
    [tail, behind],
  ] as const;
  screens.forEach(([screen, parent]) => {
    if (screen.frame) parent.add(partMesh(context, screen.frame, 'train', 'windowBand'));
    if (screen.glass) {
      const glass = finishMesh(context, screen.glass, 'train', TRAIN_FINISHES.screen);
      glass.name = 'train';
      parent.add(glass);
    }
  });
}
