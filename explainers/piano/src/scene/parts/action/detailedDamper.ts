import { BoxGeometry } from 'three';
import type { Object3D } from 'three';
import { DAMPER, hasDamper } from '../../../model';
import { FINISHES } from '../../finishes';
import { label, namedGroup, sceneAnchor } from '../context';
import type { PartContext } from '../context';
import { DAMPER_LEVER } from './dimensions';
import { ACTION_FINISHES } from './finishes';
import { damperMatrices } from './instanced';
import { damperHead } from './layout';
import { addMesh, applyMatrix, pivotFrame } from './meshes';
import type { Piece } from './meshes';

export function buildDamper(context: PartContext, root: Object3D): Piece {
  const unit = new BoxGeometry();
  const hinge = pivotFrame(root, 'damperLever', DAMPER_LEVER.hinge.y, DAMPER_LEVER.hinge.z);
  const lever = addMesh(context, hinge.body, unit, 'damper', FINISHES.keyWood);
  const lift = namedGroup('damperLift', root);
  const wire = addMesh(context, lift, unit, 'damper', FINISHES.steel);
  const block = addMesh(context, lift, unit, 'damper', ACTION_FINISHES.damperWood);
  const felt = addMesh(context, lift, unit, 'damper', FINISHES.felt);
  const top = namedGroup('damperTop', lift);
  label(context, 'damper', top, [0, 0, 0]);
  sceneAnchor(context, 'damper', top, [0, 0, 0]);

  return {
    setKey(key) {
      root.visible = hasDamper(key);
      const matrices = damperMatrices(key);
      applyMatrix(lever, matrices.lever);
      applyMatrix(wire, matrices.wire);
      applyMatrix(block, matrices.block);
      applyMatrix(felt, matrices.felt);
      const head = damperHead(key);
      top.position.set(head.x, head.y + DAMPER.headHeight, DAMPER.z);
    },
    pose(pose) {
      hinge.pivot.rotation.x = pose.damperLever;
      lift.position.y = pose.damperLift;
    },
  };
}
