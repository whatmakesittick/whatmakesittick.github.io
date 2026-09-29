import { describe, expect, it } from 'vitest';
import { ENGINE_IDS } from '../ids';
import { ENGINES } from './engines';

describe('engine comparison', () => {
  it('describes every engine the chips offer', () => {
    expect(Object.keys(ENGINES).sort()).toEqual([...ENGINE_IDS].sort());
  });

  it('names the cycle and the propellants of each engine', () => {
    expect(ENGINE_IDS.map((id) => ENGINES[id].cycle)).toEqual([
      'gasGenerator',
      'fuelRichStaged',
      'oxygenRichStaged',
      'fullFlow',
    ]);
    expect(ENGINE_IDS.map((id) => ENGINES[id].propellants)).toEqual([
      'oxygenKerosene',
      'oxygenHydrogen',
      'oxygenKerosene',
      'oxygenMethane',
    ]);
  });

  it('keeps the facts sheet numbers for pressure, thrust and efficiency', () => {
    expect(ENGINE_IDS.map((id) => ENGINES[id].chamberBar)).toEqual([97, 206, 260, 330]);
    expect(ENGINE_IDS.map((id) => ENGINES[id].chamberBarIsApproximate)).toEqual([
      true,
      false,
      true,
      true,
    ]);
    expect(ENGINE_IDS.map((id) => ENGINES[id].thrustTf)).toEqual([86, 190, 390, 250]);
    expect(ENGINE_IDS.map((id) => [ENGINES[id].ispSeaLevel, ENGINES[id].ispVacuum])).toEqual([
      [282, 311],
      [366, 452],
      [311, 338],
      [330, 350],
    ]);
    ENGINE_IDS.forEach((id) =>
      expect(ENGINES[id].ispVacuum, id).toBeGreaterThan(ENGINES[id].ispSeaLevel),
    );
  });

  it('throws turbine gas away only in the gas generator engine', () => {
    expect(ENGINE_IDS.filter((id) => ENGINES[id].dumps)).toEqual(['merlin']);
  });

  it('counts the pumps, burners and chambers of each cycle', () => {
    expect(ENGINE_IDS.map((id) => ENGINES[id].pumps)).toEqual([1, 4, 1, 2]);
    expect(ENGINE_IDS.map((id) => ENGINES[id].boostPumps)).toEqual([0, 2, 0, 0]);
    expect(ENGINE_IDS.map((id) => ENGINES[id].burners)).toEqual([1, 2, 1, 2]);
    expect(ENGINE_IDS.map((id) => ENGINES[id].burnerKind)).toEqual([
      'gasGenerator',
      'fuelRich',
      'oxygenRich',
      'oneOfEach',
    ]);
    expect(ENGINE_IDS.map((id) => ENGINES[id].chambers)).toEqual([1, 1, 2, 1]);
  });
});
