import { describe, expect, it } from 'vitest';
import { MaterialLibrary } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import type { AssemblyState } from '../../../ids';
import { gaitAt } from '../../../model/gait';
import { testPose } from '../../assembly.testkit';
import { toDegrees } from '@core/math';
import { FormLines, formLabels, shinShare } from './formLines';

const OPTIONS = { pace: 'steady', stepRate: 0, arms: 'swing' } as const;
const SETTLE_STEPS = 20;
const STEP_SECONDS = 0.05;
const MID_STANCE = 180;

function stateAt(units: number, formLines = true): AssemblyState {
  return {
    phase: units,
    playing: false,
    reading: gaitAt(units, OPTIONS),
    ...OPTIONS,
    scrollM: 0,
    view: { labels: false, forces: false, formLines, footPath: false, follow: true },
  };
}

function build(): FormLines {
  return new FormLines({
    materials: new MaterialLibrary(),
    textures: {} as SceneTextures,
    tracker: new ResourceTracker(),
  });
}

describe('form lines', () => {
  it('shows the shin line only around landing', () => {
    expect(shinShare(0)).toBe(1);
    expect(shinShare(950)).toBe(1);
    expect(shinShare(50)).toBe(1);
    expect(shinShare(500)).toBe(0);
    expect(shinShare(899)).toBe(0);
    expect(shinShare(101)).toBe(0);
  });

  it('labels the lean, the knee and the elbow with the readout values', () => {
    const reading = gaitAt(MID_STANCE, OPTIONS);
    expect(formLabels(reading)).toEqual({
      lean: Math.round(reading.upper.leanDeg),
      knee: Math.round(reading.right.kneeFlexDeg),
      elbow: Math.round(reading.upper.elbowDeg.right),
    });
  });

  it('draws the body line along the trunk, from the hips to the neck', () => {
    const pose = testPose(gaitAt(MID_STANCE, OPTIONS));
    const lean = toDegrees(Math.atan2(pose.chest.x - pose.pelvis.x, pose.chest.y - pose.pelvis.y));
    expect(lean).toBeGreaterThan(0);
    expect(lean).toBeLessThan(20);
  });

  it('fades in, settles and fades out', () => {
    const lines = build();
    const state = stateAt(MID_STANCE);
    lines.setState(state, testPose(state.reading));
    expect(lines.update(STEP_SECONDS)).toBe(true);
    for (let step = 0; step < SETTLE_STEPS; step += 1) lines.update(STEP_SECONDS);
    expect(lines.root.visible).toBe(true);
    expect(lines.update(STEP_SECONDS)).toBe(false);
    lines.setState(stateAt(MID_STANCE, false), testPose(state.reading));
    for (let step = 0; step < SETTLE_STEPS; step += 1) lines.update(STEP_SECONDS);
    expect(lines.root.visible).toBe(false);
    lines.dispose();
  });
});
