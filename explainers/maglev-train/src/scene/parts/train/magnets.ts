import type { BufferGeometry, MeshStandardMaterial, Object3D } from 'three';
import { box } from '@core/scene/geometry/box';
import type { BoxBounds } from '@core/scene/geometry/box';
import { MAGNETS } from '../../../model';
import { FINISHES } from '../../finishes';
import type { PartContext } from '../context';
import { MAGNET_MODULE } from './constants';
import { cutInstances, showAhead } from './instances';
import type { CutInstances } from './instances';
import { TRAIN_LAYOUT } from './layout';
import { mergeAll, mirroredPair } from './mirror';

const LENGTH = MAGNETS.moduleLength - MAGNET_MODULE.gap;
const RECESS = MAGNET_MODULE.recess;
const HALF = LENGTH / 2;
const SUPPORT = {
  bottom: MAGNETS.support.top - MAGNETS.support.height,
  top: MAGNETS.support.top,
  inner: MAGNETS.support.sideZ - MAGNETS.support.width / 2,
  outer: MAGNETS.support.sideZ + MAGNETS.support.width / 2,
};
const GUIDANCE = {
  bottom: MAGNETS.guidance.centreY - MAGNETS.guidance.height / 2,
  top: MAGNETS.guidance.centreY + MAGNETS.guidance.height / 2,
  face: MAGNETS.guidance.faceZ,
  back: MAGNETS.guidance.faceZ + MAGNETS.guidance.depth,
};

function poles(bounds: (from: number, to: number) => BoxBounds): BufferGeometry[] {
  const pitch = LENGTH / MAGNET_MODULE.poles;
  const coil = pitch * MAGNET_MODULE.coilShare;
  return Array.from({ length: MAGNET_MODULE.poles }, (_, pole) => {
    const centre = -HALF + (pole + 0.5) * pitch;
    return box(bounds(centre - coil / 2, centre + coil / 2));
  });
}

function supportCore(): BufferGeometry {
  const width = (SUPPORT.outer - SUPPORT.inner) * MAGNET_MODULE.spineShare;
  const middle = MAGNETS.support.sideZ;
  const faceBottom = SUPPORT.top - MAGNET_MODULE.poleFace;
  return mergeAll([
    box({
      minX: -HALF,
      maxX: HALF,
      minY: faceBottom,
      maxY: SUPPORT.top,
      minZ: SUPPORT.inner,
      maxZ: SUPPORT.outer,
    }),
    box({
      minX: -HALF,
      maxX: HALF,
      minY: SUPPORT.bottom + RECESS,
      maxY: faceBottom,
      minZ: middle - width / 2,
      maxZ: middle + width / 2,
    }),
  ]);
}

function supportCoils(): BufferGeometry {
  const bulge = MAGNET_MODULE.coilBulge;
  return mergeAll(
    poles((minX, maxX) => ({
      minX,
      maxX,
      minY: SUPPORT.bottom,
      maxY: SUPPORT.top - MAGNET_MODULE.poleFace,
      minZ: SUPPORT.inner - bulge,
      maxZ: SUPPORT.outer + bulge,
    })),
  );
}

function guidanceCore(): BufferGeometry {
  const height = (GUIDANCE.top - GUIDANCE.bottom) * MAGNET_MODULE.spineShare;
  const middle = MAGNETS.guidance.centreY;
  const faceBack = GUIDANCE.face + MAGNET_MODULE.poleFace;
  return mergeAll([
    box({
      minX: -HALF,
      maxX: HALF,
      minY: GUIDANCE.bottom,
      maxY: GUIDANCE.top,
      minZ: GUIDANCE.face,
      maxZ: faceBack,
    }),
    box({
      minX: -HALF,
      maxX: HALF,
      minY: middle - height / 2,
      maxY: middle + height / 2,
      minZ: faceBack,
      maxZ: GUIDANCE.back - RECESS,
    }),
  ]);
}

function guidanceCoils(): BufferGeometry {
  const bulge = MAGNET_MODULE.coilBulge;
  return mergeAll(
    poles((minX, maxX) => ({
      minX,
      maxX,
      minY: GUIDANCE.bottom - bulge,
      maxY: GUIDANCE.top + bulge,
      minZ: GUIDANCE.face + MAGNET_MODULE.poleFace,
      maxZ: GUIDANCE.back,
    })),
  );
}

function eddyModule(): BufferGeometry {
  const ribPitch = LENGTH / MAGNET_MODULE.eddyRibs;
  const ribs = Array.from({ length: MAGNET_MODULE.eddyRibs }, (_, rib) => {
    const centre = -HALF + (rib + 0.5) * ribPitch;
    return box({
      minX: centre - (ribPitch * MAGNET_MODULE.coilShare) / 2,
      maxX: centre + (ribPitch * MAGNET_MODULE.coilShare) / 2,
      minY: GUIDANCE.bottom - MAGNET_MODULE.eddyRibDepth,
      maxY: GUIDANCE.top,
      minZ: GUIDANCE.face + MAGNET_MODULE.poleFace,
      maxZ: GUIDANCE.back + MAGNET_MODULE.eddyRibDepth,
    });
  });
  const body = box({
    minX: -HALF,
    maxX: HALF,
    minY: GUIDANCE.bottom,
    maxY: GUIDANCE.top,
    minZ: GUIDANCE.face,
    maxZ: GUIDANCE.back,
  });
  return mergeAll([body, ...ribs]);
}

function moduleSlots(eddy: boolean | null): number[] {
  return TRAIN_LAYOUT.flatMap((layout) =>
    layout.modules
      .map(([from, to], index) => ({
        x: (from + to) / 2,
        eddy: layout.eddyModules.includes(index),
      }))
      .filter((slot) => eddy === null || slot.eddy === eddy)
      .map((slot) => slot.x),
  );
}

export interface Magnets {
  readonly eddyMaterial: MeshStandardMaterial;
  showAhead(shown: boolean): void;
}

export function buildMagnets(context: PartContext, parent: Object3D): Magnets {
  const all = moduleSlots(null);
  const guidance = moduleSlots(false);
  const eddy = moduleSlots(true);
  const sets: CutInstances[] = [
    cutInstances(context, mirroredPair(supportCore()), 'supportMagnets', FINISHES.magnetCore, all),
    cutInstances(context, mirroredPair(supportCoils()), 'supportMagnets', FINISHES.magnet, all),
    cutInstances(
      context,
      mirroredPair(guidanceCore()),
      'guidanceMagnets',
      FINISHES.magnetCore,
      guidance,
    ),
    cutInstances(
      context,
      mirroredPair(guidanceCoils()),
      'guidanceMagnets',
      FINISHES.guidanceMagnet,
      guidance,
    ),
    cutInstances(context, mirroredPair(eddyModule()), 'eddyBrakes', FINISHES.eddyBrake, eddy),
  ];
  sets.forEach((set) => parent.add(set.mesh));
  return {
    eddyMaterial: sets[sets.length - 1].mesh.material as MeshStandardMaterial,
    showAhead: (shown) => sets.forEach((set) => showAhead(set, shown)),
  };
}
