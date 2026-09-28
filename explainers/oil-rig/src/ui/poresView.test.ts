import { describe, expect, it } from 'vitest';
import { ROCKS, layerStopDepth, rockSampleDepth } from '../model';
import { poreSceneAt } from './poresView';

describe('pores view', () => {
  it('shows the dark organic shale at the source-rock stop', () => {
    const scene = poreSceneAt(rockSampleDepth(layerStopDepth('sourceRock')));
    expect(scene).toMatchObject({ grain: 'organic', porosity: ROCKS.sourceRock.porosity });
  });
});
