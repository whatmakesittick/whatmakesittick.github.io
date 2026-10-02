import { CylinderGeometry, Group, Path } from 'three';
import type { BufferGeometry } from 'three';
import { extrudePlan, planShape, roundedRectShape } from '@core/scene/geometry/extrude';
import { MOTOR_PART_IDS } from '../../../ids';
import type { MotorPartId } from '../../../ids';
import { DRONE, MOTOR_POSITIONS } from '../../../model/layout';
import { ARMS, PLATE, STANDOFFS } from '../../constants';
import { FINISHES } from '../../finishes';
import { mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';

const FULL_TURN = Math.PI * 2;
const LABEL_X_SHARE = 0.3;

export interface ArmLine {
  root: readonly [x: number, z: number];
  tip: readonly [x: number, z: number];
  direction: readonly [x: number, z: number];
}

export function armLine(id: MotorPartId): ArmLine {
  const root = ARMS.roots[id];
  const motor = MOTOR_POSITIONS[id];
  const dx = motor[0] - root[0];
  const dz = motor[2] - root[1];
  const length = Math.hypot(dx, dz);
  const direction = [dx / length, dz / length] as const;
  return {
    root,
    tip: [motor[0] + direction[0] * ARMS.overhang, motor[2] + direction[1] * ARMS.overhang],
    direction,
  };
}

function plateGeometry(bottom: number, top: number, holed: boolean): BufferGeometry {
  const shape = roundedRectShape(
    { minA: PLATE.x[0], maxA: PLATE.x[1], minB: -PLATE.halfWidth, maxB: PLATE.halfWidth },
    PLATE.corner,
  );
  if (holed) {
    for (const hole of PLATE.holes) {
      shape.holes.push(new Path().absarc(hole.x, hole.z, hole.radius, 0, FULL_TURN, false));
    }
  }
  return extrudePlan(shape, bottom, top);
}

function armGeometry(id: MotorPartId): BufferGeometry {
  const { root, tip, direction } = armLine(id);
  const half = ARMS.width / 2;
  const across = [-direction[1] * half, direction[0] * half] as const;
  const shape = planShape([
    { x: root[0] + across[0], z: root[1] + across[1] },
    { x: tip[0] + across[0], z: tip[1] + across[1] },
    { x: tip[0] - across[0], z: tip[1] - across[1] },
    { x: root[0] - across[0], z: root[1] - across[1] },
  ]);
  return extrudePlan(shape, 0, ARMS.thickness);
}

function standoffGeometry(): BufferGeometry {
  return mergeParts(
    STANDOFFS.spots.map(([x, z]) => {
      const post = new CylinderGeometry(
        STANDOFFS.radius,
        STANDOFFS.radius,
        PLATE.gap,
        STANDOFFS.segments,
      );
      post.translate(x, PLATE.gap / 2, z);
      return post;
    }),
  );
}

function feetGeometry(): BufferGeometry {
  const { foot } = ARMS;
  const height = DRONE.restHeight - PLATE.thickness;
  return mergeParts(
    MOTOR_PART_IDS.map((id) => {
      const motor = MOTOR_POSITIONS[id];
      const { direction } = armLine(id);
      const peg = new CylinderGeometry(foot.radius, foot.radius * 0.8, height, foot.segments);
      peg.translate(
        motor[0] - direction[0] * foot.inboard,
        -PLATE.thickness - height / 2,
        motor[2] - direction[1] * foot.inboard,
      );
      return peg;
    }),
  );
}

export function buildFrame(context: PartContext): Group {
  const frame = new Group();
  const carbon = mergeParts([
    plateGeometry(-PLATE.thickness, 0, true),
    plateGeometry(PLATE.gap, PLATE.gap + PLATE.thickness, false),
    ...MOTOR_PART_IDS.map((id) => armGeometry(id)),
  ]);
  frame.add(
    partMesh(context, carbon, 'frame', context.looks.carbon),
    partMesh(context, standoffGeometry(), 'frame', FINISHES.aluminium),
    partMesh(context, feetGeometry(), 'frame', FINISHES.printed),
  );
  return frame;
}

export function frameLabelSpot(): readonly [number, number, number] {
  return [PLATE.x[0] * LABEL_X_SHARE, PLATE.gap + PLATE.thickness, -PLATE.halfWidth];
}
