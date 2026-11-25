import { describe, expect, it } from 'vitest';
import { MaterialLibrary } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import { PartBuilder } from './partBuilder';

const CAP = '#e8b84a';
const FINISHES = {} as const;

describe('swatches', () => {
  it('dim with their group and come back with it', () => {
    const materials = new MaterialLibrary();
    const builder = new PartBuilder({ materials, tracker: new ResourceTracker() }, FINISHES);
    const [cap] = builder.swatches('head', [CAP]);
    const full = cap.getHexString();
    materials.setEmphasis('head', 0);
    expect(cap.getHexString()).not.toBe(full);
    materials.setEmphasis('head', 1);
    expect(cap.getHexString()).toBe(full);
  });
});
