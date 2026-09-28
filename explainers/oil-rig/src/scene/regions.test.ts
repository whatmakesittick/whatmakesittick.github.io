import { describe, expect, it } from 'vitest';
import { Matrix4 } from 'three';
import { regionFromSpec } from '@core/scene/regions';
import type { RegionId } from '../ids';
import { SEABED_Y, depthToY } from '../model/scale';
import { LAYERS, TOTAL_DEPTH_M } from '../model/wellPlan';
import { DERRICK_TOP, DRILLING_DRAFT_M, HULL, TRANSIT_DRAFT_M } from './constants';
import { BOP_TOP } from './parts/well/bop';
import { regionBox, regionSpec } from './regions';

const IDS: readonly RegionId[] = [
  'scene',
  'rig',
  'waterline',
  'drillFloor',
  'seabed',
  'well',
  'trap',
  'completion',
];
const TRANSIT_OFFSET = TRANSIT_DRAFT_M - DRILLING_DRAFT_M;

describe('regions', () => {
  it('keeps every region inside the scene at any draft', () => {
    [0, TRANSIT_OFFSET].forEach((offset) => {
      const scene = regionFromSpec(regionSpec('scene', offset));
      IDS.forEach((id) =>
        expect(scene.containsBox(regionFromSpec(regionSpec(id, offset)))).toBe(true),
      );
    });
  });

  it('frames the rig from the keel to the derrick top', () => {
    const [low, high] = regionSpec('rig', 0).y;
    expect(low).toBeLessThan(HULL.keelY);
    expect(high).toBeGreaterThan(DERRICK_TOP);
  });

  it('puts the sea surface across the waterline region', () => {
    const [low, high] = regionSpec('waterline', 0).y;
    expect(low).toBeLessThan(0);
    expect(high).toBeGreaterThan(0);
  });

  it('frames the seabed stack with rock below and the well down to total depth', () => {
    const [low, high] = regionSpec('seabed', 0).y;
    expect(low).toBeLessThan(SEABED_Y);
    expect(high).toBeGreaterThan(BOP_TOP);
    expect(regionSpec('well', 0).y[0]).toBeLessThan(depthToY(TOTAL_DEPTH_M));
  });

  it('frames the trap from the seal top at the crest', () => {
    const sealTop = LAYERS.find((layer) => layer.id === 'seal')?.top ?? 0;
    expect(regionSpec('trap', 0).y[1]).toBeGreaterThan(depthToY(sealTop));
  });

  it('moves the underwater regions with the sea but not the rig', () => {
    expect(regionSpec('seabed', TRANSIT_OFFSET).y[0]).toBeCloseTo(
      regionSpec('seabed', 0).y[0] + TRANSIT_OFFSET,
    );
    expect(regionSpec('rig', TRANSIT_OFFSET)).toEqual(regionSpec('rig', 0));
  });

  it('applies the root transform', () => {
    const box = regionBox('rig', 0, new Matrix4().makeTranslation(0, 10, 0));
    expect(box.min.y).toBeCloseTo(regionSpec('rig', 0).y[0] + 10);
  });
});
