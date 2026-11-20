import type { RestSide } from '../../explainers/freestyle-swim/src/scene/parts/swimmer/skin/types.ts';
import type { RestJoints } from './restpose.ts';
import { length, sub, type Vec } from './vec.ts';

export function restJoints(joint: (name: string) => Vec): RestJoints {
  return {
    clavicle: joint('clavicle.R____head'),
    shoulder: joint('upperarm01.R____head'),
    elbow: joint('lowerarm01.R____head'),
    wrist: joint('wrist.R____head'),
    hip: joint('upperleg01.R____head'),
    knee: joint('lowerleg01.R____head'),
    ankle: joint('foot.R____head'),
    footTail: joint('foot.R____tail'),
  };
}

export interface RestLengths {
  shoulderHalfWidth: number;
  upperArm: number;
  forearm: number;
  hand: number;
  thigh: number;
  shin: number;
  foot: number;
  hipX: number;
  hipHalfWidth: number;
}

export function restLengths(rest: RestSide): RestLengths {
  const span = (a: Vec, b: Vec): number => length(sub(a, b));
  return {
    shoulderHalfWidth: Math.abs(rest.shoulder[2]),
    upperArm: span(rest.shoulder, rest.elbow),
    forearm: span(rest.elbow, rest.wrist),
    hand: span(rest.wrist, rest.fingertip),
    thigh: span(rest.hip, rest.knee),
    shin: span(rest.knee, rest.ankle),
    foot: span(rest.ankle, rest.toeTip),
    hipX: rest.hip[0],
    hipHalfWidth: Math.abs(rest.hip[2]),
  };
}
