import { BoxGeometry, CylinderGeometry } from 'three';
import type { Object3D } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { DAMPER, HAMMER, hasDamper, keyX } from '../../../model';
import { FINISHES } from '../../finishes';
import type { PartContext } from '../context';
import {
  QUARTER_TURN,
  boxMatrix,
  outlineShape,
  placedMatrix,
  profileAlongX,
  segmentMatrix,
} from '../keyboard/geometry';
import { KeyedInstances } from '../keyboard/instances';
import type { KeyedMatrix } from '../keyboard/instances';
import { ALL_KEYS } from '../keyboard/layout';
import {
  DAMPER_FELT,
  DAMPER_LEVER,
  DAMPER_WIRE_FOOT_Y,
  DAMPER_WIRE_RADIUS,
  JACK_HALF_WIDTH,
  JACK_PROFILE,
  MOULDING_BOTTOM,
  SHANK_AXIS_Y,
  SHANK_SPAN,
  WIPPEN_PROFILE,
  WIPPEN_X,
} from './dimensions';
import { ACTION_FINISHES } from './finishes';
import { unitFelt, unitMoulding } from './headGeometry';
import { DAMPER_BLOCK, damperHead, damperWireTop, headSize } from './layout';

const SHANK_SEGMENTS = 6;

export interface InstancedParts {
  rows: KeyedInstances;
  small: readonly Object3D[];
}

function shankMatrix(key: number) {
  const size = headSize(key);
  const front = HAMMER.pivotZ + SHANK_SPAN.front;
  const back = size.centreZ - SHANK_SPAN.intoHead;
  return placedMatrix(
    [keyX(key), SHANK_AXIS_Y, (front + back) / 2],
    [size.shankRadius, size.shankRadius, front - back],
  );
}

function feltMatrix(key: number) {
  const size = headSize(key);
  return placedMatrix(
    [keyX(key), size.feltBase, size.centreZ],
    [size.width, size.feltHeight, size.depth],
  );
}

function mouldingMatrix(key: number) {
  const size = headSize(key);
  return placedMatrix(
    [keyX(key), MOULDING_BOTTOM, size.centreZ],
    [size.mouldingWidth, size.mouldingHeight, size.depth],
  );
}

function entries(keys: readonly number[], matrix: (key: number) => KeyedMatrix[1]): KeyedMatrix[] {
  return keys.map((key) => [key, matrix(key)]);
}

function shifted(key: number) {
  return placedMatrix([keyX(key), 0, 0]);
}

export function buildInstancedActions(context: PartContext, parent: Object3D): InstancedParts {
  const rows = new KeyedInstances(context, parent);
  const shank = new CylinderGeometry(1, 1, 1, SHANK_SEGMENTS).rotateX(QUARTER_TURN);
  rows.add({
    geometry: shank,
    group: 'actions',
    finish: ACTION_FINISHES.shank,
    entries: entries(ALL_KEYS, shankMatrix),
  });
  rows.add({
    geometry: unitFelt(false),
    group: 'actions',
    finish: FINISHES.felt,
    entries: entries(ALL_KEYS, feltMatrix),
  });
  rows.add({
    geometry: unitMoulding(false),
    group: 'actions',
    finish: ACTION_FINISHES.moulding,
    entries: entries(ALL_KEYS, mouldingMatrix),
  });
  const wippen = rows.add({
    geometry: profileAlongX(outlineShape(WIPPEN_PROFILE), WIPPEN_X[0], WIPPEN_X[1]),
    group: 'actions',
    finish: ACTION_FINISHES.wippen,
    entries: entries(ALL_KEYS, shifted),
  });
  const jack = rows.add({
    geometry: profileAlongX(outlineShape(JACK_PROFILE), -JACK_HALF_WIDTH, JACK_HALF_WIDTH),
    group: 'actions',
    finish: ACTION_FINISHES.jack,
    entries: entries(ALL_KEYS, shifted),
  });
  return { rows, small: [wippen, jack] };
}

export interface DamperMatrices {
  lever: KeyedMatrix[1];
  wire: KeyedMatrix[1];
  block: KeyedMatrix[1];
  felt: KeyedMatrix[1];
}

export function damperMatrices(key: number): DamperMatrices {
  const head = damperHead(key);
  const x = keyX(key);
  const { hinge, front, halfHeight, halfWidth } = DAMPER_LEVER;
  return {
    lever: boxMatrix({
      minX: x - halfWidth,
      maxX: x + halfWidth,
      minY: hinge.y - halfHeight,
      maxY: hinge.y + halfHeight,
      minZ: hinge.z - halfWidth,
      maxZ: front,
    }),
    wire: segmentMatrix(
      [x, DAMPER_WIRE_FOOT_Y, DAMPER.z],
      damperWireTop(head),
      2 * DAMPER_WIRE_RADIUS,
    ),
    block: placedMatrix(
      [head.x, head.y + DAMPER_FELT + DAMPER_BLOCK / 2, DAMPER.z],
      [head.width, DAMPER_BLOCK, DAMPER.headDepth],
      head.yaw,
    ),
    felt: placedMatrix(
      [head.x, head.y + DAMPER_FELT / 2, DAMPER.z],
      [head.width, DAMPER_FELT, DAMPER.headDepth],
      head.yaw,
    ),
  };
}

export const DAMPER_KEYS: readonly number[] = ALL_KEYS.filter(hasDamper);

export function buildInstancedDampers(context: PartContext, parent: Object3D): InstancedParts {
  const rows = new KeyedInstances(context, parent);
  const unit = new BoxGeometry();
  const layouts = DAMPER_KEYS.map((key) => [key, damperMatrices(key)] as const);
  const row = (part: keyof DamperMatrices, finish: MaterialFinish) =>
    rows.add({
      geometry: unit,
      group: 'actions',
      finish,
      entries: layouts.map(([key, matrices]) => [key, matrices[part]]),
    });
  const lever = row('lever', FINISHES.keyWood);
  const wire = row('wire', FINISHES.steel);
  row('block', ACTION_FINISHES.damperWood);
  row('felt', FINISHES.felt);
  return { rows, small: [lever, wire] };
}
