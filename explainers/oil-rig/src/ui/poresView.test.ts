import { describe, expect, it } from 'vitest';
import {
  ROCKS,
  SEABED_DEPTH_M,
  fluidLeg,
  layerById,
  layerStopDepth,
  rockSampleDepth,
} from '../model';
import { poreSceneAt } from './poresView';

describe('pores view', () => {
  it('fills the reservoir pores with gas, oil and water from the top down', () => {
    (['gas', 'oil', 'water'] as const).forEach((fluid) =>
      expect(poreSceneAt(fluidLeg(fluid).top + 1)).toMatchObject({
        fluid,
        porosity: ROCKS.reservoir.porosity,
      }),
    );
  });

  it('shows the tight seal with water in its few pores', () => {
    expect(poreSceneAt(layerById('seal').top + 1)).toMatchObject({
      fluid: 'water',
      porosity: ROCKS.seal.porosity,
    });
  });

  it('shows no grains while the bit is in the water', () => {
    expect(poreSceneAt(SEABED_DEPTH_M - 1).grain).toBeNull();
  });

  it('hands back the same scene within a layer so the canvas repaints only on a change', () => {
    const oil = fluidLeg('oil');
    expect(poreSceneAt(oil.top + 1)).toBe(poreSceneAt(oil.bottom - 1));
    expect(poreSceneAt(oil.top + 1)).not.toBe(poreSceneAt(fluidLeg('gas').top + 1));
  });

  it('shows the dark organic shale at the source-rock stop', () => {
    const scene = poreSceneAt(rockSampleDepth(layerStopDepth('sourceRock')));
    expect(scene).toMatchObject({ grain: 'organic', porosity: ROCKS.sourceRock.porosity });
  });
});
