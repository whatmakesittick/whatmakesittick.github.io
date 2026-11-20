import { describe, expect, it } from 'vitest';
import { MaterialLibrary } from '@core/scene/materials';
import type { SceneTextures } from '@core/scene/textures';
import { runNow } from '@core/scene/pacing';
import { ANCHOR_IDS, PART_IDS, REGION_IDS } from '../ids';
import type { AssemblyState } from '../ids';
import { strokeAt } from '../model';
import { createAssembly } from './assembly';

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

describe('placeholder assembly', () => {
  const resources = { materials: new MaterialLibrary(), textures: {} as SceneTextures };
  const assembly = runNow(createAssembly(resources, stateAt(0)));

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
