import { describe, expect, it } from 'vitest';
import { REGISTER_IDS, TOUCH_IDS } from '../ids';
import {
  BLOW_MM,
  CHECK_MM,
  DAMPER_LEAD_HARD_MS,
  DAMPER_LIFT_MAX_MM,
  HAMMER_SPEED_MS,
  KEY_DIP_MM,
  LET_OFF_MM,
  REP_LIFT_MM,
} from './constants';
import {
  actionPoseAt,
  damperAt,
  hammerAt,
  jackEscapeAt,
  keyMmAt,
  repetitionLiftAt,
} from './action';
import { SHIFT_MM } from './layout';
import { CYCLE_UNITS, MOMENTS, realMsAt, strokeClock } from './timing';

const DIGITS = 6;
const LOOSE = 3;
const JUST_BEFORE_WRAP = CYCLE_UNITS - 1e-6;

function damperLeavesUnits(touch: (typeof TOUCH_IDS)[number]): number {
  let units = 0;
  while (damperAt(units, touch, 'none', 'middle').state === 'down') units += 0.01;
  return units;
}

describe('key', () => {
  it('starts and ends at rest and reaches the bottom of its travel', () => {
    TOUCH_IDS.forEach((touch) => {
      expect(keyMmAt(0, touch, 'middle')).toBe(0);
      expect(keyMmAt(JUST_BEFORE_WRAP, touch, 'middle')).toBeCloseTo(0, LOOSE);
      expect(keyMmAt(MOMENTS.checked, touch, 'middle')).toBe(KEY_DIP_MM);
    });
  });

  it('has risen a third at the repeat moment and sits at 1 mm when the damper lands', () => {
    expect(keyMmAt(MOMENTS.repeatReady, 'medium', 'middle')).toBeCloseTo(
      (2 / 3) * KEY_DIP_MM,
      DIGITS,
    );
    expect(keyMmAt(MOMENTS.damped, 'medium', 'middle')).toBeCloseTo(1, DIGITS);
  });
});

describe('hammer', () => {
  it('is 1.5 mm from the string at let-off and on it at the strike', () => {
    TOUCH_IDS.forEach((touch) => {
      expect(BLOW_MM - hammerAt(MOMENTS.letOff, touch, 'middle').riseMm).toBeCloseTo(
        LET_OFF_MM,
        DIGITS,
      );
      const strike = hammerAt(MOMENTS.strike, touch, 'middle');
      expect(strike.riseMm).toBe(BLOW_MM);
      expect(strike.contact).toBe(true);
      expect(strike.speedMs).toBeCloseTo(HAMMER_SPEED_MS[touch], DIGITS);
    });
  });

  it('flies at its full speed between let-off and the strike', () => {
    const halfway = (MOMENTS.letOff + MOMENTS.strike) / 2;
    expect(hammerAt(halfway, 'hard', 'middle').speedMs).toBeCloseTo(5, DIGITS);
    expect(hammerAt(halfway, 'hard', 'middle').contact).toBe(false);
  });

  it('bounces back and is caught lower after a harder blow', () => {
    TOUCH_IDS.forEach((touch) => {
      const caught = hammerAt(MOMENTS.checked + 1, touch, 'middle');
      expect(caught.checked).toBe(true);
      expect(BLOW_MM - caught.riseMm).toBe(CHECK_MM[touch]);
      expect(hammerAt(500, touch, 'middle').speedMs).toBeLessThan(0);
    });
  });

  it('is lifted by the repetition lever, then rides home with the key', () => {
    const ready = hammerAt(MOMENTS.repeatReady, 'medium', 'middle');
    expect(ready.riseMm).toBeCloseTo(BLOW_MM - CHECK_MM.medium + REP_LIFT_MM, DIGITS);
    expect(hammerAt(JUST_BEFORE_WRAP, 'medium', 'middle').riseMm).toBeCloseTo(0, LOOSE);
  });
});

describe('jack and repetition lever', () => {
  it('slips out from the jack touch to let-off, then fully, then resets', () => {
    expect(jackEscapeAt(MOMENTS.jackTouch, 'medium', 'middle')).toBeCloseTo(0, DIGITS);
    expect(jackEscapeAt(MOMENTS.letOff, 'medium', 'middle')).toBeCloseTo(0.6, DIGITS);
    expect(jackEscapeAt(700, 'medium', 'middle')).toBe(1);
    expect(jackEscapeAt(MOMENTS.repeatReady, 'medium', 'middle')).toBe(0);
  });

  it('carries the knuckle at rest, drops at let-off and lifts again for the repeat', () => {
    expect(repetitionLiftAt(0)).toBe(1);
    expect(repetitionLiftAt(MOMENTS.letOff)).toBe(0);
    expect(repetitionLiftAt(700)).toBeGreaterThan(0);
    expect(repetitionLiftAt(MOMENTS.repeatReady)).toBe(1);
  });
});

describe('damper', () => {
  it('leaves the string 15 ms before a hard strike and earlier in slower strokes', () => {
    const lead = (touch: (typeof TOUCH_IDS)[number]) =>
      strokeClock(touch, 'middle').strikeMs - realMsAt(damperLeavesUnits(touch), touch, 'middle');
    expect(lead('hard')).toBeCloseTo(DAMPER_LEAD_HARD_MS, 0);
    expect(lead('medium')).toBeGreaterThan(lead('hard'));
    expect(lead('soft')).toBeGreaterThan(lead('medium'));
  });

  it('is up while the key is held and lands at the damped moment', () => {
    expect(damperAt(700, 'medium', 'none', 'middle')).toEqual({
      liftMm: DAMPER_LIFT_MAX_MM,
      state: 'up',
    });
    expect(damperAt(MOMENTS.damped - 10, 'medium', 'none', 'middle').state).toBe('falling');
    expect(damperAt(MOMENTS.damped, 'medium', 'none', 'middle').state).toBe('down');
    expect(damperAt(200, 'medium', 'none', 'middle').state).toBe('rising');
  });

  it('stays up with sustain and is missing in the treble', () => {
    [0, 500, 990].forEach((units) => {
      expect(damperAt(units, 'soft', 'sustain', 'middle').state).toBe('pedal');
      expect(damperAt(units, 'soft', 'none', 'treble').state).toBe('none');
    });
  });
});

describe('pose', () => {
  it('shifts the action only with una corda', () => {
    expect(actionPoseAt(0, 'medium', 'unaCorda', 'middle').shiftMm).toBe(SHIFT_MM);
    expect(actionPoseAt(0, 'medium', 'sustain', 'middle').shiftMm).toBe(0);
  });

  it('closes the loop without a jump for every touch and register', () => {
    TOUCH_IDS.forEach((touch) =>
      REGISTER_IDS.forEach((register) => {
        const end = actionPoseAt(JUST_BEFORE_WRAP, touch, 'none', register);
        const start = actionPoseAt(0, touch, 'none', register);
        expect(end.keyMm).toBeCloseTo(start.keyMm, LOOSE);
        expect(end.hammerRiseMm).toBeCloseTo(start.hammerRiseMm, LOOSE);
        expect(end.jackEscape).toBe(start.jackEscape);
      }),
    );
  });

  it('reports the hammer distance to the string', () => {
    const pose = actionPoseAt(MOMENTS.letOff, 'soft', 'none', 'bass');
    expect(pose.hammerToStringMm).toBeCloseTo(LET_OFF_MM, DIGITS);
    expect(actionPoseAt(MOMENTS.strike, 'soft', 'none', 'bass').hammerToStringMm).toBe(0);
  });
});
