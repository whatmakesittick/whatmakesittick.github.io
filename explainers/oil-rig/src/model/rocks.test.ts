import { describe, expect, it } from 'vitest';
import { ROCKS, fluidLeg, layerById, poreDensityAt, poreFluidAt, porosityAt } from './rocks';
import { SEABED_DEPTH_M } from './wellPlan';

describe('the rock layers', () => {
  it('keeps porosity between a few percent and about half', () => {
    Object.values(ROCKS).forEach((rock) => {
      expect(rock.porosity).toBeGreaterThan(0);
      expect(rock.porosity).toBeLessThan(0.5);
    });
    expect(porosityAt(4100)).toBe(0.22);
    expect(porosityAt(3800)).toBe(0.05);
    expect(porosityAt(SEABED_DEPTH_M - 1)).toBeNull();
  });

  it('fills the reservoir pores with gas over oil over water', () => {
    expect(poreFluidAt(4030)).toBe('gas');
    expect(poreFluidAt(4100)).toBe('oil');
    expect(poreFluidAt(4250)).toBe('water');
    expect(poreFluidAt(3000)).toBe('water');
    expect(poreFluidAt(SEABED_DEPTH_M - 1)).toBeNull();
  });

  it('ramps the pore fluid density through the seal', () => {
    const seal = layerById('seal');
    expect(poreDensityAt(seal.top)).toBeCloseTo(1.07);
    expect(poreDensityAt((seal.top + seal.bottom) / 2)).toBeCloseTo(1.195);
    expect(poreDensityAt(seal.bottom)).toBeCloseTo(1.32);
    expect(poreDensityAt(1100)).toBeCloseTo(1.03);
  });

  it('finds layers and fluid legs by id', () => {
    expect(layerById('reservoir')).toMatchObject({ top: 4000, bottom: 4300 });
    expect(fluidLeg('oil')).toMatchObject({ top: 4060, bottom: 4220 });
  });

  it('makes every rock heavier than the water in its pores', () => {
    Object.values(ROCKS).forEach((rock) =>
      expect(rock.bulkDensity).toBeGreaterThan(rock.poreDensity.base),
    );
  });
});
