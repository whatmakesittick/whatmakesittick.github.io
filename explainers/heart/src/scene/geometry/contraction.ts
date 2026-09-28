import { CHAMBERS, SEPTUM, VALVES } from '../../model';
import type { ChamberId } from '../../ids';
import { APEX } from '../../model';
import type { Vec3 } from './field';

export interface ContractionProfile {
  readonly radial: number;
  readonly rightRadial: number;
  readonly longitudinal: number;
  readonly atrial: number;
}

export interface ContractionFrame {
  readonly baseY: number;
  readonly ventricleRampMm: number;
  readonly atriumRampMm: number;
  readonly septumBlendMm: number;
  readonly rightAxisOffsetMm: number;
  readonly atriumReach: number;
  readonly atriumFadeMm: number;
}

export type Offset = [x: number, y: number, z: number];

export type OffsetField = (x: number, y: number, z: number, out: Offset) => Offset;

const ATRIA: readonly ChamberId[] = ['rightAtrium', 'leftAtrium'];

function smoothstep(edge0: number, edge1: number, value: number): number {
  const share = Math.min(Math.max((value - edge0) / (edge1 - edge0), 0), 1);
  return share * share * (3 - 2 * share);
}

export function ventricleWeight(frame: ContractionFrame, y: number): number {
  return smoothstep(frame.baseY, frame.baseY - frame.ventricleRampMm, y);
}

export function leftAxisX(y: number): number {
  const base = VALVES.mitral.centre;
  const share = (base[1] - y) / (base[1] - APEX[1]);
  return base[0] + (APEX[0] - base[0]) * share;
}

export function squeezeOffset(frame: ContractionFrame, profile: ContractionProfile): OffsetField {
  const rightAxis = SEPTUM.x - frame.rightAxisOffsetMm;
  return (x, y, z, out) => {
    const weight = ventricleWeight(frame, y);
    const left = smoothstep(SEPTUM.x - frame.septumBlendMm, SEPTUM.x + frame.septumBlendMm, x);
    const leftPull = -(x - leftAxisX(y)) * profile.radial;
    const rightPull = -(x - rightAxis) * profile.rightRadial;
    const depthPull = -z * (profile.radial * left + profile.rightRadial * (1 - left));
    out[0] = weight * (leftPull * left + rightPull * (1 - left));
    out[1] = weight * (frame.baseY - y) * profile.longitudinal;
    out[2] = weight * depthPull;
    return out;
  };
}

function atriumWeight(frame: ContractionFrame, chamber: ChamberId, point: Vec3): number {
  const { centre, radii, wall } = CHAMBERS[chamber];
  const reach = (axis: number) => (radii[axis] + wall) * frame.atriumReach;
  const scaled = Math.hypot(
    (point[0] - centre[0]) / reach(0),
    (point[1] - centre[1]) / reach(1),
    (point[2] - centre[2]) / reach(2),
  );
  const fade = frame.atriumFadeMm / Math.min(reach(0), reach(1), reach(2));
  return 1 - smoothstep(1, 1 + fade, scaled);
}

export function emptyingOffset(frame: ContractionFrame, profile: ContractionProfile): OffsetField {
  return (x, y, z, out) => {
    const above = smoothstep(frame.baseY, frame.baseY + frame.atriumRampMm, y);
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    if (above === 0) return out;
    for (const chamber of ATRIA) {
      const weight = above * atriumWeight(frame, chamber, [x, y, z]) * profile.atrial;
      if (weight === 0) continue;
      const { centre } = CHAMBERS[chamber];
      out[0] -= (x - centre[0]) * weight;
      out[1] -= (y - centre[1]) * weight;
      out[2] -= z * weight;
    }
    return out;
  };
}

export interface Contraction {
  readonly squeeze: OffsetField;
  readonly emptying: OffsetField;
}

export function contraction(frame: ContractionFrame, profile: ContractionProfile): Contraction {
  return { squeeze: squeezeOffset(frame, profile), emptying: emptyingOffset(frame, profile) };
}

const scratch: Offset = [0, 0, 0];

export function displace(
  motion: Contraction,
  point: Vec3,
  squeeze: number,
  emptying: number,
  out: Offset,
): Offset {
  const [x, y, z] = point;
  motion.squeeze(x, y, z, scratch);
  out[0] = x + scratch[0] * squeeze;
  out[1] = y + scratch[1] * squeeze;
  out[2] = z + scratch[2] * squeeze;
  motion.emptying(x, y, z, scratch);
  out[0] += scratch[0] * emptying;
  out[1] += scratch[1] * emptying;
  out[2] += scratch[2] * emptying;
  return out;
}
