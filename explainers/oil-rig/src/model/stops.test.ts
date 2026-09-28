import { describe, expect, it } from 'vitest';
import { FINAL_DEPTH_M } from './journey';
import { LAYER_STOP_IDS, layerStopAt, layerStopDepth, sectionStartDepth } from './stops';
import { SEABED_DEPTH_M, sectionAt } from './wellPlan';

describe('chapter stops', () => {
  it('starts each hole section just below the shoe above it', () => {
    expect(sectionStartDepth('conductor')).toBe(SEABED_DEPTH_M);
    expect(sectionStartDepth('surface')).toBe(1101);
    expect(sectionStartDepth('intermediate')).toBe(2026);
    expect(sectionStartDepth('production')).toBe(3001);
    expect(sectionStartDepth('reservoir')).toBe(3951);
    (['conductor', 'surface', 'intermediate', 'production', 'reservoir'] as const).forEach((id) =>
      expect(sectionAt(sectionStartDepth(id)).id).toBe(id),
    );
  });

  it('stops at the top of each layer and fluid leg, and at total depth for the source rock', () => {
    expect(layerStopDepth('seal')).toBe(3550);
    expect(layerStopDepth('gasCap')).toBe(4000);
    expect(layerStopDepth('oil')).toBe(4060);
    expect(layerStopDepth('water')).toBe(4220);
    expect(layerStopDepth('sourceRock')).toBe(FINAL_DEPTH_M);
  });

  it('knows which stop the bit is at', () => {
    LAYER_STOP_IDS.forEach((id) => expect(layerStopAt(layerStopDepth(id))).toBe(id));
    expect(layerStopAt(3000)).toBeNull();
    expect(layerStopAt(500)).toBeNull();
  });
});
