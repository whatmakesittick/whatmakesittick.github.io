import { describe, expect, it } from 'vitest';
import { PHASE_IDS } from '../ids';
import {
  CROWN_BOTTOM_Y,
  CROWN_TOP_Y,
  CYCLE_DEG,
  MOMENTS,
  PHASE_RANGES,
  PORT_TIMING,
  burnShare,
  crankPin,
  crankcasePressure,
  crownY,
  phaseOf,
  pistonTravel,
  portOpenShare,
  shortestDelta,
  sparkGlow,
  turnPercent,
  wrapDegrees,
} from './cycle';
import { CRANK_Y, ENGINE_GEOMETRY } from './scale';

describe('phases', () => {
  it('fill one turn with no gap and no overlap', () => {
    expect(PHASE_RANGES[PHASE_IDS[0]][0]).toBe(0);
    expect(PHASE_RANGES[PHASE_IDS[PHASE_IDS.length - 1]][1]).toBe(CYCLE_DEG);
    PHASE_IDS.slice(1).forEach((id, index) =>
      expect(PHASE_RANGES[id][0]).toBe(PHASE_RANGES[PHASE_IDS[index]][1]),
    );
  });

  it('opens the exhaust before the transfers and closes it after them', () => {
    expect(PORT_TIMING.exhaust[0]).toBeLessThan(PORT_TIMING.transfer[0]);
    expect(PORT_TIMING.exhaust[1]).toBeGreaterThan(PORT_TIMING.transfer[1]);
  });

  it('finds the phase at an angle and wraps', () => {
    expect(phaseOf(50)).toBe('power');
    expect(phaseOf(110)).toBe('exhaust');
    expect(phaseOf(MOMENTS.bottomDeadCentre)).toBe('scavenge');
    expect(phaseOf(MOMENTS.spark)).toBe('compression');
    expect(phaseOf(CYCLE_DEG + 50)).toBe('power');
    expect(phaseOf(-10)).toBe('compression');
  });
});

describe('angles', () => {
  it('wraps and measures the shortest way round', () => {
    expect(wrapDegrees(-90)).toBe(270);
    expect(shortestDelta(350, 10)).toBe(20);
    expect(shortestDelta(10, 350)).toBe(-20);
  });

  it('reads the turn as a percent from the top', () => {
    expect(turnPercent(0)).toBe(0);
    expect(turnPercent(90)).toBe(25);
    expect(turnPercent(CYCLE_DEG + 180)).toBe(50);
  });
});

describe('piston', () => {
  it('rises to the top at 0 and falls to the bottom at 180', () => {
    expect(CROWN_TOP_Y).toBeCloseTo(0.21, 9);
    expect(CROWN_BOTTOM_Y).toBeCloseTo(0.17, 9);
    expect(CROWN_TOP_Y - CROWN_BOTTOM_Y).toBeCloseTo(2 * ENGINE_GEOMETRY.throw, 9);
    expect(pistonTravel(0)).toBeCloseTo(0, 9);
    expect(pistonTravel(180)).toBeCloseTo(1, 9);
    expect(crownY(90)).toBeCloseTo(crownY(270), 9);
  });

  it('swings the crank pin forward at a quarter turn', () => {
    const [x, y] = crankPin(90);
    expect(x).toBeCloseTo(ENGINE_GEOMETRY.throw, 9);
    expect(y).toBeCloseTo(CRANK_Y, 9);
  });
});

describe('ports', () => {
  it('keeps every port shut at the top of the turn but the intake', () => {
    expect(portOpenShare('exhaust', 0)).toBe(0);
    expect(portOpenShare('transfer', 0)).toBe(0);
    expect(portOpenShare('intake', 0)).toBeCloseTo(1, 9);
  });

  it('opens the exhaust and transfers fully at the bottom', () => {
    expect(portOpenShare('exhaust', 180)).toBeCloseTo(1, 9);
    expect(portOpenShare('transfer', 180)).toBeCloseTo(1, 9);
    expect(portOpenShare('intake', 180)).toBe(0);
  });

  it('opens each port exactly at its timing', () => {
    expect(portOpenShare('exhaust', PORT_TIMING.exhaust[0] - 1)).toBe(0);
    expect(portOpenShare('exhaust', PORT_TIMING.exhaust[0] + 1)).toBeGreaterThan(0);
    expect(portOpenShare('transfer', PORT_TIMING.transfer[0] - 1)).toBe(0);
    expect(portOpenShare('transfer', PORT_TIMING.transfer[0] + 1)).toBeGreaterThan(0);
    expect(portOpenShare('intake', PORT_TIMING.intake[0] - 1)).toBe(0);
    expect(portOpenShare('intake', PORT_TIMING.intake[0] + 1)).toBeGreaterThan(0);
    expect(portOpenShare('intake', PORT_TIMING.intake[1] + 1)).toBe(0);
  });

  it('has only the exhaust open in the exhaust phase', () => {
    expect(portOpenShare('exhaust', 110)).toBeGreaterThan(0);
    expect(portOpenShare('transfer', 110)).toBe(0);
  });
});

describe('crankcase, spark and burn', () => {
  it('draws at the top and squeezes at the bottom', () => {
    expect(crankcasePressure(0)).toBe(-1);
    expect(crankcasePressure(180)).toBe(1);
  });

  it('flashes the spark just after its moment', () => {
    expect(sparkGlow(MOMENTS.spark - 1)).toBe(0);
    expect(sparkGlow(MOMENTS.spark + 1)).toBe(1);
  });

  it('burns from the spark until the exhaust opens', () => {
    expect(burnShare(MOMENTS.spark)).toBe(1);
    expect(burnShare(0)).toBeGreaterThan(0);
    expect(burnShare(0)).toBeLessThan(1);
    expect(burnShare(PORT_TIMING.exhaust[0])).toBe(0);
    expect(burnShare(200)).toBe(0);
  });
});
