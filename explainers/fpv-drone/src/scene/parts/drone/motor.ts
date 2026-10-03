import { CylinderGeometry, Group, LatheGeometry, Vector2 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import type { MotorPartId } from '../../../ids';
import { MOTOR_POSITIONS } from '../../../model/layout';
import { MOTOR } from '../../constants';
import { FINISHES } from '../../finishes';
import { mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';

const DOME_INSET = 0.85;
const NUT_HEIGHT = 0.003;

export interface MotorLevels {
  foot: number;
  stator: number;
  bell: number;
  top: number;
  shaft: number;
}

export function motorLevels(): MotorLevels {
  const { base, heights } = MOTOR;
  const foot = base + heights.foot;
  const stator = foot + heights.stator;
  const bell = stator + heights.bell;
  return { foot, stator, bell, top: bell + heights.dome, shaft: bell + MOTOR.shaft.height };
}

function footGeometry(levels: MotorLevels): BufferGeometry {
  const foot = new CylinderGeometry(MOTOR.radius, MOTOR.radius, MOTOR.heights.foot, MOTOR.segments);
  foot.translate(0, MOTOR.base + MOTOR.heights.foot / 2, 0);
  const shaft = new CylinderGeometry(
    MOTOR.shaft.radius,
    MOTOR.shaft.radius,
    levels.shaft - levels.bell,
    MOTOR.segments / 2,
  );
  shaft.translate(0, (levels.bell + levels.shaft) / 2, 0);
  const nut = new CylinderGeometry(
    MOTOR.shaft.radius * 1.3,
    MOTOR.shaft.radius * 1.3,
    NUT_HEIGHT,
    MOTOR.segments / 2,
  );
  nut.translate(0, levels.shaft + NUT_HEIGHT / 2, 0);
  return mergeParts([foot, shaft, nut]);
}

function statorGeometry(levels: MotorLevels): BufferGeometry {
  const stator = new CylinderGeometry(
    MOTOR.statorRadius,
    MOTOR.statorRadius,
    MOTOR.heights.stator,
    MOTOR.segments,
  );
  stator.translate(0, (levels.foot + levels.stator) / 2, 0);
  return stator;
}

function bellSideGeometry(levels: MotorLevels): BufferGeometry {
  const side = new CylinderGeometry(
    MOTOR.radius,
    MOTOR.radius,
    MOTOR.heights.bell,
    MOTOR.segments,
    1,
    true,
  );
  side.translate(0, (levels.stator + levels.bell) / 2, 0);
  return side;
}

function bellTopGeometry(levels: MotorLevels): BufferGeometry {
  const inner = MOTOR.ring.inner * DOME_INSET;
  const profile = [
    new Vector2(MOTOR.shaft.radius, levels.top),
    new Vector2(inner, levels.top),
    new Vector2(MOTOR.ring.inner, levels.bell),
    new Vector2(MOTOR.radius, levels.bell),
  ];
  return new LatheGeometry(profile, MOTOR.segments);
}

function ringGeometry(levels: MotorLevels): BufferGeometry {
  const lift = MOTOR.ring.thickness;
  const profile = [
    new Vector2(MOTOR.ring.inner, levels.bell),
    new Vector2(MOTOR.ring.inner, levels.bell + lift),
    new Vector2(MOTOR.radius, levels.bell + lift),
    new Vector2(MOTOR.radius, levels.bell),
  ];
  return new LatheGeometry(profile, MOTOR.segments);
}

export interface MotorPart {
  object: Group;
  label: Object3D;
}

export function buildMotor(context: PartContext, id: MotorPartId): MotorPart {
  const levels = motorLevels();
  const object = new Group();
  object.position.set(...MOTOR_POSITIONS[id]);
  object.add(
    partMesh(context, footGeometry(levels), id, FINISHES.motorBase),
    partMesh(context, statorGeometry(levels), id, FINISHES.copper),
    partMesh(context, bellSideGeometry(levels), id, context.looks.bell),
    partMesh(context, bellTopGeometry(levels), id, FINISHES.cameraBody),
    partMesh(context, ringGeometry(levels), id, FINISHES.bellRing),
  );
  const label = anchorAt(object, 0, levels.top, 0);
  return { object, label };
}
