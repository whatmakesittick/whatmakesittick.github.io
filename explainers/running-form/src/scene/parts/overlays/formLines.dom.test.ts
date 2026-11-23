import { describe, expect, it } from 'vitest';
import { MaterialLibrary } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import type { AssemblyState } from '../../../ids';
import { gaitAt } from '../../../model/gait';
import { referencePose } from '../../runnerPose';
import { FormLines, includedDegrees, leanDegrees, shinShare } from './formLines';

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

  it('measures the lean and the joint angles on the pose', () => {
    const pose = referencePose(gaitAt(MID_STANCE, OPTIONS));
    const lean = leanDegrees(pose, pose.legs.right.ankle);
    expect(lean).toBeGreaterThan(0);
    expect(lean).toBeLessThan(15);
    const reading = gaitAt(MID_STANCE, OPTIONS);
    const leg = pose.legs.right;
    const bend = 180 - includedDegrees(leg.hip, leg.knee, leg.ankle);
    expect(bend).toBeCloseTo(reading.right.kneeFlexDeg, 0);
  });

  it('fades in, settles and fades out', () => {
    const lines = build();
    const state = stateAt(MID_STANCE);
    lines.setState(state, referencePose(state.reading));
    expect(lines.update(STEP_SECONDS)).toBe(true);
    for (let step = 0; step < SETTLE_STEPS; step += 1) lines.update(STEP_SECONDS);
    expect(lines.root.visible).toBe(true);
    expect(lines.update(STEP_SECONDS)).toBe(false);
    lines.setState(stateAt(MID_STANCE, false), referencePose(state.reading));
    for (let step = 0; step < SETTLE_STEPS; step += 1) lines.update(STEP_SECONDS);
    expect(lines.root.visible).toBe(false);
    lines.dispose();
  });
});
