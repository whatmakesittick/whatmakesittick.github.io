import { describe, expect, it } from 'vitest';
import { Texture } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import type { SceneTextures } from '@core/scene/textures';
import { runNow } from '@core/scene/pacing';
import { ANCHOR_IDS, PART_IDS, REGION_IDS } from '../ids';
import type { AssemblyState } from '../ids';
import { strokeAt } from '../model';
import { createSwimAssembly } from './swimAssembly';

const { loadFigure } = await import('./loadFigure');
const figure = await loadFigure();
const OPTIONS = { pace: 'middle', kick: 'six', breathing: 'none', headUp: false } as const;

function stateAt(phase: number): AssemblyState {
  const reading = strokeAt(phase, OPTIONS);
  return {
    phase,
    playing: false,
    reading,
    pace: 'middle',
    kick: 'six',
    breathing: 'none',
    headUp: false,
    dragFactor: 1,
    entrySplash: reading.entrySplash,
    view: { labels: true, forces: false, underwater: false, handPath: false },
  };
}

describe('swim assembly', () => {
  const resources = {
    materials: new MaterialLibrary(),
    textures: {
      dot: new Texture(),
      glow: new Texture(),
      shadow: new Texture(),
      dispose: () => {},
    } as SceneTextures,
    ...figure,
  };
  const assembly = runNow(createSwimAssembly(resources, stateAt(0)));

  it('has every anchor, label anchor and region', () => {
    ANCHOR_IDS.forEach((id) => expect(assembly.anchor(id)).toBeDefined());
    PART_IDS.forEach((id) => expect(assembly.labelAnchors().has(id)).toBe(true));
    REGION_IDS.forEach((id) => expect(assembly.region(id).isEmpty()).toBe(false));
  });

  it('scrolls the pool with the scrubber and stays still', () => {
    assembly.setState(stateAt(100));
    expect(assembly.update(0.016, 5)).toBe(false);
  });
});

describe('swim assembly pose', () => {
  const resources = {
    materials: new MaterialLibrary(),
    textures: {
      dot: new Texture(),
      glow: new Texture(),
      shadow: new Texture(),
      dispose: () => {},
    } as SceneTextures,
    ...figure,
  };
  const assembly = runNow(createSwimAssembly(resources, stateAt(0)));

  it('moves the right hand with the scrubber and keeps every anchor in the scene', () => {
    const hand = assembly.anchor('rightHand');
    hand.updateWorldMatrix(true, false);
    const atEntry = hand.getWorldPosition(hand.position.clone());
    assembly.setState(stateAt(530));
    hand.updateWorldMatrix(true, false);
    const underShoulder = hand.getWorldPosition(hand.position.clone());
    expect(atEntry.x).toBeGreaterThan(underShoulder.x + 0.4);
    expect(underShoulder.y).toBeLessThan(-0.5);
    assembly.labelAnchors().forEach((anchor) => {
      let node: typeof anchor | null = anchor;
      while (node && node !== assembly.root) node = node.parent;
      expect(node).toBe(assembly.root);
    });
  });

  it('eases the head-up pose and settles', () => {
    assembly.setState({ ...stateAt(100), headUp: true, dragFactor: 3 });
    expect(assembly.update(0.1, 5)).toBe(true);
    for (let frame = 0; frame < 30; frame++) assembly.update(0.1, 5);
    expect(assembly.update(0.1, 5)).toBe(false);
  });
});
