import type { BufferGeometry, MeshStandardMaterial, Object3D } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { MAGNETS } from '../../../model';
import { FINISHES } from '../../finishes';
import type { EmphasisGroup, PartContext } from '../context';
import { boxOver } from '../line/geometry';
import { GUIDANCE_BACK, MAGNET_MODULE, SUPPORT_BOTTOM } from './constants';
import { allAhead, cutInstances } from './instances';
import type { ShowAhead } from './instances';
import { TRAIN_LAYOUT } from './layout';
import { mergeAll, mirroredPair } from './mirror';

type Range = readonly [number, number];

interface MagnetFrame {
  readonly face: number;
  readonly back: number;
  readonly inward: number;
  readonly middle: number;
  readonly size: number;
  place(along: Range, depth: Range, across: Range): BufferGeometry;
}

const LENGTH = MAGNETS.moduleLength - MAGNET_MODULE.gap;
const HALF = LENGTH / 2;
const FULL: Range = [-HALF, HALF];
const DOWNWARD = -1;
const OUTWARD = 1;

function ordered([a, b]: Range): Range {
  return [Math.min(a, b), Math.max(a, b)];
}

const SUPPORT: MagnetFrame = {
  face: MAGNETS.support.top,
  back: SUPPORT_BOTTOM,
  inward: DOWNWARD,
  middle: MAGNETS.support.sideZ,
  size: MAGNETS.support.width,
  place: (along, depth, across) => boxOver(along, ordered(depth), across),
};

const GUIDANCE: MagnetFrame = {
  face: MAGNETS.guidance.faceZ,
  back: GUIDANCE_BACK,
  inward: OUTWARD,
  middle: MAGNETS.guidance.centreY,
  size: MAGNETS.guidance.height,
  place: (along, depth, across) => boxOver(along, across, ordered(depth)),
};

function across(frame: MagnetFrame, grow = 0, size = frame.size): Range {
  return [frame.middle - size / 2 - grow, frame.middle + size / 2 + grow];
}

function slices(count: number): Range[] {
  const pitch = LENGTH / count;
  const width = pitch * MAGNET_MODULE.coilShare;
  return Array.from({ length: count }, (_, slice) => {
    const centre = -HALF + (slice + 0.5) * pitch;
    return [centre - width / 2, centre + width / 2];
  });
}

function poleBack(frame: MagnetFrame): number {
  return frame.face + frame.inward * MAGNET_MODULE.poleFace;
}

function core(frame: MagnetFrame): BufferGeometry {
  const [low, high] = across(frame);
  const spine = across(frame, 0, (high - low) * MAGNET_MODULE.spineShare);
  return mergeAll([
    frame.place(FULL, [frame.face, poleBack(frame)], [low, high]),
    frame.place(FULL, [poleBack(frame), frame.back - frame.inward * MAGNET_MODULE.recess], spine),
  ]);
}

function coils(frame: MagnetFrame): BufferGeometry {
  const span = across(frame, MAGNET_MODULE.coilBulge);
  return mergeAll(
    slices(MAGNET_MODULE.poles).map((along) =>
      frame.place(along, [poleBack(frame), frame.back], span),
    ),
  );
}

function eddyModule(): BufferGeometry {
  const rib = MAGNET_MODULE.eddyRibDepth;
  const [low, high] = across(GUIDANCE);
  const ribs = slices(MAGNET_MODULE.eddyRibs).map((along) =>
    GUIDANCE.place(along, [poleBack(GUIDANCE), GUIDANCE.back + rib], [low - rib, high]),
  );
  return mergeAll([GUIDANCE.place(FULL, [GUIDANCE.face, GUIDANCE.back], [low, high]), ...ribs]);
}

function moduleSlots(eddy?: boolean): number[] {
  return TRAIN_LAYOUT.flatMap((layout) =>
    layout.modules
      .filter((_, index) => eddy === undefined || layout.eddyModules.includes(index) === eddy)
      .map(([from, to]) => (from + to) / 2),
  );
}

export interface Magnets {
  readonly eddyMaterial: MeshStandardMaterial;
  readonly showAhead: ShowAhead;
}

export function buildMagnets(context: PartContext, parent: Object3D): Magnets {
  const guidance = moduleSlots(false);
  const set = (
    geometry: BufferGeometry,
    group: EmphasisGroup,
    finish: MaterialFinish,
    slots: number[],
  ) => cutInstances(context, parent, mirroredPair(geometry), group, finish, slots);
  const showAhead = allAhead([
    set(core(SUPPORT), 'supportMagnets', FINISHES.magnetCore, moduleSlots()),
    set(coils(SUPPORT), 'supportMagnets', FINISHES.magnet, moduleSlots()),
    set(core(GUIDANCE), 'guidanceMagnets', FINISHES.magnetCore, guidance),
    set(coils(GUIDANCE), 'guidanceMagnets', FINISHES.guidanceMagnet, guidance),
    set(eddyModule(), 'eddyBrakes', FINISHES.eddyBrake, moduleSlots(true)),
  ]);
  return { eddyMaterial: context.materials.get('eddyBrakes', FINISHES.eddyBrake), showAhead };
}
