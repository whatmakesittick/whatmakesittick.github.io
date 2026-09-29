import { describe, expect, it } from 'vitest';
import { bloodPath } from './bloodPath';
import type { PathLeg } from './bloodPath';
import { fluxAt, speedAt } from './bloodMotion';

const LEGS: PathLeg[] = [
  {
    points: [
      [0, 100, 0],
      [0, 60, 0],
    ],
    radius: 5,
    zone: 'vein',
    chamber: false,
  },
  {
    points: [
      [0, 40, 0],
      [0, 20, 0],
    ],
    radius: 10,
    zone: 'atrium',
    chamber: true,
  },
  {
    points: [
      [0, 0, 0],
      [0, -20, 0],
      [10, 0, 0],
    ],
    radius: 10,
    zone: 'ventricle',
    chamber: true,
  },
  {
    points: [
      [15, 30, 0],
      [15, 120, 0],
    ],
    radius: 5,
    zone: 'artery',
    chamber: false,
  },
];
const PATH = bloodPath(LEGS);
const SCALE = {
  mmPerMsPerMl: 0.001,
  meanFlow: 90,
  referenceRadius: 5,
  minimumRadius: 1,
  complianceMm: 40,
};
const SHUT = { inlet: 0, outlet: 0 };

describe('blood motion', () => {
  it('keeps the veins flowing at the mean rate whatever the valves do', () => {
    expect(fluxAt(PATH, 1, SHUT, SCALE)).toBe(90);
    expect(fluxAt(PATH, 1, { inlet: 400, outlet: 0 }, SCALE)).toBe(90);
  });

  it('stops the blood at a shut inlet valve and lets it through an open one', () => {
    const atValve = PATH.gates.ventricle - 0.01;
    expect(fluxAt(PATH, atValve, SHUT, SCALE)).toBeLessThan(0.5);
    expect(fluxAt(PATH, atValve, { inlet: 400, outlet: 0 }, SCALE)).toBeGreaterThan(390);
  });

  it('holds the ventricle still while every valve is shut and empties it when the outlet opens', () => {
    const middle = (PATH.gates.ventricle + PATH.gates.artery) / 2;
    expect(fluxAt(PATH, middle, SHUT, SCALE)).toBe(0);
    expect(
      fluxAt(PATH, PATH.gates.artery - 0.01, { inlet: 0, outlet: 500 }, SCALE),
    ).toBeGreaterThan(490);
  });

  it('pulses at the artery root and settles to the mean further out', () => {
    expect(
      fluxAt(PATH, PATH.gates.artery + 0.01, { inlet: 0, outlet: 500 }, SCALE),
    ).toBeGreaterThan(490);
    expect(fluxAt(PATH, PATH.length - 1, { inlet: 0, outlet: 500 }, SCALE)).toBe(90);
  });

  it('moves slower where the stream is wider', () => {
    const narrow = speedAt(PATH, 1, SHUT, SCALE, 5);
    const wide = speedAt(PATH, 1, SHUT, SCALE, 10);
    expect(narrow).toBeCloseTo(0.09, 5);
    expect(wide).toBeCloseTo(narrow / 4, 5);
  });
});
