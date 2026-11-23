import { describe, expect, it } from 'vitest';
import { Texture, Vector3 } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import type { SceneTextures } from '@core/scene/textures';
import { runNow } from '@core/scene/pacing';
import { ANCHOR_IDS, PART_IDS, REGION_IDS } from '../ids';
import type { AssemblyState } from '../ids';
import { gaitAt } from '../model/gait';
import { createAssembly } from './assembly';
import type { Assembly } from './assembly';

const VIEW = { labels: true, forces: false, formLines: false, footPath: false, follow: true };

function stateAt(phase: number, scrollM = 0): AssemblyState {
  const options = { pace: 'steady', stepRate: 0, arms: 'swing' } as const;
  return {
    phase,
    playing: false,
    reading: gaitAt(phase, options),
    ...options,
    scrollM,
    view: VIEW,
  };
}

describe('placeholder assembly', () => {
  const resources = {
    materials: new MaterialLibrary(),
    textures: {
      dot: new Texture(),
      glow: new Texture(),
      shadow: new Texture(),
      dispose: () => {},
    } as SceneTextures,
  };

  function build(): Assembly {
    return runNow(createAssembly(resources, stateAt(0)));
  }

  it('has every label anchor, anchor and region', () => {
    const assembly = build();
    PART_IDS.forEach((id) => expect(assembly.labelAnchors().get(id)).toBeDefined());
    ANCHOR_IDS.forEach((id) => expect(assembly.anchor(id)).toBeDefined());
    REGION_IDS.forEach((id) => expect(assembly.region(id).isEmpty()).toBe(false));
    assembly.dispose();
  });

  it('lifts the pelvis in the float and lowers it in the stance', () => {
    const assembly = build();
    assembly.setState(stateAt(150));
    const low = assembly.chaseTarget().position.y;
    assembly.setState(stateAt(431));
    const high = assembly.chaseTarget().position.y;
    expect(high).toBeGreaterThan(low);
    assembly.dispose();
  });

  it('moves the road dashes with the scroll and stays still otherwise', () => {
    const assembly = build();
    const dashes = (): number[] =>
      assembly.root.children
        .filter((child) => child.position.z === 1.8 && child.position.y === 0)
        .map((child) => child.position.x);
    assembly.setState(stateAt(0, 0));
    const first = dashes();
    assembly.setState(stateAt(0, 2));
    const second = dashes();
    expect(second).not.toEqual(first);
    expect(assembly.update(0.016, 5)).toBe(false);
    assembly.dispose();
  });

  it('keeps the right side on the positive z side', () => {
    const assembly = build();
    assembly.root.updateMatrixWorld(true);
    const knee = assembly.labelAnchors().get('knee');
    expect(knee?.getWorldPosition(new Vector3()).z).toBeGreaterThan(0);
    assembly.dispose();
  });
});
