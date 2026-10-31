import { describe, expect, it } from 'vitest';
import { COOLING_IDS, PHASE_IDS } from '../ids';
import type { Point } from '../ids';
import { CHIP_ANCHOR, GRID_LINE, PLUME_TOP, SUBJECT_RACK_BOX, boxSpan } from './layout';
import { ENERGY_PATH, WAYPOINTS, legAt, legLength, legsFor, pathLength, pointOnLegs } from './path';
import type { PathLeg } from './path';

const DIGITS = 9;
const POWER_PHASES = ['grid', 'protect', 'distribute', 'compute'] as const;
const HEAT_PHASES = ['cool', 'release'] as const;

const TOY: readonly PathLeg[] = [
  {
    phase: 'grid',
    carrier: 'line',
    points: [
      [0, 0, 0],
      [3, 0, 0],
    ],
  },
  {
    phase: 'grid',
    carrier: 'cable',
    points: [
      [3, 0, 0],
      [3, 2, 0],
      [3, 2, -5],
    ],
  },
];

function expectPoint(actual: Point, expected: Point): void {
  actual.forEach((value, axis) => expect(value).toBeCloseTo(expected[axis], DIGITS));
}

function lastPoint(leg: PathLeg): Point {
  return leg.points[leg.points.length - 1];
}

describe('energy path', () => {
  it('gives every stage at least one leg for both kinds of cooling, in stage order', () => {
    COOLING_IDS.forEach((cooling) => {
      PHASE_IDS.forEach((phase) => expect(legsFor(cooling, phase).length).toBeGreaterThan(0));
      const order = ENERGY_PATH[cooling].map(({ phase }) => PHASE_IDS.indexOf(phase));
      order.slice(1).forEach((value, index) => expect(value).toBeGreaterThanOrEqual(order[index]));
    });
  });

  it('starts each leg where the previous one ends and never stands still on a segment', () => {
    COOLING_IDS.forEach((cooling) => {
      const legs = ENERGY_PATH[cooling];
      legs.slice(1).forEach((leg, index) => expect(leg.points[0]).toEqual(lastPoint(legs[index])));
      legs.forEach((leg) => {
        expect(leg.points.length).toBeGreaterThanOrEqual(2);
        leg.points.slice(1).forEach((point, index) => expect(point).not.toEqual(leg.points[index]));
      });
    });
  });

  it('runs from the grid line to the top of the plume', () => {
    COOLING_IDS.forEach((cooling) => {
      const legs = ENERGY_PATH[cooling];
      expect(legs[0].points[0]).toEqual([GRID_LINE.fromX, GRID_LINE.y, GRID_LINE.z]);
      expect(lastPoint(legs[legs.length - 1])).toEqual(PLUME_TOP);
    });
  });

  it('shares the power legs up to the chip and splits the heat route after it', () => {
    POWER_PHASES.forEach((phase) =>
      expect(legsFor('air', phase)).toEqual(legsFor('liquid', phase)),
    );
    HEAT_PHASES.forEach((phase) =>
      expect(legsFor('air', phase)).not.toEqual(legsFor('liquid', phase)),
    );
    COOLING_IDS.forEach((cooling) => {
      const compute = legsFor(cooling, 'compute');
      expect(lastPoint(compute[compute.length - 1])).toEqual(CHIP_ANCHOR);
      expect(legsFor(cooling, 'cool')[0].points[0]).toEqual(CHIP_ANCHOR);
    });
  });

  it('keeps the compute legs inside the subject rack', () => {
    const rack = boxSpan(SUBJECT_RACK_BOX);
    legsFor('liquid', 'compute').forEach(({ points }) =>
      points.forEach(([x, y, z]) => {
        expect(x).toBeGreaterThanOrEqual(rack.x[0]);
        expect(x).toBeLessThanOrEqual(rack.x[1]);
        expect(y).toBeLessThanOrEqual(rack.y[1]);
        expect(z).toBeGreaterThanOrEqual(rack.z[0]);
        expect(z).toBeLessThanOrEqual(rack.z[1]);
      }),
    );
  });

  it('carries the power on line, cable, UPS, busway, busbar and chip, the heat in water and air', () => {
    expect(legsFor('liquid', 'grid').map(({ carrier }) => carrier)).toEqual(['line']);
    expect(legsFor('liquid', 'protect').map(({ carrier }) => carrier)).toEqual(['cable', 'ups']);
    expect(legsFor('liquid', 'distribute').map(({ carrier }) => carrier)).toEqual(['busway']);
    expect(legsFor('liquid', 'compute').map(({ carrier }) => carrier)).toEqual(['busbar', 'chip']);
    expect(legsFor('liquid', 'cool').map(({ carrier }) => carrier)).toEqual(['water']);
    expect(legsFor('air', 'cool').map(({ carrier }) => carrier)).toEqual(['air', 'water']);
    COOLING_IDS.forEach((cooling) =>
      expect(legsFor(cooling, 'release').map(({ carrier }) => carrier)).toEqual(['water', 'air']),
    );
  });

  it('ends the cool stage on the roof: the riser for water, the east wall pipe for air', () => {
    const coolEnd = (cooling: 'liquid' | 'air') => {
      const legs = legsFor(cooling, 'cool');
      return lastPoint(legs[legs.length - 1]);
    };
    expect(coolEnd('liquid')).toEqual(WAYPOINTS.riserTop);
    expect(coolEnd('air')).toEqual(WAYPOINTS.wallPipeTop);
  });

  it('measures legs and paths by their straight segments', () => {
    expect(legLength(TOY[0])).toBe(3);
    expect(legLength(TOY[1])).toBe(7);
    expect(pathLength(TOY)).toBe(10);
    expect(pathLength(ENERGY_PATH.liquid)).toBeCloseTo(
      ENERGY_PATH.liquid.reduce((sum, leg) => sum + legLength(leg), 0),
      DIGITS,
    );
  });

  it('moves at constant speed by length across the legs', () => {
    expectPoint(pointOnLegs(TOY, 0).position, [0, 0, 0]);
    expectPoint(pointOnLegs(TOY, 0.15).position, [1.5, 0, 0]);
    expectPoint(pointOnLegs(TOY, 0.4).position, [3, 1, 0]);
    expectPoint(pointOnLegs(TOY, 0.75).position, [3, 2, -2.5]);
    expectPoint(pointOnLegs(TOY, 1).position, [3, 2, -5]);
    expectPoint(pointOnLegs(TOY, -1).position, [0, 0, 0]);
    expectPoint(pointOnLegs(TOY, 2).position, [3, 2, -5]);
  });

  it('heads along +x at zero, north at a quarter turn, and keeps the last heading on a climb', () => {
    expect(pointOnLegs(TOY, 0.1).heading).toBeCloseTo(0, DIGITS);
    expect(pointOnLegs(TOY, 0.4).heading).toBeCloseTo(0, DIGITS);
    expect(pointOnLegs(TOY, 0.75).heading).toBeCloseTo(Math.PI / 2, DIGITS);
    const climb: readonly PathLeg[] = [
      {
        phase: 'cool',
        carrier: 'water',
        points: [
          [0, 0, 0],
          [0, 4, 0],
          [0, 4, 2],
        ],
      },
    ];
    expect(pointOnLegs(climb, 0.2).heading).toBeCloseTo(-Math.PI / 2, DIGITS);
  });

  it('names the leg under the joule', () => {
    expect(legAt(TOY, 0.1).carrier).toBe('line');
    expect(legAt(TOY, 0.5).carrier).toBe('cable');
    expect(legAt(TOY, 1).carrier).toBe('cable');
  });

  it('refuses a path with no legs', () => {
    expect(() => pointOnLegs([], 0.5)).toThrow();
  });
});
