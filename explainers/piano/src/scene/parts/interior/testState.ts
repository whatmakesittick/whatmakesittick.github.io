import type { AssemblyState, PedalId, RegisterId, TouchId, ViewOptions } from '../../../ids';
import { actionPoseAt, harpsichordPoseAt, strokeReadingAt, uprightPoseAt } from '../../../model';

export const QUIET_VIEWS: ViewOptions = {
  sound: false,
  wave: false,
  inset: false,
  ghost: false,
  follow: false,
  labels: true,
  cutaway: false,
  lineUp: false,
};

export interface StateChoices {
  readonly touch?: TouchId;
  readonly pedal?: PedalId;
  readonly register?: RegisterId;
  readonly view?: Partial<ViewOptions>;
}

export function interiorState(units: number, choices: StateChoices = {}): AssemblyState {
  const { touch = 'hard', pedal = 'none', register = 'middle', view = {} } = choices;
  return {
    phase: units,
    playing: false,
    touch,
    pedal,
    register,
    compare: 'grand',
    stroke: strokeReadingAt(units, touch, pedal, register),
    action: actionPoseAt(units, touch, pedal, register),
    upright: uprightPoseAt(units, touch, pedal, register),
    harpsichord: harpsichordPoseAt(units, touch, register),
    view: { ...QUIET_VIEWS, ...view },
  };
}
