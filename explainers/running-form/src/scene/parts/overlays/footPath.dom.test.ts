import { describe, expect, it } from 'vitest';
import type { Mesh } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import type { AssemblyState, PaceId } from '../../../ids';
import { ankleAgainstHip } from '../../../model/footPath';
import { gaitAt } from '../../../model/gait';
import { testPose } from '../../assembly.testkit';
import { FOOT_PATH_PLANE_Z_M, FootPath } from './footPath';

const SETTLE_STEPS = 20;
const STEP_SECONDS = 0.05;
const UNITS = 300;

function stateAt(units: number, pace: PaceId = 'steady'): AssemblyState {
  const options = { pace, stepRate: 0, arms: 'swing' } as const;
  return {
    phase: units,
    playing: false,
    reading: gaitAt(units, options),
    ...options,
    scrollM: 0,
    view: { labels: false, forces: false, formLines: false, footPath: true, follow: true },
  };
}

function build(): FootPath {
  return new FootPath({
    materials: new MaterialLibrary(),
    textures: {} as SceneTextures,
    tracker: new ResourceTracker(),
  });
}

function show(path: FootPath, state: AssemblyState): void {
  path.setState(state, testPose(state.reading));
  for (let step = 0; step < SETTLE_STEPS; step += 1) path.update(STEP_SECONDS);
}

describe('foot path', () => {
  it('draws the loop beside the hip with the dot at the ankle', () => {
    const path = build();
    const state = stateAt(UNITS);
    show(path, state);
    const hip = testPose(state.reading).legs.right.hip;
    expect(path.root.position.z).toBe(FOOT_PATH_PLANE_Z_M);
    expect(path.root.position.x).toBeCloseTo(hip.x, 6);
    const dot = path.root.children[1];
    const ankle = ankleAgainstHip(UNITS, 'steady', 0);
    expect(dot.position.x).toBeCloseTo(ankle.x, 6);
    expect(dot.position.y).toBeCloseTo(ankle.y, 6);
  });

  it('rebuilds the loop when the pace changes', () => {
    const path = build();
    show(path, stateAt(UNITS));
    const loop = path.root.children[0] as Mesh;
    const first = loop.geometry;
    show(path, stateAt(UNITS, 'fast'));
    expect(loop.geometry).not.toBe(first);
    path.dispose();
  });
});
