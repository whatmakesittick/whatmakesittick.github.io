import { describe, expect, it } from 'vitest';
import { LAYERS, RESERVOIR_FLUIDS } from '../../model/wellPlan';
import { ANTICLINE } from '../constants';
import { archDrop, bands, contactReach } from './strata';

const EDGE = 200;
const find = (id: string) => bands().find((band) => band.id === id);

describe('strata', () => {
  it('keeps the layer depths of the well plan at the crest', () => {
    const seal = LAYERS.find((layer) => layer.id === 'seal');
    expect(find('seal')?.top(0)).toBeCloseTo(seal?.top ?? 0);
    expect(find('claystone')?.top(0)).toBeCloseTo(LAYERS[1].top);
  });

  it('arches the seal and the reservoir but keeps the layers above flat', () => {
    expect(archDrop(0)).toBe(0);
    expect(archDrop(EDGE)).toBeGreaterThan(ANTICLINE.amplitudeM * 0.9);
    expect(find('seal')?.top(EDGE)).toBeGreaterThan(find('seal')?.top(0) ?? 0);
    expect(find('aquifer')?.top(EDGE)).toBeCloseTo(find('aquifer')?.top(0) ?? 0);
  });

  it('splits the reservoir into gas, oil and water legs with flat contacts', () => {
    const [gas, oil] = RESERVOIR_FLUIDS;
    expect(find('gas')?.bottom(0)).toBeCloseTo(gas.bottom);
    expect(find('oil')?.bottom(0)).toBeCloseTo(oil.bottom);
    const x = 40;
    expect(find('oil')?.bottom(x)).toBeCloseTo(oil.bottom);
    expect(find('gas')?.bottom(x)).toBeGreaterThanOrEqual(find('gas')?.top(x) ?? 0);
  });

  it('pinches the gas and oil legs out on the flanks', () => {
    const gas = find('gas');
    const oil = find('oil');
    expect((gas?.bottom(EDGE) ?? 0) - (gas?.top(EDGE) ?? 0)).toBeCloseTo(0);
    expect((oil?.bottom(EDGE) ?? 0) - (oil?.top(EDGE) ?? 0)).toBeCloseTo(0);
  });

  it('finds where a contact meets the top of the reservoir', () => {
    const [gas, oil] = RESERVOIR_FLUIDS;
    const gasReach = contactReach(gas.bottom, EDGE, 1);
    const oilReach = contactReach(oil.bottom, EDGE, 1);
    expect(gasReach).toBeGreaterThan(0);
    expect(oilReach).toBeGreaterThan(gasReach);
    expect(oilReach).toBeLessThan(EDGE);
  });
});
