import { describe, expect, it } from 'vitest';
import { PHASE_IDS, VALVE_IDS } from '../ids';
import type { PhaseId, ValveState } from '../ids';
import {
  AV_VALVES_CLOSE_MS,
  AV_VALVES_OPEN_MS,
  BEAT_MS,
  EJECTION,
  EJECTION_FRACTION,
  END_DIASTOLIC_ML,
  END_SYSTOLIC_ML,
  PHASE_RANGES,
  SEMILUNAR_CLOSE_MS,
  SEMILUNAR_OPEN_MS,
  WAVE_MOMENTS,
  activation,
  aorticFlow,
  aorticPressure,
  atrialFullness,
  atrialGlow,
  conductionSite,
  ecgMillivolts,
  ecgWave,
  heartSound,
  isValveOpen,
  leftAtrialPressure,
  leftVentricleFlow,
  leftVentriclePressure,
  leftVentricleVolume,
  mitralFlow,
  openValves,
  phaseAt,
  pulmonaryArteryPressure,
  rightAtrialPressure,
  rightVentriclePressure,
  valveOpening,
  valveState,
  ventricularGlow,
  ventricularSqueeze,
  wrapTime,
} from './cycle';

const PHASE_VALVE_STATES_AT_START: Readonly<Record<PhaseId, ValveState>> = {
  atria: 'avOpen',
  squeeze: 'allClosed',
  eject: 'semilunarOpen',
  relax: 'allClosed',
  fill: 'avOpen',
  rest: 'avOpen',
};

const CURVES = [
  leftVentricleVolume,
  leftVentriclePressure,
  aorticPressure,
  leftAtrialPressure,
  rightVentriclePressure,
  pulmonaryArteryPressure,
  rightAtrialPressure,
  atrialFullness,
  ecgMillivolts,
];

function peak(curve: (time: number) => number): { time: number; value: number } {
  let best = { time: 0, value: Number.NEGATIVE_INFINITY };
  for (let time = 0; time < BEAT_MS; time += 1) {
    const value = curve(time);
    if (value > best.value) best = { time, value };
  }
  return best;
}

describe('cycle', () => {
  it('wraps time onto one beat', () => {
    expect(wrapTime(BEAT_MS)).toBe(0);
    expect(wrapTime(-10)).toBe(790);
    expect(wrapTime(1250)).toBe(450);
  });

  it('covers the beat with six phases in order', () => {
    expect(PHASE_RANGES.atria.start).toBe(0);
    expect(PHASE_RANGES.rest.end).toBe(BEAT_MS);
    expect(phaseAt(0)).toBe('atria');
    expect(phaseAt(200)).toBe('squeeze');
    expect(phaseAt(300)).toBe('eject');
    expect(phaseAt(550)).toBe('relax');
    expect(phaseAt(600)).toBe('fill');
    expect(phaseAt(799)).toBe('rest');
    expect(phaseAt(BEAT_MS)).toBe('atria');
  });

  it('keeps every curve continuous across the seam', () => {
    for (const curve of CURVES) {
      expect(Math.abs(curve(BEAT_MS - 0.5) - curve(0.5))).toBeLessThan(0.5);
      for (let time = 1; time < BEAT_MS; time += 1) {
        expect(Math.abs(curve(time) - curve(time - 1))).toBeLessThan(4);
      }
    }
  });

  it('fills the ventricle to 120 mL and empties it to 50', () => {
    expect(leftVentricleVolume(0)).toBe(105);
    expect(leftVentricleVolume(AV_VALVES_CLOSE_MS)).toBe(END_DIASTOLIC_ML);
    expect(leftVentricleVolume(SEMILUNAR_OPEN_MS)).toBe(END_DIASTOLIC_ML);
    expect(leftVentricleVolume(SEMILUNAR_CLOSE_MS)).toBeCloseTo(END_SYSTOLIC_ML, 5);
    expect(leftVentricleVolume(AV_VALVES_OPEN_MS)).toBe(END_SYSTOLIC_ML);
    expect(leftVentricleVolume(720)).toBeCloseTo(102, 5);
    expect(EJECTION_FRACTION).toBeCloseTo(0.583, 3);
  });

  it('ejects most of the stroke early', () => {
    expect(leftVentricleVolume(330)).toBeLessThanOrEqual(92);
    const flowPeak = peak(aorticFlow);
    expect(flowPeak.time - EJECTION.start).toBeGreaterThan(50);
    expect(flowPeak.time - EJECTION.start).toBeLessThan(100);
    expect(flowPeak.value).toBeGreaterThan(300);
    expect(flowPeak.value).toBeLessThan(560);
    expect(mitralFlow(650)).toBeGreaterThan(200);
    expect(leftVentricleFlow(200)).toBe(0);
  });

  it('squeezes the ventricle fully at the end of ejection', () => {
    expect(ventricularSqueeze(AV_VALVES_CLOSE_MS)).toBe(0);
    expect(ventricularSqueeze(SEMILUNAR_CLOSE_MS)).toBeCloseTo(1, 5);
    expect(ventricularSqueeze(0)).toBeCloseTo(15 / 70, 5);
  });

  it('fills the atria while the ventricles squeeze and empties them with the kick', () => {
    expect(atrialFullness(590)).toBeCloseTo(1, 5);
    expect(atrialFullness(170)).toBeCloseTo(0, 5);
    expect(atrialFullness(760)).toBeCloseTo(0.45, 2);
  });

  it('draws the left ventricle pressure like a textbook', () => {
    expect(leftVentriclePressure(AV_VALVES_CLOSE_MS)).toBeCloseTo(10, 5);
    expect(leftVentriclePressure(SEMILUNAR_OPEN_MS)).toBeCloseTo(80, 5);
    expect(leftVentriclePressure(SEMILUNAR_CLOSE_MS)).toBeCloseTo(100, 5);
    expect(leftVentriclePressure(AV_VALVES_OPEN_MS)).toBeCloseTo(8, 5);
    const top = peak(leftVentriclePressure);
    expect(top.value).toBeCloseTo(120, 0);
    expect(top.time).toBeGreaterThan(330);
    expect(top.time).toBeLessThan(350);
    expect(leftVentriclePressure(700)).toBeLessThan(8);
  });

  it('keeps the ventricle below the atrium whenever the mitral valve is open', () => {
    for (let time = 0; time < BEAT_MS; time += 1) {
      if (!isValveOpen('mitral', time) || time > 160) continue;
      expect(leftVentriclePressure(time)).toBeLessThanOrEqual(leftAtrialPressure(time) + 0.15);
    }
  });

  it('keeps the aorta between 80 and 120 with a notch after the valve shuts', () => {
    expect(aorticPressure(SEMILUNAR_OPEN_MS)).toBeCloseTo(80, 5);
    expect(peak(aorticPressure).value).toBeCloseTo(120, 5);
    for (let time = 0; time < BEAT_MS; time += 1) {
      expect(aorticPressure(time)).toBeGreaterThanOrEqual(78);
      expect(aorticPressure(time)).toBeLessThanOrEqual(121);
    }
    expect(aorticPressure(532)).toBeLessThan(aorticPressure(520));
    expect(aorticPressure(546)).toBeGreaterThan(aorticPressure(532));
  });

  it('keeps the right side at a fifth of the pressure', () => {
    expect(peak(rightVentriclePressure).value).toBeCloseTo(25, 5);
    expect(peak(pulmonaryArteryPressure).value).toBeCloseTo(25, 5);
    expect(peak(leftAtrialPressure).value).toBeCloseTo(10.4, 5);
    expect(peak(rightAtrialPressure).value).toBeCloseTo(5, 5);
  });

  it('opens and shuts the valves in the textbook order', () => {
    expect(openValves(300)).toEqual(['pulmonary', 'aortic']);
    expect(openValves(650)).toEqual(['tricuspid', 'mitral']);
    expect(openValves(215)).toEqual([]);
    expect(openValves(560)).toEqual([]);
    expect(valveState(300)).toBe('semilunarOpen');
    expect(valveState(650)).toBe('avOpen');
    expect(valveState(560)).toBe('allClosed');
    for (const id of PHASE_IDS) {
      expect(valveState(PHASE_RANGES[id].start)).toBe(PHASE_VALVE_STATES_AT_START[id]);
    }
    expect(valveOpening('mitral', AV_VALVES_OPEN_MS + 15)).toBeCloseTo(0.5, 5);
    expect(valveOpening('mitral', AV_VALVES_CLOSE_MS - 10)).toBeCloseTo(0.5, 5);
    expect(valveOpening('pulmonary', 255)).toBeCloseTo(0.5, 5);
    expect(valveOpening('pulmonary', 530)).toBeCloseTo(0.5, 5);
    for (const valve of VALVE_IDS) {
      for (let time = 0; time < BEAT_MS; time += 1) {
        expect(valveOpening(valve, time)).toBeGreaterThanOrEqual(0);
        expect(valveOpening(valve, time)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('sounds S1 at the first closure and S2 at the second', () => {
    expect(heartSound(AV_VALVES_CLOSE_MS)).toBe('s1');
    expect(heartSound(SEMILUNAR_CLOSE_MS)).toBe('s2');
    expect(heartSound(400)).toBeNull();
    expect(heartSound(700)).toBeNull();
  });

  it('traces an electrocardiogram with a tall R wave', () => {
    const top = peak(ecgMillivolts);
    expect(top.time).toBe(WAVE_MOMENTS.qrs);
    expect(top.value).toBeCloseTo(1.2, 1);
    expect(ecgMillivolts(WAVE_MOMENTS.p)).toBeCloseTo(0.15, 2);
    expect(ecgMillivolts(WAVE_MOMENTS.t)).toBeCloseTo(0.3, 2);
    expect(Math.abs(ecgMillivolts(300))).toBeLessThan(0.01);
    expect(Math.abs(ecgMillivolts(700))).toBeLessThan(0.01);
    expect(ecgWave(WAVE_MOMENTS.p)).toBe('p');
    expect(ecgWave(WAVE_MOMENTS.qrs)).toBe('qrs');
    expect(ecgWave(WAVE_MOMENTS.t)).toBe('t');
    expect(ecgWave(300)).toBeNull();
  });

  it('runs the signal down the conduction system in order', () => {
    expect(conductionSite(5)).toBe('sinusNode');
    expect(conductionSite(40)).toBe('atria');
    expect(conductionSite(120)).toBe('avNode');
    expect(conductionSite(85)).toBe('atria');
    expect(conductionSite(155)).toBe('bundle');
    expect(conductionSite(170)).toBe('branches');
    expect(conductionSite(180)).toBe('purkinje');
    expect(conductionSite(210)).toBe('ventricles');
    expect(conductionSite(300)).toBe('ventricles');
    expect(conductionSite(450)).toBe('recovering');
    expect(conductionSite(700)).toBe('quiet');
    expect(activation('atria', 45)).toBeCloseTo(0.5, 5);
    expect(activation('ventricles', 100)).toBe(0);
    expect(activation('ventricles', 300)).toBe(1);
  });

  it('glows the walls while they are depolarised', () => {
    expect(atrialGlow(90)).toBe(1);
    expect(atrialGlow(200)).toBeCloseTo(0.5, 5);
    expect(atrialGlow(300)).toBe(0);
    expect(ventricularGlow(300)).toBe(1);
    expect(ventricularGlow(432.5)).toBeCloseTo(0.5, 5);
    expect(ventricularGlow(600)).toBe(0);
  });
});
