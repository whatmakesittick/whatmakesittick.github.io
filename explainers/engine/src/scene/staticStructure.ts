import { Group, Object3D } from 'three';
import type { Mesh } from 'three';
import { BLOCK } from './constants';
import { createBlock, createHeadGasket } from './parts/block';
import { createCamCover } from './parts/camCover';
import type { PartContext } from './parts/context';
import { stretchVertically } from './parts/context';
import { createCrankcase } from './parts/crankcase';
import { createCylinderHead } from './parts/cylinderHead';
import { linerFactory } from './parts/cylinderLiner';

export interface StaticStructure {
  lower: Group;
  head: Group;
  cylinderAnchor: Object3D;
  fitToHead(headFaceHeight: number): void;
}

const CYLINDER_LABEL_HEIGHT = 0.3;

export function createStaticStructure(context: PartContext): StaticStructure {
  const { layout, dims } = context;
  const lower = new Group();
  const block = createBlock(context);
  const gasket = createHeadGasket(context);
  const createLiner = linerFactory(context);
  const liners: Mesh[] = layout.cylinders.map((placement) => createLiner(placement.z));
  lower.add(createCrankcase(context), block, gasket, ...liners);
  const head = new Group();
  head.add(createCylinderHead(context), createCamCover(context));
  const cylinderAnchor = new Object3D();
  const along = layout.sectionFrame.u
    .clone()
    .multiplyScalar(dims.boreRadius + BLOCK.linerThickness / 2);
  cylinderAnchor.position.set(along.x, 0, layout.primaryCylinder.z + along.z);
  lower.add(cylinderAnchor);
  return {
    lower,
    head,
    cylinderAnchor,
    fitToHead: (headFaceHeight) => {
      const deck = headFaceHeight - BLOCK.gasketThickness;
      stretchVertically(block, BLOCK.bottom, deck);
      liners.forEach((mesh) => stretchVertically(mesh, BLOCK.bottom, headFaceHeight));
      gasket.position.y = deck;
      cylinderAnchor.position.y =
        BLOCK.bottom + (headFaceHeight - BLOCK.bottom) * CYLINDER_LABEL_HEIGHT;
    },
  };
}
