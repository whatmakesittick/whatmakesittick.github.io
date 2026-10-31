import { describe, expect, it } from 'vitest';
import { COOLING_IDS, LOAD_IDS } from '../ids';
import type { CoolingId, LoadId } from '../ids';
import { FAN_SHARE, RACK_KW } from './constants';
import {
  chargersFor,
  facilityPowerMw,
  hallPowerMw,
  homesFor,
  overheadShare,
  rackPowerKw,
  rackReading,
} from './power';

const PERCENT = 100;

const RACK_CASES: readonly (readonly [CoolingId, LoadId, number, number])[] = [
  ['liquid', 'full', 120, 23.04],
  ['liquid', 'idle', 36, 6.912],
  ['air', 'full', 10, 1.92],
  ['air', 'idle', 3, 0.576],
];

describe('rack and hall power', () => {
  it.each(RACK_CASES)('draws the %s rack at %s load', (cooling, load, rackKw, hallMw) => {
    expect(rackPowerKw(cooling, load)).toBeCloseTo(rackKw, 9);
    expect(hallPowerMw(cooling, load)).toBeCloseTo(hallMw, 9);
  });

  it('rounds the hall to 23.04, 6.91, 1.92 and 0.58 MW', () => {
    const halls = RACK_CASES.map(([cooling, load]) => hallPowerMw(cooling, load).toFixed(2));
    expect(halls).toEqual(['23.04', '6.91', '1.92', '0.58']);
  });

  it('idles at 30 percent of full power', () => {
    COOLING_IDS.forEach((cooling) =>
      expect(rackPowerKw(cooling, 'idle') / rackPowerKw(cooling, 'full')).toBeCloseTo(0.3, 9),
    );
  });

  it('reads the rack power, the hall power and the fan share together', () => {
    COOLING_IDS.forEach((cooling) =>
      LOAD_IDS.forEach((load) =>
        expect(rackReading(cooling, load)).toEqual({
          rackKw: rackPowerKw(cooling, load),
          hallMw: hallPowerMw(cooling, load),
          fanShare: FAN_SHARE[cooling][load],
        }),
      ),
    );
  });
});

describe('facility power', () => {
  it('multiplies the computers by the PUE', () => {
    const hallMw = hallPowerMw('liquid', 'full');
    expect(facilityPowerMw(hallMw, 'average')).toBeCloseTo(35.48, 2);
    expect(facilityPowerMw(hallMw, 'best')).toBeCloseTo(25.11, 2);
  });

  it('spends 35.1 percent on overhead at the industry average and 8.3 at the best fleet', () => {
    expect((overheadShare('average') * PERCENT).toFixed(1)).toBe('35.1');
    expect((overheadShare('best') * PERCENT).toFixed(1)).toBe('8.3');
  });
});

describe('everyday comparisons', () => {
  it('runs about 97 US or 270 EU homes on one liquid rack all year', () => {
    const homes = homesFor(RACK_KW.liquid);
    expect(homes.us).toBeCloseTo(97.4, 1);
    expect(homes.eu).toBeCloseTo(269.5, 1);
    expect(Math.round(homes.us)).toBe(97);
    expect(Math.round(homes.eu / 10) * 10).toBe(270);
  });

  it('equals 3,000 laptop chargers at 120 kW', () => {
    expect(chargersFor(RACK_KW.liquid)).toBeCloseTo(3000, 9);
    expect(chargersFor(RACK_KW.air)).toBeCloseTo(250, 9);
  });
});
