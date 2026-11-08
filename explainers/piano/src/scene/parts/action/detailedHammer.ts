import { Shape } from 'three';
import type { Object3D } from 'three';
import { HAMMER } from '../../../model';
import { FINISHES } from '../../finishes';
import { label, sceneAnchor } from '../context';
import type { PartContext } from '../context';
import { QUARTER_TURN, profileAlongX } from '../keyboard/geometry';
import { KNUCKLE, MOULDING_BOTTOM, SHANK_AXIS_Y, SHANK_SPAN } from './dimensions';
import { ACTION_FINISHES } from './finishes';
import { unitFelt, unitMoulding } from './headGeometry';
import { headSize } from './layout';
import type { HeadSize } from './layout';
import { addMesh, pivotFrame, rodGeometry } from './meshes';
import type { Piece } from './meshes';

const SHANK_SEGMENTS = 12;
const KNUCKLE_BEVEL = 0.0012;
const KNUCKLE_CURVES = 14;
const SQUASH_BULGE = 0.5;
const LABEL_DROP = 0.012;

function knuckleShape(): Shape {
  return new Shape().absellipse(
    KNUCKLE.z,
    KNUCKLE.y,
    KNUCKLE.radiusZ,
    KNUCKLE.radiusY,
    0,
    2 * Math.PI,
    false,
    0,
  );
}

export function buildHammer(context: PartContext, parent: Object3D): Piece {
  const frame = pivotFrame(parent, 'hammer', HAMMER.pivotY, HAMMER.pivotZ);
  const shankGeometry = rodGeometry(SHANK_SEGMENTS).rotateX(QUARTER_TURN);
  const shank = addMesh(context, frame.body, shankGeometry, 'hammer', ACTION_FINISHES.shank);
  const moulding = addMesh(
    context,
    frame.body,
    unitMoulding(true),
    'hammer',
    ACTION_FINISHES.moulding,
  );
  const felt = addMesh(context, frame.body, unitFelt(true), 'hammer', FINISHES.felt);
  const knuckle = profileAlongX(
    knuckleShape(),
    -KNUCKLE.halfWidth,
    KNUCKLE.halfWidth,
    KNUCKLE_BEVEL,
    KNUCKLE_CURVES,
  );
  addMesh(context, frame.body, knuckle, 'knuckle', ACTION_FINISHES.buckskin);
  label(context, 'knuckle', frame.body, [0, KNUCKLE.y - KNUCKLE.radiusY, KNUCKLE.z]);
  const headLabel = label(context, 'hammer', frame.body, [0, 0, 0]);
  const headAnchor = sceneAnchor(context, 'hammer', frame.body, [0, 0, 0]);
  let size: HeadSize = headSize(1);

  function squash(amount: number): void {
    felt.scale.set(
      size.width,
      size.feltHeight - amount,
      size.depth * (1 + (SQUASH_BULGE * amount) / size.feltHeight),
    );
  }

  return {
    setKey(key) {
      size = headSize(key);
      const front = HAMMER.pivotZ + SHANK_SPAN.front;
      const back = size.centreZ - SHANK_SPAN.intoHead;
      shank.position.set(0, SHANK_AXIS_Y, (front + back) / 2);
      shank.scale.set(size.shankRadius, size.shankRadius, front - back);
      moulding.position.set(0, MOULDING_BOTTOM, size.centreZ);
      moulding.scale.set(size.mouldingWidth, size.mouldingHeight, size.depth);
      felt.position.set(0, size.feltBase, size.centreZ);
      squash(0);
      headLabel.position.set(0, size.top - LABEL_DROP, size.centreZ);
      headAnchor.position.set(0, size.top, size.centreZ);
    },
    pose(pose) {
      frame.pivot.rotation.x = pose.hammer;
      squash(pose.feltSquash);
    },
  };
}
