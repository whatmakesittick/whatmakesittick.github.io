import { describe, expect, it } from 'vitest';
import {
  LAYERS,
  RESERVOIR_FLUIDS,
  SEABED_DEPTH_M,
  SECTIONS,
  TOTAL_DEPTH_M,
  depthBelowSeabed,
  fluidAt,
  layerAt,
  riserLanded,
  sectionAt,
} from './wellPlan';

describe('the well plan', () => {
  it('sets casing strings in order with shrinking sizes', () => {
    for (let i = 1; i < SECTIONS.length; i++) {
      expect(SECTIONS[i].shoeDepth).toBeGreaterThan(SECTIONS[i - 1].shoeDepth);
      expect(SECTIONS[i].holeInches).toBeLessThan(SECTIONS[i - 1].casingInches);
      expect(SECTIONS[i].plannedMudWeight).toBeGreaterThanOrEqual(SECTIONS[i - 1].plannedMudWeight);
    }
    expect(SECTIONS[SECTIONS.length - 1].shoeDepth).toBe(TOTAL_DEPTH_M);
  });

  it('stacks layers without gaps from the seabed down', () => {
    expect(LAYERS[0].top).toBe(SEABED_DEPTH_M);
    for (let i = 1; i < LAYERS.length; i++) expect(LAYERS[i].top).toBe(LAYERS[i - 1].bottom);
  });

  it('keeps the reservoir fluids inside the reservoir layer, lightest on top', () => {
    const reservoir = LAYERS.find((layer) => layer.id === 'reservoir')!;
    expect(RESERVOIR_FLUIDS[0].top).toBe(reservoir.top);
    expect(RESERVOIR_FLUIDS[RESERVOIR_FLUIDS.length - 1].bottom).toBe(reservoir.bottom);
    expect(RESERVOIR_FLUIDS.map((leg) => leg.id)).toEqual(['gas', 'oil', 'water']);
  });

  it('answers what is at a depth', () => {
    expect(sectionAt(0).id).toBe('conductor');
    expect(sectionAt(3000).id).toBe('intermediate');
    expect(sectionAt(TOTAL_DEPTH_M + 1).id).toBe('production');
    expect(layerAt(SEABED_DEPTH_M - 1)).toBeUndefined();
    expect(layerAt(4100)?.id).toBe('reservoir');
    expect(fluidAt(4100)).toBe('oil');
    expect(fluidAt(3000)).toBeUndefined();
    expect(depthBelowSeabed(SEABED_DEPTH_M + 100)).toBe(100);
    expect(riserLanded(2000)).toBe(false);
    expect(riserLanded(2100)).toBe(true);
  });
});
