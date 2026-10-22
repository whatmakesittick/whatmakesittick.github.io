import type { Object3D } from 'three';
import type { PartId } from '../../../ids';
import { finishMesh, namedGroup } from '../context';
import type { PartContext } from '../context';
import type { Point2 } from '../inset/strokes';
import { CUT_FACE_LIFT, SEAT } from './constants';
import { cutFaceMesh, cutMesh, sliceGeometry } from './cut';
import { LINE_UP_FINISHES } from './finishes';
import { mirrorOutline, rectOutline, trapezoid } from './layout';
import {
  band,
  between,
  distinct,
  halfOutline,
  lifted,
  mirrored,
  offset,
  roundedRect,
  widthAt,
} from './profile';
import type { BodyOutline } from './profile';

export interface BodySpec {
  readonly outline: BodyOutline;
  readonly bottom: number;
  readonly shell: number;
  readonly cabinFloor: number;
  readonly seats: readonly number[];
  readonly windows: { readonly from: number; readonly to: number; readonly thickness: number };
}

const FLOOR_THICKNESS = 0.06;

export function innerOutline(spec: BodySpec, from: number, to: number): Point2[] {
  const side = offset(between(halfOutline(spec.outline), from, to), -spec.shell).map(
    ([a, y]): Point2 => [Math.max(0, a), Math.min(Math.max(y, from), to)],
  );
  const top = side[side.length - 1][1];
  return mirrored(distinct([[0, from], ...side, [0, top]]));
}

export function cabinOutline(spec: BodySpec): Point2[] {
  return innerOutline(spec, spec.cabinFloor, spec.outline.height);
}

function underframeOutline(spec: BodySpec): Point2[] {
  return innerOutline(spec, spec.shell, spec.cabinFloor - FLOOR_THICKNESS);
}

function floorStrip(spec: BodySpec): Point2[] {
  const half = widthAt(halfOutline(spec.outline), spec.cabinFloor) - spec.shell;
  return trapezoid(half, half, spec.cabinFloor - FLOOR_THICKNESS, spec.cabinFloor);
}

export function seatOutlines(spec: BodySpec): Point2[][] {
  const { width, cushion, cushionHeight, backTop, backWidth, radius } = SEAT;
  const floor = spec.cabinFloor;
  const seatTop = floor + cushion;
  return spec.seats.flatMap((centre) => [
    rectOutline(centre - width / 2, centre + width / 2, seatTop - cushionHeight, seatTop),
    rectOutline(centre - width / 8, centre + width / 8, floor, seatTop - cushionHeight),
    roundedRect(
      {
        minA: centre - backWidth / 2,
        maxA: centre + backWidth / 2,
        minB: seatTop - cushionHeight / 2,
        maxB: floor + backTop,
      },
      radius,
    ),
  ]);
}

function addSeats(context: PartContext, parent: Object3D, spec: BodySpec, part: PartId): void {
  const { seat } = LINE_UP_FINISHES;
  parent.add(
    cutFaceMesh(context, part, seat, seatOutlines(spec), spec.bottom, CUT_FACE_LIFT.detail),
  );
}

function addCutFace(context: PartContext, parent: Object3D, spec: BodySpec, part: PartId): void {
  const { underframe, cabin, cabinFloor } = LINE_UP_FINISHES;
  const { bottom } = spec;
  parent.add(
    cutFaceMesh(context, part, underframe, [underframeOutline(spec)], bottom, CUT_FACE_LIFT.cabin),
    cutFaceMesh(context, part, cabin, [cabinOutline(spec)], bottom, CUT_FACE_LIFT.cabin),
    cutFaceMesh(context, part, cabinFloor, [floorStrip(spec)], bottom, CUT_FACE_LIFT.detail),
  );
}

function addWindows(context: PartContext, parent: Object3D, spec: BodySpec, part: PartId): void {
  const { from, to, thickness } = spec.windows;
  const right = lifted(band(halfOutline(spec.outline), from, to, thickness), spec.bottom);
  const geometry = sliceGeometry([right, mirrorOutline(right)]);
  parent.add(finishMesh(context, geometry, part, LINE_UP_FINISHES.windowBand));
}

export function buildBody(context: PartContext, spec: BodySpec, part: PartId): Object3D {
  const body = namedGroup(`${part}Body`);
  const outline = lifted(mirrored(halfOutline(spec.outline)), spec.bottom);
  body.add(
    cutMesh(
      context,
      sliceGeometry([outline]),
      part,
      LINE_UP_FINISHES.body,
      LINE_UP_FINISHES.bodyCap,
    ),
  );
  addWindows(context, body, spec, part);
  addCutFace(context, body, spec, part);
  addSeats(context, body, spec, part);
  return body;
}
