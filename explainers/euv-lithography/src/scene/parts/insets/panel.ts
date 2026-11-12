import { ExtrudeGeometry, Mesh, SphereGeometry } from 'three';
import type { BufferGeometry, Object3D, Shape } from 'three';
import { roundedRectHole, roundedRectShape } from '@core/scene/geometry/extrude';
import type { Rect } from '@core/scene/geometry/extrude';
import type { PartId, Point } from '../../../ids';
import { mesh } from '../context';
import type { PartContext } from '../context';
import { INSET_FINISHES } from './finishes';
import {
  LEADER_DOT_M,
  LEADER_RADIUS_M,
  LEADER_SIDES,
  PANEL_CORNER_M,
  PANEL_DEPTH_M,
  RIM_DEPTH_M,
  RIM_WIDTH_M,
} from './dims';
import type { PanelSpec } from './dims';
import { finishMesh } from '../context';
import { segmentGeometry } from '../light/segments';

const HALF = 0.5;
const DOT_SEGMENTS = [10, 8] as const;

function extruded(shape: Shape, depth: number): BufferGeometry {
  const geometry = new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 6 });
  geometry.translate(0, 0, -depth * HALF);
  return geometry;
}

function rectOf(width: number, height: number, margin = 0): Rect {
  return {
    minA: -width * HALF + margin,
    minB: -height * HALF + margin,
    maxA: width * HALF - margin,
    maxB: height * HALF - margin,
  };
}

export function addPanel(
  context: PartContext,
  group: PartId,
  parent: Object3D,
  spec: PanelSpec,
): void {
  const outer = rectOf(spec.width, spec.height);
  const slab = mesh(
    context,
    extruded(roundedRectShape(outer, PANEL_CORNER_M), PANEL_DEPTH_M),
    group,
    'insetPanel',
  );
  const frame = roundedRectShape(outer, PANEL_CORNER_M);
  frame.holes.push(
    roundedRectHole(rectOf(spec.width, spec.height, RIM_WIDTH_M), PANEL_CORNER_M - RIM_WIDTH_M),
  );
  const rim = mesh(context, extruded(frame, RIM_DEPTH_M), group, 'insetLine');
  [slab, rim].forEach((part) => part.position.set(...spec.centre));
  parent.add(slab, rim);
}

export function addLeader(
  context: PartContext,
  group: PartId,
  parent: Object3D,
  from: Point,
  to: Point,
): void {
  const line = finishMesh(
    context,
    segmentGeometry(from, to, LEADER_RADIUS_M, LEADER_SIDES),
    group,
    INSET_FINISHES.leader,
  );
  const dot = new Mesh(
    context.tracker.track(new SphereGeometry(LEADER_DOT_M, ...DOT_SEGMENTS)),
    line.material,
  );
  dot.position.set(...to);
  parent.add(line, dot);
}
