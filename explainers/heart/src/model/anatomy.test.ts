import { describe, expect, it } from 'vitest';
import { VALVE_IDS } from '../ids';
import {
  AV_VALVES_CLOSE_MS,
  AV_VALVES_OPEN_MS,
  SEMILUNAR_CLOSE_MS,
  SEMILUNAR_OPEN_MS,
  SOUNDS,
  VALVE_TRANSITION_MS,
  leftVentriclePressure,
  rightVentriclePressure,
  valveClosesAt,
  valveOpensAt,
} from './cycle';
import { PEAK_PRESSURE_MMHG, valveFacts, valveMoment, valveMotion } from './anatomy';

describe('chamber pressures', () => {
  it('peaks at about 120 mmHg in the left ventricle and a fifth of that in the right', () => {
    expect(PEAK_PRESSURE_MMHG.leftVentricle).toBe(120);
    expect(PEAK_PRESSURE_MMHG.rightVentricle).toBe(25);
  });

  it('keeps the atria at a few mmHg', () => {
    expect(PEAK_PRESSURE_MMHG.leftAtrium).toBe(10);
    expect(PEAK_PRESSURE_MMHG.rightAtrium).toBe(5);
  });

  it('agrees with the peaks of the cycle model for the ventricles', () => {
    expect(leftVentriclePressure(340)).toBeCloseTo(PEAK_PRESSURE_MMHG.leftVentricle, 0);
    expect(rightVentriclePressure(330)).toBeCloseTo(PEAK_PRESSURE_MMHG.rightVentricle, 0);
  });
});

describe('valve facts', () => {
  it('counts two leaflets on the mitral valve and three on the others', () => {
    expect(valveFacts('mitral').leaflets).toBe(2);
    expect(valveFacts('tricuspid').leaflets).toBe(3);
    expect(valveFacts('aortic').leaflets).toBe(3);
    expect(valveFacts('pulmonary').leaflets).toBe(3);
  });

  it('opens and shuts each valve at the moments of the cycle model', () => {
    VALVE_IDS.forEach((valve) => {
      expect(valveFacts(valve)).toMatchObject({
        opensAtMs: valveOpensAt(valve),
        closesAtMs: valveClosesAt(valve),
      });
    });
    expect(valveFacts('mitral').closesAtMs).toBe(AV_VALVES_CLOSE_MS);
    expect(valveFacts('aortic').closesAtMs).toBe(SEMILUNAR_CLOSE_MS);
  });

  it('makes the first sound with the inlet valves and the second with the outlets', () => {
    expect(valveFacts('mitral').sound).toBe('s1');
    expect(valveFacts('tricuspid').sound).toBe('s1');
    expect(valveFacts('aortic').sound).toBe('s2');
    expect(valveFacts('pulmonary').sound).toBe('s2');
  });

  it('tells a valve that is opening from one that is closing', () => {
    const { open, close } = VALVE_TRANSITION_MS;
    expect(valveMotion('mitral', AV_VALVES_CLOSE_MS - close - 20)).toBe('open');
    expect(valveMotion('mitral', AV_VALVES_CLOSE_MS - close / 2)).toBe('closing');
    expect(valveMotion('mitral', SEMILUNAR_OPEN_MS + 60)).toBe('shut');
    expect(valveMotion('mitral', AV_VALVES_OPEN_MS + open / 2)).toBe('opening');
    expect(valveMotion('aortic', SEMILUNAR_OPEN_MS + open / 2)).toBe('opening');
    expect(valveMotion('aortic', SEMILUNAR_OPEN_MS + 2 * open)).toBe('open');
  });

  it('marks the heart sound a valve makes just after it shuts', () => {
    const afterS1 = SOUNDS.s1.start + 5;
    const pulmonaryClose = valveClosesAt('pulmonary');
    expect(valveMoment('mitral', afterS1)).toBe('s1');
    expect(valveMoment('tricuspid', afterS1)).toBe('s1');
    expect(valveMoment('aortic', afterS1)).toBe('shut');
    expect(valveMoment('aortic', SOUNDS.s2.start + 5)).toBe('s2');
    expect(valveMoment('pulmonary', pulmonaryClose - VALVE_TRANSITION_MS.close / 2)).toBe(
      'closing',
    );
    expect(valveMoment('pulmonary', pulmonaryClose + 5)).toBe('s2');
    expect(valveMoment('mitral', SOUNDS.s1.end + 20)).toBe('shut');
  });
});
