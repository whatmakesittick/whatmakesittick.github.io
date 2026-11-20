import { Texture, Vector3 } from 'three';
import type { Group, Mesh, ShaderMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { MaterialLibrary } from '@core/scene/materials';
import { runNow } from '@core/scene/pacing';
import { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import { PACE_IDS } from '../../../ids';
import type { AssemblyState, PaceId } from '../../../ids';
import { SCROLL_PERIOD_M, strokeAt } from '../../../model';
import type { WaterCues } from './pool';
import { buildPool } from './pool';

const CYCLE_END = 1000;
const TOLERANCE = 1e-9;

function stateAt(units: number, pace: PaceId, underwater = false): AssemblyState {
  const reading = strokeAt(units, { pace, kick: 'six', breathing: 'none', headUp: false });
  return {
    phase: units,
    playing: false,
    reading,
    pace,
    kick: 'six',
    breathing: 'none',
    headUp: false,
    dragFactor: 1,
    entrySplash: reading.entrySplash,
    view: { labels: true, forces: false, underwater, handPath: false },
  };
}

const cues: WaterCues = {
  rightHand: new Vector3(0.4, -0.1, 0.3),
  leftHand: new Vector3(-0.3, -0.5, -0.3),
  head: new Vector3(0.8, 0, 0),
};

function build() {
  const textures = { dot: new Texture() } as unknown as SceneTextures;
  const context = { materials: new MaterialLibrary(), textures, tracker: new ResourceTracker() };
  return runNow(buildPool(context));
}

function scrolled(root: Group): number {
  return root.getObjectByName('ropeScroll')!.position.x;
}

function surfaceMaterial(root: Group): ShaderMaterial {
  return (root.children[0] as Mesh).material as ShaderMaterial;
}

describe('pool', () => {
  const pool = build();

  it('has the three label anchors', () => {
    expect(pool.anchors.waterline).toBeDefined();
    expect(pool.anchors.laneRope).toBeDefined();
    expect(pool.anchors.laneLine).toBeDefined();
  });

  it.each(PACE_IDS)('scrolls the same at both ends of a cycle at the %s pace', (pace) => {
    pool.setState(stateAt(0, pace), cues);
    const start = scrolled(pool.root);
    pool.setState(stateAt(CYCLE_END, pace), cues);
    const gap = Math.abs(start - scrolled(pool.root)) % SCROLL_PERIOD_M;
    expect(Math.min(gap, SCROLL_PERIOD_M - gap)).toBeLessThan(TOLERANCE);
  });

  it('stays still while paused and not easing', () => {
    pool.setState(stateAt(100, 'middle'), cues);
    while (pool.update(1)) continue;
    expect(pool.update(0.016)).toBe(false);
  });

  it('keeps the surface transparent in both view modes', () => {
    [false, true].forEach((underwater) => {
      pool.setState(stateAt(100, 'middle', underwater), cues);
      while (pool.update(1)) continue;
      const material = surfaceMaterial(pool.root);
      expect(material.transparent).toBe(true);
      expect(material.opacity).toBeLessThan(1);
    });
  });
});
