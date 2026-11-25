import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import type { Group } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import type { AssemblyState } from '../../../ids';
import { gaitAt } from '../../../model/gait';
import { testPose } from '../../assembly.testkit';
import { FORCE_ARROW_M_PER_BW, ForceArrow } from './forces';

const OPTIONS = { pace: 'steady', stepRate: 0, arms: 'swing' } as const;
const BRAKING_UNITS = 60;
const PUSHING_UNITS = 280;
const PEAK_UNITS = 150;
const FLOAT_UNITS = 431;
const SETTLE_STEPS = 20;
const STEP_SECONDS = 0.05;
const UP = new Vector3(0, 1, 0);

function stateAt(units: number, forces = true): AssemblyState {
  return {
    phase: units,
    playing: false,
    reading: gaitAt(units, OPTIONS),
    ...OPTIONS,
    scrollM: 0,
    view: { labels: false, forces, formLines: false, footPath: false, follow: true },
  };
}

function build(): ForceArrow {
  return new ForceArrow({
    materials: new MaterialLibrary(),
    textures: {} as SceneTextures,
    tracker: new ResourceTracker(),
  });
}

function show(arrow: ForceArrow, state: AssemblyState): void {
  arrow.setState(state, testPose(state.reading));
  for (let step = 0; step < SETTLE_STEPS; step += 1) arrow.update(STEP_SECONDS);
}

function forceRoot(arrow: ForceArrow): Group {
  return arrow.root.children[0] as Group;
}

function forwardLean(arrow: ForceArrow): number {
  return UP.clone().applyQuaternion(forceRoot(arrow).quaternion).x;
}

describe('force arrow', () => {
  it('leans back while braking and forward while pushing', () => {
    const arrow = build();
    show(arrow, stateAt(BRAKING_UNITS));
    expect(forwardLean(arrow)).toBeLessThan(0);
    show(arrow, stateAt(PUSHING_UNITS));
    expect(forwardLean(arrow)).toBeGreaterThan(0);
  });

  it('starts at the contact point and scales by body weights', () => {
    const arrow = build();
    const state = stateAt(PEAK_UNITS);
    show(arrow, state);
    const contact = testPose(state.reading).legs.right.contact;
    expect(forceRoot(arrow).position.distanceTo(contact ?? new Vector3())).toBeLessThan(1e-6);
    const { fwdBW, vertBW, rightBW } = state.reading.force;
    const expected = Math.hypot(fwdBW, vertBW, rightBW) * FORCE_ARROW_M_PER_BW;
    const head = forceRoot(arrow).children[1];
    expect(head.position.y).toBeCloseTo(expected, 6);
  });

  it('hides in a float and when the toggle is off, then settles', () => {
    const arrow = build();
    show(arrow, stateAt(FLOAT_UNITS));
    expect(forceRoot(arrow).visible).toBe(false);
    show(arrow, stateAt(PEAK_UNITS, false));
    expect(arrow.root.visible).toBe(false);
    expect(arrow.update(STEP_SECONDS)).toBe(false);
    arrow.dispose();
  });
});
