import { beforeAll, describe, expect, it } from 'vitest';
import { PHASE_IDS } from './ids';
import { CYCLE_UNITS, MOMENTS } from './model';
import { BITE_TIMELINE, describeSpeed, formatSpeed } from './timeline';
import { TEST_LOCALE, fill, initTestLocale } from './ui/testing';

const { value, before, during, speedValue, realTime, slower, faster, phase } = TEST_LOCALE.timeline;

describe('bite timeline', () => {
  beforeAll(() => initTestLocale());

  it('runs once through the six phases', () => {
    expect(BITE_TIMELINE).toMatchObject({ cycle: CYCLE_UNITS, loop: false, step: 1 });
    expect(BITE_TIMELINE.nudge).toEqual({ fine: 5, coarse: 50 });
    expect(BITE_TIMELINE.phases.map((entry) => entry.id)).toEqual([...PHASE_IDS]);
  });

  it('counts seconds from the spoon entering the mouth', () => {
    expect(BITE_TIMELINE.formatPhase(25)).toBe(fill(value, { seconds: '−1.5' }));
    expect(BITE_TIMELINE.formatPhase(MOMENTS.firing)).toBe(fill(value, { seconds: '10.0' }));
  });

  it('describes moments before and during the bite', () => {
    expect(BITE_TIMELINE.describePhase(25)).toBe(
      fill(before, { seconds: '1.5', phase: phase.spoon }),
    );
    expect(BITE_TIMELINE.describePhase(MOMENTS.firing)).toBe(
      fill(during, { seconds: '10.0', phase: phase.receptors }),
    );
  });

  it('plays fifty units a second in real time', () => {
    expect(BITE_TIMELINE.rate(2)).toBe(50);
    expect(formatSpeed(1)).toBe(fill(speedValue, { factor: '0.5' }));
    expect(describeSpeed(2)).toBe(realTime);
    expect(describeSpeed(0)).toBe(fill(slower, { factor: '4' }));
    expect(describeSpeed(3)).toBe(fill(faster, { factor: '2' }));
  });
});
