import type { BufferGeometry, Object3D } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { JACK_ANCHOR_Y, JACK_Z, LET_OFF_BUTTON } from '../../../model';
import { FINISHES } from '../../finishes';
import { label, sceneAnchor } from '../context';
import type { PartContext } from '../context';
import { boxBetween, mergeParts, profileAlongX, rectShape } from '../keyboard/geometry';
import {
  DROP_SCREW,
  FLANGE,
  LET_OFF_BUTTON_RECT,
  LET_OFF_BUTTON_X,
  LET_OFF_SCREW_X,
  REGULATING_RAIL,
  SCREW_RADIUS,
  WIPPEN_FLANGE,
} from './dimensions';
import { ACTION_FINISHES } from './finishes';
import { addMesh, uprightRod } from './meshes';

const BUTTON = { round: 0.0018, bevel: 0.0007 } as const;
const FLANGE_SHAPE = { round: 0.002, bevel: 0.0005 } as const;
const SCREW_HEAD = { radius: 0.0024, height: 0.002 } as const;

function regulatingScrew(x: number, z: number, bottom: number): BufferGeometry {
  const top = REGULATING_RAIL.b[1];
  return mergeParts([
    uprightRod([x, z], [bottom, top], SCREW_RADIUS),
    uprightRod([x, z], [top, top + SCREW_HEAD.height], SCREW_HEAD.radius),
  ]);
}

function flanges(): BufferGeometry {
  const hammer = rectShape({ a: FLANGE.z, b: FLANGE.y }, FLANGE_SHAPE.round);
  const { x, y, z } = WIPPEN_FLANGE;
  return mergeParts([
    profileAlongX(hammer, -FLANGE.halfWidth, FLANGE.halfWidth, FLANGE_SHAPE.bevel),
    boxBetween({ minX: x[0], maxX: x[1], minY: y[0], maxY: y[1], minZ: z[0], maxZ: z[1] }),
  ]);
}

export function addFixtures(context: PartContext, parent: Object3D): void {
  const buttonShape = rectShape(LET_OFF_BUTTON_RECT, BUTTON.round);
  const button = profileAlongX(buttonShape, ...LET_OFF_BUTTON_X, BUTTON.bevel);
  addMesh(context, parent, button, 'letOffButton', FINISHES.felt);
  const buttonTop = LET_OFF_BUTTON_RECT.b[1];
  const letOffScrew = regulatingScrew(LET_OFF_SCREW_X, LET_OFF_BUTTON.z, buttonTop - SCREW_RADIUS);
  addMesh(context, parent, letOffScrew, 'letOffButton', FINISHES.pinSteel);
  const dropScrew = regulatingScrew(DROP_SCREW.x, DROP_SCREW.z, DROP_SCREW.bottom);
  addMesh(context, parent, dropScrew, 'repetitionLever', FINISHES.pinSteel);
  addMesh(context, parent, flanges(), STRUCTURE_GROUP, ACTION_FINISHES.rail);
  const buttonX = (LET_OFF_BUTTON_X[0] + LET_OFF_BUTTON_X[1]) / 2;
  label(context, 'letOffButton', parent, [buttonX, buttonTop, LET_OFF_BUTTON.z]);
  sceneAnchor(context, 'jack', parent, [0, JACK_ANCHOR_Y, JACK_Z]);
}
