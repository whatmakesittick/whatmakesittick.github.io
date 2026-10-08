import { Curve, TubeGeometry, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Point } from '../../../ids';
import { CONDUCTOR } from './gridConstants';

export type Span = readonly [from: Point, to: Point];

export function sagPoint(from: Point, to: Point, share: number): Point {
  const sag = 4 * CONDUCTOR.sagM * share * (1 - share);
  return [
    from[0] + (to[0] - from[0]) * share,
    from[1] + (to[1] - from[1]) * share - sag,
    from[2] + (to[2] - from[2]) * share,
  ];
}

class SagCurve extends Curve<Vector3> {
  private readonly span: Span;

  constructor(span: Span) {
    super();
    this.span = span;
  }

  override getPoint(share: number, target = new Vector3()): Vector3 {
    return target.set(...sagPoint(...this.span, share));
  }
}

function conductor(span: Span): BufferGeometry {
  const tube = new TubeGeometry(
    new SagCurve(span),
    CONDUCTOR.samples,
    CONDUCTOR.radius,
    CONDUCTOR.sides,
  );
  tube.setAttribute('lateral', tube.getAttribute('normal').clone());
  return tube;
}

export function conductorGeometry(spans: readonly Span[]): BufferGeometry {
  const tubes = spans.map(conductor);
  const merged = mergeGeometries(tubes);
  tubes.forEach((tube) => tube.dispose());
  if (!merged) throw new Error('Grid conductors do not share attributes');
  return merged;
}
