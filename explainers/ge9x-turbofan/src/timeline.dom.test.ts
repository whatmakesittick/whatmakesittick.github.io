import { beforeAll, describe, expect, it } from 'vitest';
import { PHASE_IDS } from './ids';
import { CYCLE_UNITS, MOMENTS } from './model';
import { AIR_TIMELINE, describeSpeed, formatSpeed } from './timeline';
import { TEST_LOCALE, fill, initTestLocale } from './ui/testing';

const {
  value,
  describe: describeText,
  speedValue,
  realTime,
  slower,
  faster,
  phase,
} = TEST_LOCALE.timeline;

describe('air timeline', () => {
  beforeAll(() => initTestLocale());

  it('loops through the five phases in 1000 units', () => {
    expect(AIR_TIMELINE).toMatchObject({ cycle: CYCLE_UNITS, loop: true, step: 1 });
    expect(AIR_TIMELINE.nudge).toEqual({ fine: 5, coarse: 50 });
    expect(AIR_TIMELINE.phases.map((entry) => entry.id)).toEqual([...PHASE_IDS]);
  });

  it('measures metres from the intake lip', () => {
    expect(AIR_TIMELINE.formatPhase(0)).toBe(fill(value, { metres: '0.0' }));
    expect(AIR_TIMELINE.formatPhase(MOMENTS.turbinesExit)).toBe(fill(value, { metres: '4.9' }));
    expect(AIR_TIMELINE.describePhase(MOMENTS.compressorExit)).toBe(
      fill(describeText, { metres: '3.0', phase: phase.burn }),
    );
  });

  it('plays eighty units a second at the model pace', () => {
    expect(AIR_TIMELINE.rate(1)).toBe(80);
    expect(formatSpeed(0.25)).toBe(fill(speedValue, { factor: '0.25' }));
    expect(describeSpeed(1)).toBe(realTime);
    expect(describeSpeed(0.25)).toBe(fill(slower, { factor: '4' }));
    expect(describeSpeed(3)).toBe(fill(faster, { factor: '3' }));
  });
});
