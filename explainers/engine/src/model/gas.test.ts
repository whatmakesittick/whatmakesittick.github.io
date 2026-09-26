import { describe, expect, it } from 'vitest';
import { DIESEL, PETROL } from './spec';
import {
  burnedFraction,
  gasState,
  ignitionStart,
  isIgnitionActive,
  peakMotoredPressure,
  peakPressure,
  relativePressure,
} from './gas';

describe('gas', () => {
  it('fires the spark before top dead centre', () => {
    expect(ignitionStart(PETROL)).toBe(348);
    expect(isIgnitionActive(350, PETROL)).toBe(true);
    expect(isIgnitionActive(340, PETROL)).toBe(false);
    expect(isIgnitionActive(360, PETROL)).toBe(false);
  });

  it('burns nothing before ignition and everything after the burn', () => {
    expect(burnedFraction(300, PETROL)).toBe(0);
    expect(burnedFraction(0, PETROL)).toBe(0);
    expect(burnedFraction(500, PETROL)).toBe(1);
    expect(burnedFraction(360, PETROL)).toBeGreaterThan(0);
    expect(burnedFraction(360, PETROL)).toBeLessThan(1);
  });

  it('stays near atmospheric while the valves are open', () => {
    expect(relativePressure(90, PETROL)).toBeLessThan(1);
    expect(relativePressure(650, PETROL)).toBeCloseTo(1.05);
  });

  it('peaks shortly after top dead centre', () => {
    const peak = peakPressure(PETROL);
    expect(peak).toBeGreaterThan(peakMotoredPressure(PETROL));
    expect(relativePressure(370, PETROL)).toBeGreaterThan(relativePressure(300, PETROL));
    expect(relativePressure(370, PETROL)).toBeGreaterThan(relativePressure(450, PETROL));
  });

  it('compresses harder in a diesel', () => {
    expect(peakMotoredPressure(DIESEL)).toBeGreaterThan(peakMotoredPressure(PETROL));
  });

  it('decays pressure smoothly after the exhaust valve opens', () => {
    const open = PETROL.valveTiming.exhaustOpen;
    const before = relativePressure(open - 1, PETROL);
    const after = relativePressure(open + 1, PETROL);
    expect(Math.abs(before - after)).toBeLessThan(before * 0.2);
    expect(relativePressure(open + 39, PETROL)).toBeGreaterThan(1.05);
    expect(relativePressure(open + 41, PETROL)).toBeCloseTo(1.05);
  });

  it('walks through the gas phases across the cycle', () => {
    expect(gasState(90, PETROL).phase).toBe('fresh');
    expect(gasState(300, PETROL).phase).toBe('compressed');
    expect(gasState(365, PETROL).phase).toBe('burning');
    expect(gasState(650, PETROL).phase).toBe('burnt');
  });

  it('fills during intake and empties during exhaust', () => {
    expect(gasState(10, PETROL).fill).toBeLessThan(gasState(170, PETROL).fill);
    expect(gasState(550, PETROL).fill).toBeGreaterThan(gasState(710, PETROL).fill);
    expect(gasState(300, PETROL).fill).toBe(1);
  });

  it('keeps heat and compression within the unit range', () => {
    for (let angle = 0; angle < 720; angle += 7) {
      const state = gasState(angle, DIESEL);
      expect(state.heat).toBeGreaterThanOrEqual(0);
      expect(state.heat).toBeLessThanOrEqual(1);
      expect(state.compression).toBeGreaterThanOrEqual(0);
      expect(state.compression).toBeLessThanOrEqual(1);
    }
  });
});
