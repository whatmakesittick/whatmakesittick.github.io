import { describe, expect, it } from 'vitest';
import { MaterialLibrary } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import type { PartContext } from '../context';
import { PartBuilder } from './build';

const CAP = '#e8b84a';

describe('swatches', () => {
  it('dim with their group and come back with it', () => {
    const materials = new MaterialLibrary();
    const builder = new PartBuilder({ materials, tracker: new ResourceTracker() } as PartContext);
    const [cap] = builder.swatches('head', [CAP]);
    const full = cap.getHexString();
    materials.setEmphasis('head', 0);
    expect(cap.getHexString()).not.toBe(full);
    materials.setEmphasis('head', 1);
    expect(cap.getHexString()).toBe(full);
  });
});
