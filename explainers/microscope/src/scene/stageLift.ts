import { MICROMETRES_PER_MM, OBJECTIVES } from '../model';
import type { ObjectiveId } from '../model';
import { FOCUS_LIFT } from './constants';

export function stageLift(focus: number, objective: ObjectiveId): number {
  const limit = OBJECTIVES[objective].workingDistance * FOCUS_LIFT.workingDistanceShare;
  const lift = (Math.abs(focus) / MICROMETRES_PER_MM) * FOCUS_LIFT.exaggeration;
  return Math.sign(focus) * Math.min(lift, limit);
}
