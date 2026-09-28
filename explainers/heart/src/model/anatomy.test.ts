import { describe, expect, it } from 'vitest';
import { CHAMBER_FACTS, peakOf, valveFacts, valveMoment, valveMotion } from './anatomy';

describe('chamber facts', () => {
  it('gives the left ventricle the thickest wall and the highest pressure', () => {
    expect(CHAMBER_FACTS.leftVentricle.wallMm).toEqual({ from: 10, to: 12 });
    expect(CHAMBER_FACTS.rightVentricle.wallMm).toEqual({ from: 3, to: 5 });
    expect(CHAMBER_FACTS.leftVentricle.peakPressureMmHg).toBeCloseTo(120, 0);
    expect(CHAMBER_FACTS.rightVentricle.peakPressureMmHg).toBeCloseTo(25, 0);
  });

  it('reads the atrial peaks from the a wave of the cycle model', () => {
    expect(CHAMBER_FACTS.leftAtrium.peakPressureMmHg).toBeCloseTo(11, 0);
    expect(CHAMBER_FACTS.rightAtrium.peakPressureMmHg).toBeCloseTo(6, 0);
  });

  it('fills both ventricles to the same 120 mL', () => {
    expect(CHAMBER_FACTS.leftVentricle.fullestMl).toBe(120);
    expect(CHAMBER_FACTS.rightVentricle.fullestMl).toBe(120);
    expect(CHAMBER_FACTS.leftAtrium.fullestMl).toBeLessThan(120);
  });

  it('finds the highest point of a curve over one beat', () => {
    expect(peakOf((time) => 5 - Math.abs(time - 300))).toBe(5);
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
    expect(valveFacts('mitral')).toMatchObject({ opensAtMs: 590, closesAtMs: 190, sound: 's1' });
    expect(valveFacts('aortic')).toMatchObject({ opensAtMs: 240, closesAtMs: 510, sound: 's2' });
    expect(valveFacts('pulmonary')).toMatchObject({ opensAtMs: 230, closesAtMs: 530 });
  });

  it('tells a valve that is opening from one that is closing', () => {
    expect(valveMotion('mitral', 100)).toBe('open');
    expect(valveMotion('mitral', 180)).toBe('closing');
    expect(valveMotion('mitral', 300)).toBe('shut');
    expect(valveMotion('mitral', 600)).toBe('opening');
    expect(valveMotion('aortic', 250)).toBe('opening');
    expect(valveMotion('aortic', 400)).toBe('open');
  });

  it('marks the heart sound a valve makes just after it shuts', () => {
    expect(valveMoment('mitral', 200)).toBe('s1');
    expect(valveMoment('tricuspid', 250)).toBe('s1');
    expect(valveMoment('aortic', 200)).toBe('shut');
    expect(valveMoment('aortic', 520)).toBe('s2');
    expect(valveMoment('pulmonary', 520)).toBe('closing');
    expect(valveMoment('pulmonary', 540)).toBe('s2');
    expect(valveMoment('mitral', 300)).toBe('shut');
  });
});
