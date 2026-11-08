import { CatmullRomCurve3, TubeGeometry, Vector3 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { FULL_TURN } from '@core/math';
import { JACK_ANCHOR_Y, JACK_Z, WIPPEN } from '../../../model';
import { FINISHES } from '../../finishes';
import { label } from '../context';
import type { PartContext } from '../context';
import { mergeParts, profileAlongX, rectShape, roundedShape } from '../keyboard/geometry';
import type { Rect } from '../keyboard/geometry';
import {
  CHEEK_X,
  CUSHION_RECT,
  JACK_HALF_WIDTH,
  JACK_PIVOT,
  JACK_PROFILE,
  REPETITION_PIVOT,
  REPETITION_PROFILE,
  REPETITION_SUPPORT_RECT,
  SPRING,
  WIPPEN_PROFILE,
  WIPPEN_X,
} from './dimensions';
import { ACTION_FINISHES } from './finishes';
import { addMesh, pivotFrame } from './meshes';
import type { Piece } from './meshes';

const ROUND = { wippen: 0.0015, jack: 0.0008, repetition: 0.001 } as const;
const BEVEL = { wippen: 0.0006, jack: 0.0005, repetition: 0.0004 } as const;
const SPRING_STEPS_PER_TURN = 10;
const SPRING_SIDES = 4;
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

export function buildLevers(context: PartContext, parent: Object3D): Piece {
  const wippen = pivotFrame(parent, 'wippen', WIPPEN.pivotY, WIPPEN.pivotZ);
  const body = mergeParts([
    profileAlongX(roundedShape(WIPPEN_PROFILE, ROUND.wippen), ...WIPPEN_X, BEVEL.wippen),
    alongX(REPETITION_SUPPORT_RECT, CHEEK_X),
  ]);
  addMesh(context, wippen.body, body, 'wippen', ACTION_FINISHES.wippen);
  addMesh(context, wippen.body, alongX(CUSHION_RECT, WIPPEN_X), 'wippen', FINISHES.cloth);
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
