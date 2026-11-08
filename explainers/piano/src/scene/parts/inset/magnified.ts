import { Box3, Mesh, Vector3 } from 'three';
import type { Object3D } from 'three';
import type { ActionPose } from '../../../ids';
import { INSET } from '../../../model';
import { addFixtures } from '../action/fixtures';
import { buildHammer } from '../action/detailedHammer';
import { buildLevers } from '../action/detailedLevers';
import { detailedPose } from '../action/layout';
import type { Piece } from '../action/meshes';
import { namedGroup } from '../context';
import type { PartContext } from '../context';
import { insetContext } from './clip';
import type { InsetClip } from './clip';
import { WINDOW } from './window';

const RELIEF = { depth: 0.5, x: -0.0065 } as const;
const MOTION_MARGIN = 0.01;
const NO_PEDAL = 0;

export interface Magnified {
  readonly root: Object3D;
  setKey(key: number): void;
  pose(action: ActionPose): void;
}

function reachable(): Box3 {
  const half = new Vector3(
    Infinity,
    WINDOW.height / 2 + MOTION_MARGIN,
    WINDOW.width / 2 + MOTION_MARGIN,
  );
  const centre = new Vector3(0, WINDOW.y, WINDOW.z);
  return new Box3(centre.clone().sub(half), centre.add(half));
}

function hideOutside(root: Object3D): void {
  const view = reachable();
  root.updateMatrixWorld(true);
  const toRoot = root.matrixWorld.clone().invert();
  root.traverse((node) => {
    if (node instanceof Mesh)
      node.visible = new Box3().setFromObject(node).applyMatrix4(toRoot).intersectsBox(view);
  });
}

export function buildMagnified(context: PartContext, clip: InsetClip, key: number): Magnified {
  const inner = insetContext(context, clip);
  const root = namedGroup('insetAction');
  root.scale.set(RELIEF.depth, INSET.scale, INSET.scale);
  root.position.set(RELIEF.x, -INSET.scale * WINDOW.y, -INSET.scale * WINDOW.z);
  addFixtures(inner, root);
  const pieces: readonly Piece[] = [buildLevers(inner, root), buildHammer(inner, root)];
  const setKey = (played: number) => pieces.forEach((piece) => piece.setKey?.(played));
  setKey(key);
  hideOutside(root);
  return {
    root,
    setKey,
    pose(action) {
      const pose = detailedPose(action, NO_PEDAL);
      pieces.forEach((piece) => piece.pose?.(pose));
    },
  };
}
