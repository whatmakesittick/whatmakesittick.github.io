import { describe, expect, it } from 'vitest';
import { ANCHOR_IDS, PART_IDS, REGION_IDS } from '../ids';
import { assemblyState } from '../model/reading';
import type { EngineInputs } from '../model/reading';
import { createPlaceholderAssembly } from './placeholderAssembly';

describe('placeholder assembly', () => {
  it('has every anchor, label anchor and region', () => {
    const assembly = createPlaceholderAssembly();
    ANCHOR_IDS.forEach((id) => expect(assembly.anchor(id)).toBeDefined());
    REGION_IDS.forEach((id) => expect(assembly.region(id).isEmpty()).toBe(false));
    expect([...assembly.labelAnchors().keys()]).toEqual([...PART_IDS]);
    assembly.dispose();
  });

  it('moves the markers with the phase and hides the person', () => {
    const assembly = createPlaceholderAssembly();
    const inputs: EngineInputs = {
      phase: 0,
      playing: false,
      thrust: 0.5,
      cutaway: 'closed',
      streams: 'both',
      view: { labels: true, person: false, reverser: false },
      detail: 'near',
    };
    assembly.setState(assemblyState(inputs));
    const start = assembly.anchor('hotMarker').position.x;
    assembly.setState(assemblyState({ ...inputs, phase: 900 }));
    expect(assembly.anchor('hotMarker').position.x).toBeGreaterThan(start);
    expect(assembly.update(0.016, 10)).toBe(false);
    assembly.dispose();
  });
});
