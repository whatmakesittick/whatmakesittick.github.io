import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import type { Mesh } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import type { AssemblyState } from '../../ids';
import { strokeAt } from '../../model';
import { bodyPose } from '../pose';
import { createSkeleton, solveSkeleton } from '../rig/skeleton';
import { HandPath } from './handPath';

const UNITS = 400;
const MAX_DISTANCE_M = 0.02;
const OPTIONS = { pace: 'middle', kick: 'six', breathing: 'none', headUp: false } as const;

function stateAt(handPath: boolean): AssemblyState {
  const reading = strokeAt(UNITS, OPTIONS);
  return {
    phase: UNITS,
    playing: false,
    reading,
    ...OPTIONS,
    dragFactor: 1,
    entrySplash: reading.entrySplash,
    view: { labels: false, forces: false, underwater: false, handPath },
  };
}

function build(): HandPath {
  return new HandPath({
    materials: new MaterialLibrary(),
    textures: {} as SceneTextures,
    tracker: new ResourceTracker(),
  });
}

describe('hand path', () => {
  it('stays hidden when the view is off', () => {
    const path = build();
    path.setState(stateAt(false));
    expect(path.root.visible).toBe(false);
    expect((path.root.children[0] as Mesh).geometry.getAttribute('position')).toBeUndefined();
  });

  it('passes through the right hand', () => {
    const path = build();
    path.setState(stateAt(true));
    const state = stateAt(true);
    const hand = solveSkeleton(createSkeleton(), state.reading, 0, bodyPose(0, 0).y).arms.right
      .hand;
    const positions = (path.root.children[0] as Mesh).geometry.getAttribute('position');
    let nearest = Infinity;
    const point = new Vector3();
    for (let index = 0; index < positions.count; index++) {
      nearest = Math.min(nearest, point.fromBufferAttribute(positions, index).distanceTo(hand));
    }
    expect(path.root.visible).toBe(true);
    expect(nearest).toBeLessThan(MAX_DISTANCE_M);
  });
});
