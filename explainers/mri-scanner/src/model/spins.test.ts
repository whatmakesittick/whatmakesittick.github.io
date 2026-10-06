import { describe, expect, it } from 'vitest';
import { FIELD_IDS, TISSUE_IDS, WEIGHTING_IDS } from '../ids';
import type { Point } from '../ids';
import { CYCLE_UNITS, MOMENTS, PHASE_RANGES } from './sequence';
import { tissueSignal } from './signal';
import { echoAmplitude, magnetisation, SPIN_COUNT, spinArrows } from './spins';

const RIGHT_ANGLE = 90;
const SMALL_TIP = 30;
const HALF_TURN = 180;
const LOOSE = 3;
const SPIN_ECHO_SHIFT = 0.013;

function alongOf(point: Point): number {
  return -point[2];
}

function expectNearSignal(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThan(SPIN_ECHO_SHIFT);
}

function length([x, y, z]: Point): number {
  return Math.hypot(x, y, z);
}

function expectPointClose(actual: Point, expected: Point, digits = LOOSE): void {
  actual.forEach((value, axis) => expect(value).toBeCloseTo(expected[axis], digits));
}

describe('net magnetisation', () => {
  it('rests along the main field, which points along minus z', () => {
    const [x, y, z] = magnetisation(0, 't2', 'whiteMatter', 'field15', RIGHT_ANGLE);
    expect(x).toBe(0);
    expect(y).toBe(0);
    expect(z).toBeLessThan(0);
  });

  it('lies across the field after a 90 degree pulse', () => {
    const [across, , along] = magnetisation(
      PHASE_RANGES.excite[1],
      't1',
      'fat',
      'field15',
      RIGHT_ANGLE,
    );
    expect(across).toBeGreaterThan(0.5);
    expect(Math.abs(along)).toBeLessThan(0.05);
  });

  it('loses its sideways part while the spins fan out and gets it back at the echo', () => {
    const fanned = magnetisation(MOMENTS.pulse180, 't2', 'greyMatter', 'field30', RIGHT_ANGLE);
    const echo = magnetisation(MOMENTS.echoPeak, 't2', 'greyMatter', 'field30', RIGHT_ANGLE);
    expect(fanned[0]).toBeCloseTo(0, 6);
    expectNearSignal(echo[0], tissueSignal('greyMatter', 'field30', 't2'));
  });

  it('regrows along the field during recovery', () => {
    const early = magnetisation(
      PHASE_RANGES.recover[0],
      't1',
      'whiteMatter',
      'field15',
      RIGHT_ANGLE,
    );
    const late = magnetisation(MOMENTS.repetitionEnd, 't1', 'whiteMatter', 'field15', RIGHT_ANGLE);
    expect(late[2]).toBeLessThan(early[2]);
  });

  it('turns the along-field part over with the refocusing pulse at a small tip', () => {
    const before = magnetisation(PHASE_RANGES.refocus[0], 't1', 'fat', 'field15', SMALL_TIP);
    const after = magnetisation(PHASE_RANGES.refocus[1], 't1', 'fat', 'field15', SMALL_TIP);
    expect(alongOf(before)).toBeGreaterThan(0);
    expect(alongOf(after)).toBeLessThan(0);
  });

  it('points back up the field after a 180 degree tip and its refocusing pulse', () => {
    const after = magnetisation(PHASE_RANGES.refocus[1], 't2', 'fat', 'field15', HALF_TURN);
    expect(alongOf(after)).toBeGreaterThan(0);
  });

  it.each([SMALL_TIP, RIGHT_ANGLE, 150, HALF_TURN])(
    'closes the loop smoothly for a %d degree pulse',
    (tip) => {
      const start = magnetisation(0, 't1', 'greyMatter', 'field15', tip);
      const end = magnetisation(CYCLE_UNITS, 't1', 'greyMatter', 'field15', tip);
      expectPointClose(start, end, 6);
    },
  );
});

describe('spin arrows', () => {
  it('draws the same 64 unit arrows every time', () => {
    const arrows = spinArrows(MOMENTS.pulse180, 't2', 'fluid', 'field15', RIGHT_ANGLE);
    expect(arrows).toHaveLength(SPIN_COUNT);
    for (const arrow of arrows) expect(length(arrow)).toBeCloseTo(1, 10);
    expect(spinArrows(MOMENTS.pulse180, 't2', 'fluid', 'field15', RIGHT_ANGLE)).toEqual(arrows);
  });

  it('gathers around the net vector at the echo', () => {
    const net = magnetisation(MOMENTS.echoPeak, 't2', 'fluid', 'field15', RIGHT_ANGLE);
    const arrows = spinArrows(MOMENTS.echoPeak, 't2', 'fluid', 'field15', RIGHT_ANGLE);
    const mean = arrows.reduce<Point>(
      (sum, arrow) => [sum[0] + arrow[0], sum[1] + arrow[1], sum[2] + arrow[2]],
      [0, 0, 0],
    );
    const cosine =
      (mean[0] * net[0] + mean[1] * net[1] + mean[2] * net[2]) / (length(mean) * length(net));
    expect(cosine).toBeGreaterThan(0.95);
  });

  it('matches at both ends of the loop', () => {
    const start = spinArrows(0, 't2', 'fluid', 'field15', RIGHT_ANGLE);
    const end = spinArrows(CYCLE_UNITS, 't2', 'fluid', 'field15', RIGHT_ANGLE);
    start.forEach((arrow, index) => expectPointClose(arrow, end[index]));
  });
});

describe('echo amplitude', () => {
  it('peaks at the echo with the tissue signal and is silent outside the echo', () => {
    const peak = echoAmplitude(MOMENTS.echoPeak, 't1', 'fat', 'field15', RIGHT_ANGLE);
    expectNearSignal(peak, tissueSignal('fat', 'field15', 't1'));
    expect(echoAmplitude(MOMENTS.echoPeak - 40, 't1', 'fat', 'field15', RIGHT_ANGLE)).toBeLessThan(
      peak,
    );
    expect(echoAmplitude(MOMENTS.echoPeak + 40, 't1', 'fat', 'field15', RIGHT_ANGLE)).toBeLessThan(
      peak,
    );
    expect(echoAmplitude(PHASE_RANGES.echo[0], 't1', 'fat', 'field15', RIGHT_ANGLE)).toBeCloseTo(
      0,
      6,
    );
    expect(echoAmplitude(MOMENTS.pulse90, 't1', 'fat', 'field15', RIGHT_ANGLE)).toBe(0);
  });

  it.each(TISSUE_IDS)('keeps the 90 degree echo of %s at the tissue signal', (tissue) => {
    FIELD_IDS.forEach((field) =>
      WEIGHTING_IDS.forEach((weighting) =>
        expectNearSignal(
          echoAmplitude(MOMENTS.echoPeak, weighting, tissue, field, RIGHT_ANGLE),
          tissueSignal(tissue, field, weighting),
        ),
      ),
    );
  });

  it('shrinks with a smaller tip', () => {
    const full = echoAmplitude(MOMENTS.echoPeak, 't2', 'fluid', 'field30', RIGHT_ANGLE);
    const small = echoAmplitude(MOMENTS.echoPeak, 't2', 'fluid', 'field30', 30);
    expect(small).toBeLessThan(full);
  });
});
