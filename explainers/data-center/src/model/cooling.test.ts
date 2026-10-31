import { describe, expect, it } from 'vitest';
import { COOLING_IDS, LOAD_IDS } from '../ids';
import type { CoolingId, LoadId } from '../ids';
import { FULL_RISE_K, RACK_KW } from './constants';
import { airflowFor, coolantAt, fanShareAt } from './cooling';

const COOLANT_CASES: readonly (readonly [CoolingId, LoadId, string, number, number, number])[] = [
  ['liquid', 'full', 'water', 25, 45.0, 1],
  ['liquid', 'idle', 'water', 25, 31.0, 1],
  ['air', 'full', 'air', 24, 35.1, 1],
  ['air', 'idle', 'air', 24, 30.66, 0.5],
];

describe('coolantAt', () => {
  it.each(COOLANT_CASES)(
    'reads the %s rack at %s load',
    (cooling, load, medium, supplyC, returnC, flowShare) => {
      const coolant = coolantAt(cooling, load);
      expect(coolant).toMatchObject({ medium, supplyC, flowShare });
      expect(coolant.returnC).toBeCloseTo(returnC, 9);
    },
  );

  it('rounds the return to 45.0 and 31.0 °C in water, 35.1 and 30.7 °C in air', () => {
    const returns = COOLANT_CASES.map(([cooling, load]) => coolantAt(cooling, load).returnC);
    expect(returns.map((value) => value.toFixed(1))).toEqual(['45.0', '31.0', '35.1', '30.7']);
  });

  it('warms the water by the full 20 degrees at full load', () => {
    const { supplyC, returnC } = coolantAt('liquid', 'full');
    expect(returnC - supplyC).toBeCloseTo(FULL_RISE_K, 9);
  });
});

describe('fanShareAt', () => {
  it('spins the tray fans at 0.6 and 0.3 and the air rack fans at 1 and 0.5', () => {
    const shares = COOLING_IDS.flatMap((cooling) =>
      LOAD_IDS.map((load) => fanShareAt(cooling, load)),
    );
    expect(shares).toEqual([0.6, 0.3, 1, 0.5]);
  });
});

describe('airflowFor', () => {
  it('needs 32,640 m³/h of air for 120 kW and 2,720 for 10 kW', () => {
    expect(airflowFor(RACK_KW.liquid)).toBeCloseTo(32640, 9);
    expect(airflowFor(RACK_KW.air)).toBeCloseTo(2720, 9);
  });
});
