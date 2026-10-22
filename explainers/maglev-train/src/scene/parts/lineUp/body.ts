import type { Object3D } from 'three';
import type { PartId } from '../../../ids';
import { namedGroup } from '../context';
import type { PartContext } from '../context';
import type { Point2 } from '../inset/strokes';
import { CUT_FACE_LIFT } from './constants';
import { cutFaceGeometry, cutMesh, finishMesh, sliceGeometry } from './cut';
import { LINE_UP_FINISHES } from './finishes';
import { band, between, distinct, halfOutline, lifted, mirrored, offset, widthAt } from './profile';
import type { BodyOutline } from './profile';

export interface BodySpec {
  readonly outline: BodyOutline;
  readonly bottom: number;
  readonly shell: number;
  readonly cabinFloor: number;
  readonly windows: { readonly from: number; readonly to: number; readonly thickness: number };
}

const FLOOR_THICKNESS = 0.06;

function mirrorBand(points: readonly Point2[]): Point2[] {
  return points.map(([a, y]): Point2 => [-a, y]).reverse();
}

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
  const { cabinFloor } = spec;
  return [
    [-half, cabinFloor - FLOOR_THICKNESS],
    [half, cabinFloor - FLOOR_THICKNESS],
    [half, cabinFloor],
    [-half, cabinFloor],
  ];
}

function addCutFace(context: PartContext, parent: Object3D, spec: BodySpec, part: PartId): void {
  const cabin = cutFaceGeometry(lifted(cabinOutline(spec), spec.bottom), CUT_FACE_LIFT.cabin);
  const floor = cutFaceGeometry(lifted(floorStrip(spec), spec.bottom), CUT_FACE_LIFT.detail);
  const under = cutFaceGeometry(lifted(underframeOutline(spec), spec.bottom), CUT_FACE_LIFT.cabin);
  parent.add(finishMesh(context, under, part, LINE_UP_FINISHES.underframe));
  parent.add(finishMesh(context, cabin, part, LINE_UP_FINISHES.cabin));
  parent.add(finishMesh(context, floor, part, LINE_UP_FINISHES.cabinFloor));
}

function addWindows(context: PartContext, parent: Object3D, spec: BodySpec, part: PartId): void {
  const { from, to, thickness } = spec.windows;
  const right = lifted(band(halfOutline(spec.outline), from, to, thickness), spec.bottom);
  const geometry = sliceGeometry([right, mirrorBand(right)]);
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
  return body;
}
