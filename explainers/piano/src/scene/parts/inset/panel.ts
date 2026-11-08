import { DoubleSide, Mesh, MeshBasicMaterial, RingGeometry } from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';
import {
  extrudeProfileAlongX,
  roundedRectHole,
  roundedRectShape,
} from '@core/scene/geometry/extrude';
import type { Rect } from '@core/scene/geometry/extrude';
import type { Point } from '../../../ids';
import { INSET } from '../../../model';
import { THEME } from '../../../theme';
import { FINISHES } from '../../finishes';
import { partMesh, registeredMaterial } from '../context';
import type { PartContext } from '../context';
import { QUARTER_TURN, mergeParts } from '../keyboard/geometry';
import { rod } from '../ghosts/shapes';
import { PANEL } from './window';
import type { Leader } from './window';

const LEADER_RADIUS = 0.0007;
const RING_WIDTH = 0.0012;
const RING_SEGMENTS = 32;

function centredRect(inset: number): Rect {
  const halfWidth = INSET.width / 2 - inset;
  const halfHeight = INSET.height / 2 - inset;
  return { minA: -halfWidth, minB: -halfHeight, maxA: halfWidth, maxB: halfHeight };
}

function frameGeometry(): BufferGeometry {
  const frame = roundedRectShape(centredRect(0), PANEL.corner);
  frame.holes.push(roundedRectHole(centredRect(PANEL.rim), PANEL.corner - PANEL.rim));
  return extrudeProfileAlongX(frame, -INSET.depth, PANEL.back);
}

function relative(point: Point, centre: Point): Point {
  return [point[0] - centre[0], point[1] - centre[1], point[2] - centre[2]];
}

function leaderGeometry(leader: Leader, centre: Point): BufferGeometry {
  const ring = new RingGeometry(PANEL.ringRadius - RING_WIDTH, PANEL.ringRadius, RING_SEGMENTS);
  ring.rotateY(-QUARTER_TURN).translate(...relative(leader.ring, centre));
  return mergeParts([
    rod(relative(leader.start, centre), relative(leader.end, centre), LEADER_RADIUS),
    ring,
  ]);
}

export function insetInk(context: PartContext): Material {
  return registeredMaterial(
    context,
    'inset',
    new MeshBasicMaterial({
      color: THEME.insetLine,
      side: DoubleSide,
      fog: false,
      toneMapped: false,
    }),
    false,
  );
}

export function buildLeader(
  context: PartContext,
  ink: Material,
  leader: Leader,
  centre: Point,
): Object3D {
  const mesh = new Mesh(context.tracker.track(leaderGeometry(leader, centre)), ink);
  mesh.name = 'insetLeader';
  return mesh;
}

export function buildPanel(context: PartContext, ink: Material): Object3D[] {
  const ground = roundedRectShape(centredRect(PANEL.rim), PANEL.corner - PANEL.rim);
  const frame = new Mesh(context.tracker.track(frameGeometry()), ink);
  frame.name = 'insetLines';
  return [
    partMesh(context, extrudeProfileAlongX(ground, 0, PANEL.back), 'inset', FINISHES.inset),
    frame,
  ];
}
