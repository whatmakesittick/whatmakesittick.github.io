import { describe, expect, it } from 'vitest';
import { MaterialLibrary } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import type { AssemblyState } from '../../ids';
import { strokeAt } from '../../model';
import { bodyPose } from '../pose';
import { createSkeleton, solveSkeleton } from '../rig/skeleton';
import { ForceArrows } from './forces';

const SETTLE_STEPS = 20;
const STEP_SECONDS = 0.1;
const PUSH_UNITS = 450;
const ENTRY_UNITS = 20;
const TOLERANCE = 1e-6;

function stateAt(units: number, headUp = false, forces = true): AssemblyState {
  const options = { pace: 'middle', kick: 'six', breathing: 'none', headUp } as const;
  const reading = strokeAt(units, options);
  return {
    phase: units,
    playing: false,
    reading,
    ...options,
    dragFactor: reading.dragFactor,
    entrySplash: reading.entrySplash,
    view: { labels: false, forces, underwater: false, handPath: false },
  };
}

function build() {
  const context = {
    materials: new MaterialLibrary(),
    textures: {} as SceneTextures,
    tracker: new ResourceTracker(),
  };
  return new ForceArrows(context);
}

function show(arrows: ForceArrows, state: AssemblyState): void {
  const skeleton = solveSkeleton(
    createSkeleton(),
    state.reading,
    state.headUp ? 1 : 0,
    bodyPose(state.headUp ? 1 : 0, 0).y,
  );
  arrows.setState(state, skeleton);
  for (let step = 0; step < SETTLE_STEPS; step++) arrows.update(STEP_SECONDS);
}

function handLength(arrows: ForceArrows): number {
  const head = arrows.root.children[0].children[1];
  return head.position.y;
}

function dragLength(arrows: ForceArrows): number {
  return arrows.root.children[4].children[1].position.y;
}

describe('force arrows', () => {
  it('draws a longer thrust arrow in the push than at entry', () => {
    const arrows = build();
    show(arrows, stateAt(ENTRY_UNITS));
    const entry = handLength(arrows);
    show(arrows, stateAt(PUSH_UNITS));
    expect(handLength(arrows)).toBeGreaterThan(entry);
  });

  it('triples the drag arrow with the head up', () => {
    const arrows = build();
    show(arrows, stateAt(PUSH_UNITS));
    const down = dragLength(arrows);
    show(arrows, stateAt(PUSH_UNITS, true));
    expect(dragLength(arrows) / down).toBeCloseTo(3, 0);
  });

  it('hides when forces are off and settles', () => {
    const arrows = build();
    show(arrows, stateAt(PUSH_UNITS));
    expect(arrows.root.visible).toBe(true);
    expect(arrows.update(STEP_SECONDS)).toBe(false);
    show(arrows, stateAt(PUSH_UNITS, false, false));
    expect(arrows.root.visible).toBe(false);
    expect(arrows.update(STEP_SECONDS)).toBe(false);
    expect(Math.abs(arrows.root.position.x)).toBeLessThan(TOLERANCE);
  });
});
