import { CatmullRomCurve3, TubeGeometry, Vector3 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { FULL_TURN } from '@core/math';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { JACK_ANCHOR_Y, JACK_Z, LET_OFF_BUTTON, WIPPEN } from '../../../model';
import { FINISHES } from '../../finishes';
import { label, sceneAnchor } from '../context';
import type { PartContext } from '../context';
import {
  boxBetween,
  mergeParts,
  profileAlongX,
  rectShape,
  roundedShape,
} from '../keyboard/geometry';
import type { Rect } from '../keyboard/geometry';
import {
  CHEEK_X,
  CUSHION_RECT,
  DROP_SCREW,
  JACK_HALF_WIDTH,
  JACK_PIVOT,
  JACK_PROFILE,
  LET_OFF_BUTTON_RECT,
  LET_OFF_BUTTON_X,
  LET_OFF_SCREW_X,
  REGULATING_RAIL,
  REPETITION_PIVOT,
  REPETITION_PROFILE,
  REPETITION_SUPPORT_RECT,
  SCREW_RADIUS,
  SPRING,
  WIPPEN_FLANGE,
  WIPPEN_PROFILE,
  WIPPEN_X,
} from './dimensions';
import { ACTION_FINISHES } from './finishes';
import { addMesh, pivotFrame, uprightRod } from './meshes';
import type { Piece } from './meshes';

const ROUND = { wippen: 0.0015, jack: 0.0008, repetition: 0.001, button: 0.0018 } as const;
const BEVEL = { wippen: 0.0006, jack: 0.0005, repetition: 0.0004, button: 0.0007 } as const;
const SPRING_STEPS_PER_TURN = 10;
const SPRING_SIDES = 4;
const SCREW_HEAD = { radius: 0.0024, height: 0.002 } as const;
const CHEEK_CENTRE = (CHEEK_X[0] + CHEEK_X[1]) / 2;
const LABEL_INSET = 0.008;

function alongX(rect: Rect, [start, end]: readonly [number, number], round = 0, bevel = 0) {
  return profileAlongX(rectShape(rect, round), start, end, bevel);
}

function springGeometry(): BufferGeometry {
  const { radius, wire, turns, top, bottom } = SPRING;
  const steps = turns * SPRING_STEPS_PER_TURN;
  const points = Array.from({ length: steps + 1 }, (_, index) => {
    const share = index / steps;
    const angle = share * turns * FULL_TURN;
    return new Vector3(radius * Math.cos(angle), share * (top - bottom), radius * Math.sin(angle));
  });
  return new TubeGeometry(new CatmullRomCurve3(points), steps, wire, SPRING_SIDES, false);
}

function regulatingScrew(x: number, z: number, bottom: number): BufferGeometry {
  const top = REGULATING_RAIL.b[1];
  return mergeParts([
    uprightRod([x, z], [bottom, top], SCREW_RADIUS),
    uprightRod([x, z], [top, top + SCREW_HEAD.height], SCREW_HEAD.radius),
  ]);
}

function addFixtures(context: PartContext, parent: Object3D): void {
  const button = alongX(LET_OFF_BUTTON_RECT, LET_OFF_BUTTON_X, ROUND.button, BEVEL.button);
  addMesh(context, parent, button, 'letOffButton', FINISHES.felt);
  const buttonTop = LET_OFF_BUTTON_RECT.b[1];
  const letOffScrew = regulatingScrew(LET_OFF_SCREW_X, LET_OFF_BUTTON.z, buttonTop - SCREW_RADIUS);
  addMesh(context, parent, letOffScrew, 'letOffButton', FINISHES.pinSteel);
  const dropScrew = regulatingScrew(DROP_SCREW.x, DROP_SCREW.z, DROP_SCREW.bottom);
  addMesh(context, parent, dropScrew, 'repetitionLever', FINISHES.pinSteel);
  const { x, y, z } = WIPPEN_FLANGE;
  const flange = boxBetween({
    minX: x[0],
    maxX: x[1],
    minY: y[0],
    maxY: y[1],
    minZ: z[0],
    maxZ: z[1],
  });
  addMesh(context, parent, flange, STRUCTURE_GROUP, ACTION_FINISHES.rail);
  const buttonX = (LET_OFF_BUTTON_X[0] + LET_OFF_BUTTON_X[1]) / 2;
  label(context, 'letOffButton', parent, [buttonX, buttonTop, LET_OFF_BUTTON.z]);
  sceneAnchor(context, 'jack', parent, [0, JACK_ANCHOR_Y, JACK_Z]);
}

export function buildLevers(context: PartContext, parent: Object3D): Piece {
  addFixtures(context, parent);
  const wippen = pivotFrame(parent, 'wippen', WIPPEN.pivotY, WIPPEN.pivotZ);
  const body = profileAlongX(roundedShape(WIPPEN_PROFILE, ROUND.wippen), ...WIPPEN_X, BEVEL.wippen);
  addMesh(context, wippen.body, body, 'wippen', FINISHES.keyWood);
  addMesh(context, wippen.body, alongX(CUSHION_RECT, WIPPEN_X), 'wippen', FINISHES.cloth);
  addMesh(
    context,
    wippen.body,
    alongX(REPETITION_SUPPORT_RECT, CHEEK_X),
    'wippen',
    FINISHES.keyWood,
  );
  const spring = addMesh(context, wippen.body, springGeometry(), 'repetitionLever', FINISHES.steel);
  spring.position.set(CHEEK_CENTRE, SPRING.bottom, SPRING.z);
  label(context, 'wippen', wippen.body, [0, WIPPEN.pivotY, WIPPEN.pivotZ + WIPPEN.capstanArm / 2]);

  const jack = pivotFrame(wippen.body, 'jack', JACK_PIVOT.y, JACK_PIVOT.z);
  const jackShape = roundedShape(JACK_PROFILE, ROUND.jack);
  const jackBody = profileAlongX(jackShape, -JACK_HALF_WIDTH, JACK_HALF_WIDTH, BEVEL.jack);
  addMesh(context, jack.body, jackBody, 'jack', ACTION_FINISHES.jack);
  label(context, 'jack', jack.body, [0, JACK_ANCHOR_Y - LABEL_INSET, JACK_Z]);

  const repetition = pivotFrame(wippen.body, 'repetition', REPETITION_PIVOT.y, REPETITION_PIVOT.z);
  const leverShape = roundedShape(REPETITION_PROFILE, ROUND.repetition);
  const lever = profileAlongX(leverShape, ...CHEEK_X, BEVEL.repetition);
  addMesh(context, repetition.body, lever, 'repetitionLever', ACTION_FINISHES.repetition);
  label(context, 'repetitionLever', repetition.body, [
    CHEEK_X[1],
    REPETITION_PIVOT.y + LABEL_INSET,
    REPETITION_PIVOT.z + 2 * LABEL_INSET,
  ]);

  return {
    pose(pose) {
      wippen.pivot.rotation.x = pose.wippen;
      jack.pivot.rotation.x = pose.jack;
      repetition.pivot.rotation.x = pose.repetition;
      spring.scale.y = pose.springScale;
    },
  };
}
