import { describe, expect, it } from 'vitest';
import { COOLING_IDS, MOMENT_IDS, PHASE_IDS } from '../ids';
import type { Point } from '../ids';
import { CHIP_ANCHOR, PLUME_TOP } from './layout';
import { WAYPOINTS } from './path';
import {
  BASE_RUN_SECONDS,
  CHASE_SPAN,
  CLOCK_KNOTS,
  DEFAULT_SPEED,
  MOMENTS,
  PHASE_RANGES,
  RUN_UNITS,
  SLOW_SPEED,
  SPEED_RANGE,
  jouleAt,
  phaseAt,
  rate,
  realSecondsAt,
  unitsAt,
} from './run';

const DIGITS = 9;
const BOUNDARY_STEP = 1e-6;
const SECONDS_PER_MINUTE = 60;
const RELATIVE_TOLERANCE = 1e-9;

function unitsAcross(from: number, to: number, step: number): number[] {
  return Array.from(
    { length: Math.floor((to - from) / step) + 1 },
    (_, index) => from + index * step,
  );
}

function expectPoint(actual: Point, expected: Point): void {
  actual.forEach((value, axis) => expect(value).toBeCloseTo(expected[axis], DIGITS));
}

function expectRelative(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(Math.abs(expected) * RELATIVE_TOLERANCE);
}

describe('run', () => {
  it('splits the run into six touching bands of fixed run units', () => {
    expect(PHASE_RANGES.grid.start).toBe(0);
    expect(PHASE_RANGES.release.end).toBe(RUN_UNITS);
    PHASE_IDS.slice(1).forEach((id, index) =>
      expect(PHASE_RANGES[id].start).toBe(PHASE_RANGES[PHASE_IDS[index]].end),
    );
    expect(PHASE_IDS.map((id) => PHASE_RANGES[id].end)).toEqual([150, 300, 450, 600, 850, 1000]);
  });

  it('reads the stage at the band edges, counts the end of the run as release and clamps', () => {
    expect(phaseAt(-10)).toBe('grid');
    expect(phaseAt(0)).toBe('grid');
    expect(phaseAt(150 - BOUNDARY_STEP)).toBe('grid');
    expect(phaseAt(150)).toBe('protect');
    expect(phaseAt(300)).toBe('distribute');
    expect(phaseAt(450)).toBe('compute');
    expect(phaseAt(600)).toBe('cool');
    expect(phaseAt(850 - BOUNDARY_STEP)).toBe('cool');
    expect(phaseAt(850)).toBe('release');
    expect(phaseAt(RUN_UNITS)).toBe('release');
    expect(phaseAt(RUN_UNITS + 10)).toBe('release');
  });

  it('marks the four moments in order at fixed units', () => {
    expect(MOMENTS).toEqual({ atRack: 450, becomesHeat: 520, inCoolant: 600, onRoof: 850 });
    MOMENT_IDS.slice(1).forEach((id, index) =>
      expect(MOMENTS[id]).toBeGreaterThan(MOMENTS[MOMENT_IDS[index]]),
    );
  });

  it('plays the whole run in a minute at the default pace', () => {
    expect(rate(DEFAULT_SPEED) * SECONDS_PER_MINUTE).toBeCloseTo(RUN_UNITS, DIGITS);
    expect(SPEED_RANGE).toEqual({ min: 1, max: 16, step: 1, default: DEFAULT_SPEED });
    expect(DEFAULT_SPEED).toBe(4);
    expect(SLOW_SPEED).toBe(2);
    expect(BASE_RUN_SECONDS).toBe(240);
  });

  it('puts the model clock on the knots at every band edge', () => {
    expect(CLOCK_KNOTS).toEqual([0, 3e-7, 5e-7, 7e-7, 0.01, 40, 60]);
    const edges = [0, ...PHASE_IDS.map((id) => PHASE_RANGES[id].end)];
    edges.forEach((units, index) => expectRelative(realSecondsAt(units), CLOCK_KNOTS[index]));
  });

  it('runs the clock linearly in every band but compute, which multiplies at each step', () => {
    expectRelative(realSecondsAt(75), 1.5e-7);
    expectRelative(realSecondsAt(725), 20.005);
    expectRelative(realSecondsAt(925), 50);
    expectRelative(realSecondsAt(525), Math.sqrt(7e-7 * 0.01));
    const ratio = realSecondsAt(470) / realSecondsAt(460);
    expectRelative(realSecondsAt(590) / realSecondsAt(580), ratio);
  });

  it('only ever moves the clock forward', () => {
    const clock = unitsAcross(0, RUN_UNITS, 1).map(realSecondsAt);
    clock.slice(1).forEach((seconds, index) => expect(seconds).toBeGreaterThan(clock[index]));
  });

  it('turns the clock back into the same run units and clamps outside the run', () => {
    unitsAcross(0, RUN_UNITS, 7).forEach((units) =>
      expect(unitsAt(realSecondsAt(units)), `${units}`).toBeCloseTo(units, 6),
    );
    expect(unitsAt(-5)).toBe(0);
    expect(unitsAt(CLOCK_KNOTS[CLOCK_KNOTS.length - 1] + 60)).toBe(RUN_UNITS);
    expect(realSecondsAt(-5)).toBe(0);
    expect(realSecondsAt(RUN_UNITS + 50)).toBe(60);
    expect(unitsAt(0.01)).toBeCloseTo(600, DIGITS);
    expect(unitsAt(40)).toBeCloseTo(850, DIGITS);
  });

  it('frames the chase wider outdoors and closest inside the rack', () => {
    expect(CHASE_SPAN).toEqual({
      grid: 30,
      protect: 12,
      distribute: 6,
      compute: 2.5,
      cool: 8,
      release: 30,
    });
    PHASE_IDS.forEach((phase) =>
      expect(jouleAt(PHASE_RANGES[phase].start, 'liquid').span).toBe(CHASE_SPAN[phase]),
    );
  });

  it('starts the joule on the grid line as current, at no time at all', () => {
    COOLING_IDS.forEach((cooling) => {
      const joule = jouleAt(0, cooling);
      expect(joule).toMatchObject({
        phase: 'grid',
        units: 0,
        share: 0,
        realSeconds: 0,
        form: 'current',
        carrier: 'line',
      });
      expectPoint(joule.position, WAYPOINTS.lineStart);
      expect(joule.heading).toBeCloseTo(0, DIGITS);
    });
  });

  it('hands the joule from stage to stage without a jump', () => {
    COOLING_IDS.forEach((cooling) =>
      PHASE_IDS.slice(1).forEach((phase) => {
        const edge = PHASE_RANGES[phase].start;
        const before = jouleAt(edge - BOUNDARY_STEP, cooling).position;
        const after = jouleAt(edge, cooling).position;
        const gap = Math.hypot(...before.map((value, axis) => value - after[axis]));
        expect(gap, `${cooling} ${phase}`).toBeLessThan(1e-3);
      }),
    );
  });

  it('reaches the power shelf at the rack, the chip at becomes heat, and holds there', () => {
    COOLING_IDS.forEach((cooling) => {
      const atRack = jouleAt(MOMENTS.atRack, cooling);
      expect(atRack).toMatchObject({ phase: 'compute', share: 0, form: 'current' });
      expect(atRack.carrier).toBe('busbar');
      expectPoint(atRack.position, WAYPOINTS.shelf);
      expect(jouleAt(MOMENTS.becomesHeat - BOUNDARY_STEP, cooling).form).toBe('current');
      const heat = jouleAt(MOMENTS.becomesHeat, cooling);
      expect(heat).toMatchObject({ phase: 'compute', form: 'heat', carrier: 'chip' });
      expect(heat.share).toBeCloseTo(70 / 150, DIGITS);
      expectPoint(heat.position, CHIP_ANCHOR);
      expectPoint(jouleAt(560, cooling).position, CHIP_ANCHOR);
      expectPoint(jouleAt(600 - BOUNDARY_STEP, cooling).position, CHIP_ANCHOR);
    });
  });

  it('sends the heat into water or air at the chip and onto the roof by 850', () => {
    const liquid = jouleAt(MOMENTS.inCoolant, 'liquid');
    expect(liquid).toMatchObject({ phase: 'cool', share: 0, form: 'heat', carrier: 'water' });
    expectPoint(liquid.position, CHIP_ANCHOR);
    const air = jouleAt(MOMENTS.inCoolant, 'air');
    expect(air).toMatchObject({ phase: 'cool', form: 'heat', carrier: 'air' });
    expectPoint(air.position, CHIP_ANCHOR);
    expectPoint(jouleAt(MOMENTS.onRoof, 'liquid').position, WAYPOINTS.riserTop);
    expectPoint(jouleAt(MOMENTS.onRoof, 'air').position, WAYPOINTS.wallPipeTop);
    expect(jouleAt(MOMENTS.onRoof, 'air').carrier).toBe('water');
  });

  it('ends at the top of the plume, out in the air, a minute after the grid', () => {
    COOLING_IDS.forEach((cooling) => {
      const end = jouleAt(RUN_UNITS + 100, cooling);
      expect(end).toMatchObject({
        phase: 'release',
        units: RUN_UNITS,
        share: 1,
        form: 'heat',
        carrier: 'air',
        realSeconds: 60,
      });
      expectPoint(end.position, PLUME_TOP);
    });
  });

  it('reads the share inside the stage and the clock with it', () => {
    const joule = jouleAt(225, 'liquid');
    expect(joule.phase).toBe('protect');
    expect(joule.share).toBeCloseTo(0.5, DIGITS);
    expectRelative(joule.realSeconds, 4e-7);
    expect(jouleAt(-20, 'air').units).toBe(0);
  });
});
