import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import type { SceneTextures } from '@core/scene/textures';
import { ANCHOR_IDS, PART_IDS, REGION_IDS } from '../ids';
import type { AssemblyState, OdorantLevels, ScaleId } from '../ids';
import { createAssembly } from './assembly';
import { bitePose, spoonPose } from './pose';

function levels(value = 0): OdorantLevels {
  return { benzaldehyde: value, hexenal: value, linalool: value, eugenol: value, ionone: value };
}

function stateAt(seconds: number, scale: ScaleId = 'head', melt = 0): AssemblyState {
  return {
    scale,
    phase: 0,
    playing: false,
    reading: {
      seconds,
      phase: 'tongue',
      phaseProgress: 0,
      temperatureC: -12,
      melt,
      inMouth: seconds >= 0 && seconds < 12,
      swallow: 0,
      flavor: 'cherry',
      smell: 'cherry',
      profile: levels(),
      mouth: levels(),
      ortho: levels(),
      retro: levels(),
      nose: levels(),
      released: 0,
      noseShare: 0,
      taste: { sweet: 0, sour: 0, cold: 0 },
      percept: 'nothing',
      receptors: [],
      firing: 0,
    },
    copies: { ...levels(1), hexenal: 0 },
    sniff: 'mix',
    fatPercent: 10,
    view: { labels: true, pinched: false },
  };
}

function resources() {
  return { materials: new MaterialLibrary(), textures: {} as unknown as SceneTextures };
}

function worldPosition(object: { getWorldPosition(target: Vector3): Vector3 }): number[] {
  return object.getWorldPosition(new Vector3()).toArray();
}

describe('placeholder assembly', () => {
  it('has a label anchor for every part, every anchor and every region', () => {
    const assembly = createAssembly(resources(), stateAt(0));
    expect([...assembly.labelAnchors().keys()].sort()).toEqual([...PART_IDS].sort());
    ANCHOR_IDS.forEach((id) => expect(assembly.anchor(id)).toBeDefined());
    REGION_IDS.forEach((id) => expect(assembly.region(id).isEmpty()).toBe(false));
    assembly.dispose();
  });

  it('shows one world at a time', () => {
    const assembly = createAssembly(resources(), stateAt(5));
    const shown = () => assembly.root.children.map((child) => child.visible);
    expect(shown()).toEqual([true, false, false]);
    assembly.setState(stateAt(5, 'tongue'));
    expect(shown()).toEqual([false, true, false]);
    assembly.setState(stateAt(5, 'molecules'));
    expect(shown()).toEqual([false, false, true]);
    expect(assembly.update(0.016, 1)).toBe(false);
    assembly.dispose();
  });

  it('moves the spoon and the bite anchor with the pose', () => {
    const assembly = createAssembly(resources(), stateAt(-1.5));
    assembly.root.updateMatrixWorld(true);
    const spoon = assembly.labelAnchors().get('spoon');
    if (!spoon) throw new Error('no spoon');
    expect(worldPosition(spoon)).toEqual(spoonPose(-1.5).position);
    assembly.setState(stateAt(6, 'head', 0.5));
    assembly.root.updateMatrixWorld(true);
    expect(worldPosition(assembly.anchor('bite'))).toEqual(bitePose(6, 0.5).position);
    assembly.dispose();
  });

  it('hides an odorant with no copies', () => {
    const assembly = createAssembly(resources(), stateAt(10, 'molecules'));
    expect(assembly.labelAnchors().get('hexenal')?.visible).toBe(false);
    expect(assembly.labelAnchors().get('benzaldehyde')?.visible).toBe(true);
    assembly.dispose();
  });
});
