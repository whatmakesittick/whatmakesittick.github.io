import { describe, expect, it } from 'vitest';
import { CELL } from './module';
import {
  SLICE_LAYERS,
  SLICE_LAYER_IDS,
  drawnDepthFromWaferTop,
  drawnThicknessUm,
  layerBottomUm,
  layerTopUm,
  photonStopUm,
  waferThicknessUm,
} from './slice';

describe('slice layers', () => {
  it('lists every layer once, top to bottom', () => {
    expect(SLICE_LAYERS.map((layer) => layer.id)).toEqual([...SLICE_LAYER_IDS]);
    expect(layerTopUm('pyramids')).toBeCloseTo(drawnThicknessUm());
    expect(layerBottomUm('rearContact')).toBeCloseTo(0);
    expect(layerTopUm('base')).toBeCloseTo(layerBottomUm('junction'));
  });

  it('keeps the true wafer at the facts sheet thickness', () => {
    expect(waferThicknessUm()).toBeCloseTo(CELL.thicknessUm);
  });

  it('draws the thin layers thicker than life and the base thinner', () => {
    SLICE_LAYERS.filter((layer) => layer.trueUm < 1).forEach((layer) => {
      expect(layer.drawnUm).toBeGreaterThan(layer.trueUm);
    });
    expect(SLICE_LAYERS.find((layer) => layer.id === 'base')?.drawnUm).toBeLessThan(
      CELL.thicknessUm,
    );
  });
});

describe('photon depth mapping', () => {
  it('stretches the emitter and squeezes the base', () => {
    expect(drawnDepthFromWaferTop(0)).toBe(0);
    expect(drawnDepthFromWaferTop(0.25)).toBeCloseTo(4);
    expect(drawnDepthFromWaferTop(1)).toBeCloseTo(14);
    expect(drawnDepthFromWaferTop(140)).toBeCloseTo(124);
    expect(drawnDepthFromWaferTop(500)).toBeCloseTo(124);
  });

  it('stops blue light near the top and infrared near the rear', () => {
    const blue = photonStopUm(400);
    const red = photonStopUm(680);
    const infrared = photonStopUm(1000);
    expect(blue).toBeGreaterThan(red);
    expect(red).toBeGreaterThan(infrared);
    expect(blue).toBeLessThan(layerTopUm('emitter'));
    expect(infrared).toBeGreaterThanOrEqual(layerBottomUm('base'));
  });
});
