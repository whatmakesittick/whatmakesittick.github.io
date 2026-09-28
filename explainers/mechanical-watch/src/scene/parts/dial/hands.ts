import { Group } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { toRadians } from '@core/math';
import { anchorAt } from '@core/scene/parts';
import type { PartId } from '../../../ids';
import type { Point } from '../../../model/layout';
import type { Span } from '../../../model/scale';
import { ANCHOR_LIFT_MM, SECOND_COUNTERWEIGHT, SEGMENTS } from '../../constants';
import type { HandForm } from '../../constants';
import { FacetBuilder } from '../../geometry/facets';
import { merge } from '../../geometry/merge';
import type { Vec3 } from '../../geometry/solids';
import { disc } from '../../geometry/solids';
import { partMesh } from '../context';
import type { PartContext } from '../context';

const FRONT: Vec3 = [0, 0, -1];
const BACK: Vec3 = [0, 0, 1];
const LABEL_SHARE = 0.62;

interface Outline {
  readonly tip: readonly [number, number];
  readonly right: readonly [number, number];
  readonly tail: readonly [number, number];
  readonly left: readonly [number, number];
}

function outlineOf(form: HandForm): Outline {
  const widest = form.length * form.widestShare;
  return {
    tip: [0, form.length],
    right: [form.halfWidth, widest],
    tail: [0, -form.tail],
    left: [-form.halfWidth, widest],
  };
}

function bladeGeometry(form: HandForm, level: Span): BufferGeometry {
  const [front, back] = level;
  const { tip, right, tail, left } = outlineOf(form);
  const edge = front + form.ridge;
  const at = (point: readonly [number, number], z: number): Vec3 => [point[0], point[1], z];
  const builder = new FacetBuilder()
    .triangle(at(tail, front), at(right, edge), at(tip, front), FRONT)
    .triangle(at(tail, front), at(tip, front), at(left, edge), FRONT)
    .quad(at(tip, back), at(right, back), at(tail, back), at(left, back), BACK);
  const ring = [tip, right, tail, left];
  ring.forEach((point, index) => {
    const next = ring[(index + 1) % ring.length];
    const outward: Vec3 = [-(next[1] - point[1]), next[0] - point[0], 0];
    const pointFront = point === tip || point === tail ? front : edge;
    const nextFront = next === tip || next === tail ? front : edge;
    builder.quad(
      at(point, pointFront),
      at(next, nextFront),
      at(next, back),
      at(point, back),
      outward,
    );
  });
  return builder.build();
}

function handGeometry(form: HandForm, level: Span, counterweight: boolean): BufferGeometry {
  const parts = [
    bladeGeometry(form, level),
    disc({ x: 0, y: 0, r: form.bossRadius }, level, SEGMENTS.hub),
  ];
  if (counterweight) {
    const at = { x: 0, y: -form.tail * SECOND_COUNTERWEIGHT.at, r: SECOND_COUNTERWEIGHT.radius };
    parts.push(disc(at, level, SEGMENTS.hub));
  }
  return merge(parts);
}

export class HandPart {
  readonly object = new Group();
  readonly label: Object3D;

  constructor(
    context: PartContext,
    frame: Object3D,
    id: PartId,
    form: HandForm,
    level: Span,
    centre: Point,
  ) {
    this.object.position.set(centre.x, centre.y, 0);
    this.object.add(partMesh(context, handGeometry(form, level, id === 'secondHand'), id, 'blued'));
    frame.add(this.object);
    this.label = anchorAt(this.object, 0, form.length * LABEL_SHARE, level[0] - ANCHOR_LIFT_MM);
  }

  setAngle(degrees: number): void {
    this.object.rotation.z = toRadians(degrees);
  }
}
