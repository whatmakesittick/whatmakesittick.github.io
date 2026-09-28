import { CatmullRomCurve3, TubeGeometry } from 'three';
import type { BufferGeometry, Curve, Vector3 } from 'three';
import { FULL_TURN } from '@core/math';
import type { Detail } from '../constants';
import { mergeParts } from './merge';
import { sphereAt } from './solids';

export interface CoilForm {
  readonly strandRadius: number;
  readonly windRadius: number;
  readonly turns: number;
}

const STRAND_PHASES = [0, Math.PI] as const;

export function strandPoints(
  curve: Curve<Vector3>,
  form: CoilForm,
  phase: number,
  samples: number,
): Vector3[] {
  const frames = curve.computeFrenetFrames(samples, false);
  return frames.tangents.map((_, index) => {
    const share = index / samples;
    const angle = phase + share * form.turns * FULL_TURN;
    return curve
      .getPointAt(share)
      .addScaledVector(frames.normals[index], Math.cos(angle) * form.windRadius)
      .addScaledVector(frames.binormals[index], Math.sin(angle) * form.windRadius);
  });
}

function strand(points: readonly Vector3[], radius: number, detail: Detail): BufferGeometry[] {
  const path = new CatmullRomCurve3([...points]);
  return [
    new TubeGeometry(path, detail.tube, radius, detail.radial, false),
    sphereAt(points[0], radius, detail),
    sphereAt(points[points.length - 1], radius, detail),
  ];
}

export function coiledPair(curve: Curve<Vector3>, form: CoilForm, detail: Detail): BufferGeometry {
  return mergeParts(
    STRAND_PHASES.flatMap((phase) =>
      strand(strandPoints(curve, form, phase, detail.tube), form.strandRadius, detail),
    ),
  );
}
