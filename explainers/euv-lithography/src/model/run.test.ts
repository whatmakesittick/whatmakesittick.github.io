import { describe, expect, it } from 'vitest';
import { MACHINE_IDS, MOMENT_IDS, PHASE_IDS } from '../ids';
import type { MachineId } from '../ids';
import { REFLECTIVITY } from './constants';
import {
  BOUNCE_UNITS,
  CHASE_SPAN,
  CLOCK_KNOTS,
  CLOCK_KNOT_UNITS,
  MOMENTS,
  PHASE_RANGES,
  RUN_UNITS,
  SPEED_RANGE,
  bounceCountAt,
  flashAt,
  insetAt,
  lightLeftAt,
  phaseAt,
  rate,
  realSecondsAt,
  scanAt,
  scanShareAt,
  unitsAfterBounce,
  unitsAt,
} from './run';
import { scanSeconds } from './throughput';

const PERCENT = 100;
const STEPS = [
  100, 70, 49, 34.3, 24.01, 16.807, 11.7649, 8.23543, 5.764801, 4.0353607, 2.82475249, 1.977326743,
];

describe('run', () => {
  it('splits the run into contiguous phases', () => {
    expect(PHASE_RANGES.droplet.start).toBe(0);
    expect(PHASE_RANGES.expose.end).toBe(RUN_UNITS);
    PHASE_IDS.slice(1).forEach((id, at) => {
      expect(PHASE_RANGES[id].start).toBe(PHASE_RANGES[PHASE_IDS[at]].end);
    });
    expect(phaseAt(-5)).toBe('droplet');
    expect(phaseAt(150)).toBe('prepulse');
    expect(phaseAt(1000)).toBe('expose');
  });

  it('seeks the six moments', () => {
    expect(MOMENT_IDS.map((id) => MOMENTS[id])).toEqual([0, 150, 260, 520, 700, 800]);
    expect(Object.values(CHASE_SPAN)).toEqual([1.2, 1.2, 1.2, 3, 3, 2]);
  });

  it('runs 60 seconds at the default speed', () => {
    expect(SPEED_RANGE.default).toBe(2);
    expect(RUN_UNITS / rate(SPEED_RANGE.default)).toBeCloseTo(60, 9);
  });

  it.each(MACHINE_IDS)('keeps the %s clock monotonic and continuous', (machine) => {
    const knots = CLOCK_KNOTS[machine];
    expect(knots).toHaveLength(CLOCK_KNOT_UNITS.length);
    knots.slice(1).forEach((knot, at) => expect(knot).toBeGreaterThan(knots[at]));
    CLOCK_KNOT_UNITS.forEach((units, at) => {
      expect(realSecondsAt(units, machine)).toBeCloseTo(knots[at], 12);
      if (at > 0) {
        const before = realSecondsAt(units - 1e-6, machine);
        expect(Math.abs(before - knots[at]) / Math.abs(knots[at] - knots[at - 1])).toBeLessThan(
          1e-3,
        );
      }
    });
    let previous = realSecondsAt(0, machine);
    for (let units = 1; units <= RUN_UNITS; units += 1) {
      const seconds = realSecondsAt(units, machine);
      expect(seconds).toBeGreaterThan(previous);
      previous = seconds;
    }
  });

  it('starts 20 ms before the flash, hits zero at the flash and ends on the scan time', () => {
    expect(realSecondsAt(0, 'nxe3600d')).toBeCloseTo(-0.02, 9);
    expect(realSecondsAt(MOMENTS.flash, 'nxe3600d')).toBe(0);
    expect(realSecondsAt(PHASE_RANGES.plasma.end, 'nxe3600d')).toBeCloseTo(20e-9, 15);
    expect(realSecondsAt(MOMENTS.onWafer, 'nxe3600d') * 1e9).toBeCloseTo(75.8, 1);
    MACHINE_IDS.forEach((machine) => {
      expect(realSecondsAt(RUN_UNITS, machine)).toBeCloseTo(scanSeconds(machine), 12);
    });
  });

  it.each(MACHINE_IDS)('inverts the %s clock', (machine: MachineId) => {
    for (let units = 0; units <= RUN_UNITS; units += 7.5) {
      expect(unitsAt(realSecondsAt(units, machine), machine)).toBeCloseTo(units, 6);
    }
    expect(unitsAt(-1, machine)).toBe(0);
    expect(unitsAt(10, machine)).toBe(RUN_UNITS);
  });

  it('reaches the eleven mirrors in order, the mask at units 700', () => {
    expect(BOUNCE_UNITS).toHaveLength(11);
    BOUNCE_UNITS.slice(1).forEach((units, at) => expect(units).toBeGreaterThan(BOUNCE_UNITS[at]));
    expect(BOUNCE_UNITS[4]).toBeCloseTo(MOMENTS.onMask, 9);
    expect(BOUNCE_UNITS[0]).toBeGreaterThan(MOMENTS.atFocus);
    expect(BOUNCE_UNITS[10]).toBeLessThan(MOMENTS.onWafer);
  });

  it('counts bounces and finds the units after each', () => {
    expect(bounceCountAt(MOMENTS.atFocus)).toBe(0);
    expect(bounceCountAt(RUN_UNITS)).toBe(11);
    expect(unitsAfterBounce(0)).toBe(MOMENTS.atFocus);
    expect(unitsAfterBounce(11)).toBe(BOUNCE_UNITS[10]);
    for (let count = 1; count <= 11; count += 1) {
      expect(bounceCountAt(unitsAfterBounce(count))).toBe(count);
    }
  });

  it('steps the light left from 100 down to 2.0 percent', () => {
    const steps = [0, ...BOUNCE_UNITS.map((units) => units)].map((units, at) =>
      at === 0 ? lightLeftAt(MOMENTS.atFocus) : lightLeftAt(units),
    );
    steps.forEach((value, at) => expect(value * PERCENT).toBeCloseTo(STEPS[at], 6));
    expect((lightLeftAt(RUN_UNITS) * PERCENT).toFixed(1)).toBe('2.0');
    expect(lightLeftAt(RUN_UNITS)).toBeCloseTo(REFLECTIVITY ** 11, 12);
  });

  it('holds the light at zero before the flash, rises in the burst and holds 100 percent to the focus', () => {
    expect(lightLeftAt(0)).toBe(0);
    expect(lightLeftAt(MOMENTS.flash - 1)).toBe(0);
    expect(lightLeftAt(320)).toBeCloseTo(0.5, 9);
    expect(lightLeftAt(PHASE_RANGES.plasma.end)).toBe(1);
    expect(lightLeftAt(450)).toBe(1);
  });

  it('shows the droplet inset to units 520 and the pattern inset from 640', () => {
    expect(insetAt(0)).toBe('droplet');
    expect(insetAt(519)).toBe('droplet');
    expect(insetAt(520)).toBe('none');
    expect(insetAt(639)).toBe('none');
    expect(insetAt(640)).toBe('pattern');
    expect(insetAt(1000)).toBe('pattern');
  });

  it('scans only after units 800 and moves the stages in opposite directions', () => {
    expect(scanShareAt(800)).toBe(0);
    expect(scanShareAt(900)).toBe(0.5);
    expect(scanShareAt(1000)).toBe(1);
    const half = scanAt(950, 'nxe3600d');
    expect(half.maskOffsetM).toBeGreaterThan(0);
    expect(half.waferOffsetM).toBeLessThan(0);
    expect(Math.abs(half.maskOffsetM / half.waferOffsetM)).toBeCloseTo(4, 9);
    expect(
      Math.abs(scanAt(950, 'exe5000').maskOffsetM / scanAt(950, 'exe5000').waferOffsetM),
    ).toBeCloseTo(8, 9);
  });

  it('puts the droplet on the stream and at the plasma point at units 150', () => {
    const start = flashAt(0, 'nxe3600d');
    const end = flashAt(150, 'nxe3600d');
    expect(start.position).toEqual([-3, 2.6, 0]);
    expect(start.place).toBe('generator');
    expect(flashAt(75, 'nxe3600d').place).toBe('flight');
    expect(end.phase).toBe('prepulse');
    expect(end.position).toEqual([-3, 1.2, 0]);
  });

  it('walks the flash through every place in order', () => {
    const places = [0, 75, 200, 300, 450, 600, 750, 800].map(
      (units) => flashAt(units, 'nxe3600d').place,
    );
    expect(places).toEqual([
      'generator',
      'flight',
      'plasma',
      'plasma',
      'collector',
      'illuminator',
      'projection',
      'wafer',
    ]);
    expect(flashAt(700, 'nxe3600d').place).toBe('mask');
  });

  it('ends on the wafer travelling down', () => {
    const last = flashAt(RUN_UNITS, 'exe5000');
    [3.9, 0.3, 0].forEach((value, axis) => expect(last.position[axis]).toBeCloseTo(value, 9));
    expect(last.direction).toEqual([0, -1, 0]);
    expect(last.span).toBe(2);
    expect(last.realSeconds).toBeCloseTo(0.15, 2);
  });
});
