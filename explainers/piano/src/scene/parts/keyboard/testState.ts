import { MaterialLibrary } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import { createSceneTextures } from '@core/scene/textures';
import type { AssemblyState, PedalId, RegisterId, TouchId, ViewOptions } from '../../../ids';
import { actionPoseAt, harpsichordPoseAt, strokeReadingAt, uprightPoseAt } from '../../../model';
import { createCut } from '../cut';
import type { PartContext } from '../context';

const VIEW: ViewOptions = {
  sound: false,
  wave: false,
  inset: false,
  ghost: false,
  follow: false,
  labels: true,
  cutaway: true,
  lineUp: false,
};

export interface Choices {
  touch?: TouchId;
  pedal?: PedalId;
  register?: RegisterId;
  view?: Partial<ViewOptions>;
}

export function stateAt(units: number, choices: Choices = {}): AssemblyState {
  const { touch = 'medium', pedal = 'none', register = 'middle', view = {} } = choices;
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
    view: { ...VIEW, ...view },
  };
}

export function testContext(): PartContext {
  return {
    materials: new MaterialLibrary(),
    tracker: new ResourceTracker(),
    textures: createSceneTextures(),
    labels: new Map(),
    anchors: {},
    cut: createCut(),
  };
}
