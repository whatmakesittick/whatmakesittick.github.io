import { describe, expect, it } from 'vitest';
import { MOMENT_IDS, PHASE_IDS, REGISTER_IDS, TOUCH_IDS } from '../ids';
import { HOLD_MS, STRIKE_MS } from './constants';
import {
  CYCLE_UNITS,
  MOMENTS,
  PHASE_RANGES,
  REAL_RING_SPEED,
  SPEED_RANGE,
  STROKES,
  clockKnots,
  cycleMs,
  driveRiseMm,
  driveSpeed,
  loopSeconds,
  phaseAt,
  rate,
  realMsAt,
  strokeClock,
  unitsAt,
} from './timing';

const DIGITS = 6;

describe('timeline bands', () => {
  it('covers the cycle with five touching bands', () => {
    expect(PHASE_RANGES.press.start).toBe(0);
    expect(PHASE_RANGES.release.end).toBe(CYCLE_UNITS);
    PHASE_IDS.slice(1).forEach((id, index) =>
      expect(PHASE_RANGES[id].start).toBe(PHASE_RANGES[PHASE_IDS[index]].end),
    );
  });

  it('puts every moment in the step it belongs to', () => {
    expect(phaseAt(MOMENTS.jackTouch)).toBe('escape');
    expect(phaseAt(MOMENTS.letOff)).toBe('escape');
    expect(phaseAt(MOMENTS.strike)).toBe('strike');
    expect(phaseAt(MOMENTS.checked)).toBe('check');
    expect(phaseAt(MOMENTS.repeatReady)).toBe('release');
    expect(phaseAt(MOMENTS.damped)).toBe('release');
    expect(MOMENT_IDS.map((id) => MOMENTS[id])).toEqual([300, 360, 400, 560, 910, 980]);
  });

  it('wraps the phase around the loop', () => {
    expect(phaseAt(CYCLE_UNITS)).toBe('press');
    expect(phaseAt(-1)).toBe('release');
  });
});

describe('strokes', () => {
  it('reaches the string at the measured time and speed for each touch', () => {
    TOUCH_IDS.forEach((touch) => {
      const stroke = STROKES[touch];
      expect(stroke.letOffMs + stroke.flightMs).toBeCloseTo(STRIKE_MS[touch], DIGITS);
      expect(driveSpeed(stroke.letOffMs, stroke)).toBeCloseTo(stroke.speed, DIGITS);
      expect(driveRiseMm(stroke.letOffMs, stroke)).toBeCloseTo(45.5, DIGITS);
    });
  });

  it('flies free for 1.5, 0.9 and 0.3 ms', () => {
    expect(STROKES.soft.flightMs).toBeCloseTo(1.5, DIGITS);
    expect(STROKES.medium.flightMs).toBeCloseTo(0.909, 3);
    expect(STROKES.hard.flightMs).toBeCloseTo(0.3, DIGITS);
  });

  it('meets the let-off button a few milliseconds before let-off', () => {
    TOUCH_IDS.forEach((touch) => {
      const { letOffMs, jackTouchMs } = STROKES[touch];
      expect(letOffMs - jackTouchMs).toBeGreaterThan(0.5);
      expect(letOffMs - jackTouchMs).toBeLessThan(4);
    });
  });
});

describe('clock', () => {
  it('runs the knots forward in both units and milliseconds', () => {
    TOUCH_IDS.forEach((touch) =>
      REGISTER_IDS.forEach((register) => {
        const knots = clockKnots(touch, register);
        knots.slice(1).forEach(([units, ms], index) => {
          expect(units).toBeGreaterThan(knots[index][0]);
          expect(ms).toBeGreaterThan(knots[index][1]);
        });
      }),
    );
  });

  it('reads the real clock at the moments', () => {
    const clock = strokeClock('medium', 'middle');
    expect(realMsAt(MOMENTS.strike, 'medium', 'middle')).toBeCloseTo(67, DIGITS);
    expect(realMsAt(MOMENTS.letOff, 'medium', 'middle')).toBeCloseTo(clock.letOffMs, DIGITS);
    expect(clock.contactEndMs - clock.strikeMs).toBeCloseTo(2, DIGITS);
    expect(strokeClock('hard', 'bass').contactEndMs - 36).toBeCloseTo(3.2, DIGITS);
    expect(clock.holdEndMs - clock.checkedMs).toBe(HOLD_MS);
    expect(cycleMs('medium', 'middle')).toBeCloseTo(2587.18, 2);
  });

  it('inverts the map', () => {
    [0, 150, 333, 401, 500, 777, 959].forEach((units) =>
      expect(unitsAt(realMsAt(units, 'soft', 'treble'), 'soft', 'treble')).toBeCloseTo(units, 6),
    );
  });
});

describe('playback speed', () => {
  it('doubles the loop at each stop down from 4 s', () => {
    const stops = Array.from({ length: SPEED_RANGE.max + 1 }, (_, speed) => loopSeconds(speed));
    expect(stops).toEqual([32, 16, 8, 4]);
    stops.forEach((seconds, speed) => expect(rate(speed) * seconds).toBeCloseTo(CYCLE_UNITS, 9));
  });

  it('plays the held note at real pace at the ring speed', () => {
    const { start, end } = PHASE_RANGES.check;
    expect((end - start) / rate(REAL_RING_SPEED)).toBeCloseTo(HOLD_MS / 1000, 9);
  });
});
