import { describe, expect, it } from 'vitest';
import { PACE_IDS, PHASE_IDS } from '../ids';
import type { PaceId } from '../ids';
import {
  CYCLE_UNITS,
  DRAG_K,
  MOMENTS,
  PACES,
  PEAK_FORCE_N,
  PHASE_RANGES,
  SCROLL_PERIOD_M,
  SEGMENT_M,
  SWING_MS,
  activeDragN,
  armAt,
  armGap,
  cycleSeconds,
  dragFactor,
  handForceAt,
  paceRate,
  paceSpeed,
  phaseAt,
  phaseBounds,
  propulsiveUnits,
  speedAt,
  strokeAt,
  surgeAt,
} from './index';

const SAMPLES = Array.from({ length: CYCLE_UNITS }, (_, unit) => unit);
const OPTIONS = { pace: 'middle', kick: 'six', breathing: 'right', headUp: false } as const;

function close(a: number, b: number, digits = 6): void {
  expect(a).toBeCloseTo(b, digits);
}

describe('paces', () => {
  it('computes speeds from rate and length', () => {
    close(paceSpeed('easy'), 1.44);
    close(paceSpeed('middle'), 1.68);
    close(paceSpeed('sprint'), 2.1);
  });

  it('keeps every stroke length a whole multiple of the pattern period', () => {
    PACE_IDS.forEach((pace) => {
      const multiple = PACES[pace].strokeLengthM / SCROLL_PERIOD_M;
      close(multiple, Math.round(multiple));
    });
  });

  it('turns the gap into an overlap above about 1.8 m/s', () => {
    expect(armGap('easy').kind).toBe('gap');
    expect(armGap('middle').kind).toBe('gap');
    expect(armGap('sprint').kind).toBe('overlap');
    expect(armGap('easy').seconds).toBeCloseTo(0.127, 3);
    expect(paceSpeed('middle')).toBeLessThan(1.8);
    expect(paceSpeed('sprint')).toBeGreaterThan(1.8);
  });

  it('plays a cycle in the real cycle time at full speed', () => {
    close(paceRate('sprint', 3) * cycleSeconds('sprint'), CYCLE_UNITS);
    close(paceRate('sprint', 1), paceRate('sprint', 3) / 4);
  });
});

describe('phase bounds', () => {
  it.each(PACE_IDS)('partitions the cycle at %s pace', (pace) => {
    const bounds = phaseBounds(pace);
    expect(bounds.entryCatch[0]).toBe(0);
    expect(bounds.recovery[1]).toBe(CYCLE_UNITS);
    PHASE_IDS.slice(1).forEach((id, index) => {
      expect(bounds[id][0]).toBeCloseTo(bounds[PHASE_IDS[index]][1]);
    });
  });

  it('sets the propulsive window from the index of coordination', () => {
    expect(propulsiveUnits('easy')).toBeCloseTo(424);
    expect(propulsiveUnits('middle')).toBeCloseTo(468);
    expect(propulsiveUnits('sprint')).toBeCloseTo(538);
    PACE_IDS.forEach((pace) => {
      const { pull, push } = phaseBounds(pace);
      close(push[1] - pull[0], propulsiveUnits(pace));
    });
  });

  it('leaves the gap between the arms equal to minus the index of coordination', () => {
    PACE_IDS.forEach((pace) => {
      const gapUnits = CYCLE_UNITS / 2 - propulsiveUnits(pace);
      close(gapUnits, -10 * PACES[pace].idcPercent);
    });
  });

  it('uses the middle pace for the scrubber bands', () => {
    const middle = phaseBounds('middle');
    PHASE_IDS.forEach((id) => {
      expect(Math.abs(PHASE_RANGES[id].start - middle[id][0])).toBeLessThanOrEqual(0.5);
    });
    expect(MOMENTS.catch).toBe(PHASE_RANGES.pull.start);
  });

  it('finds the phase and progress at a unit', () => {
    expect(phaseAt(0, 'middle')).toEqual({ phase: 'entryCatch', progress: 0 });
    expect(phaseAt(MOMENTS.underShoulder + 1, 'middle').phase).toBe('push');
    expect(phaseAt(999, 'middle').phase).toBe('recovery');
  });
});

describe('arm key values', () => {
  it('hits the sourced elbow angles', () => {
    const { entryCatch, pull, push } = phaseBounds('middle');
    close(armAt(entryCatch[1] + 1e-6, 'middle').elbowDeg ?? 0, 148, 2);
    close(armAt(pull[1] + 1e-6, 'middle').elbowDeg ?? 0, 105, 2);
    close(armAt(push[1] - 1e-6, 'middle').elbowDeg ?? 0, 151, 2);
    expect(armAt(900, 'middle').elbowDeg).toBeNull();
  });

  it('has no hand depth in the air and keeps depth under 0.7 m', () => {
    expect(armAt(900, 'middle').handDepthM).toBeNull();
    SAMPLES.filter((unit) => unit < 755).forEach((unit) => {
      const depth = armAt(unit, 'middle').handDepthM ?? 0;
      expect(depth).toBeGreaterThan(0);
      expect(depth).toBeLessThanOrEqual(0.67 + 1e-9);
    });
  });

  it('moves the hand fastest in the air', () => {
    expect(armAt(880, 'sprint').handSpeedMs).toBeGreaterThan(armAt(400, 'sprint').handSpeedMs);
  });
});

describe('hand force', () => {
  it.each(PACE_IDS)('is schematic and bounded at %s pace', (pace: PaceId) => {
    const { entryCatch, pull, push, recovery } = phaseBounds(pace);
    close(handForceAt(entryCatch[1], pace), 22, 3);
    const forces = SAMPLES.map((unit) => handForceAt(unit, pace));
    expect(Math.max(...forces)).toBeCloseTo(PEAK_FORCE_N, 0);
    const underwater = SAMPLES.filter((unit) => unit >= pull[0] && unit < push[1]);
    const peakUnit = underwater.reduce((best, unit) =>
      handForceAt(unit, pace) > handForceAt(best, pace) ? unit : best,
    );
    const share = (peakUnit - pull[0]) / (push[1] - pull[0]);
    expect(share).toBeCloseTo(0.7, 1);
    const pullMax = Math.max(
      ...SAMPLES.filter((u) => u >= pull[0] && u < pull[1]).map((u) => handForceAt(u, pace)),
    );
    const pushMax = Math.max(
      ...SAMPLES.filter((u) => u >= push[0] && u < push[1]).map((u) => handForceAt(u, pace)),
    );
    expect(pushMax / pullMax).toBeCloseTo(1.15, 1);
    const mean =
      underwater.reduce((sum, unit) => sum + handForceAt(unit, pace), 0) / underwater.length;
    expect(mean).toBeGreaterThan(40);
    expect(mean).toBeLessThan(55);
    expect(handForceAt(recovery[1] - 1, pace)).toBe(0);
  });
});

describe('stroke reading', () => {
  it('is periodic over the cycle', () => {
    [0, 137, 500, 801].forEach((unit) => {
      const a = strokeAt(unit, OPTIONS);
      const b = strokeAt(unit + CYCLE_UNITS, OPTIONS);
      expect({ ...a, scrollM: 0 }).toEqual({ ...b, scrollM: 0 });
    });
    const start = strokeAt(0, OPTIONS);
    const end = strokeAt(CYCLE_UNITS, OPTIONS);
    expect({ ...start, scrollM: 0 }).toEqual({ ...end, scrollM: 0 });
    close(end.scrollM - start.scrollM, PACES.middle.strokeLengthM);
  });

  it('runs the left arm half a cycle behind the right', () => {
    [10, 300, 640].forEach((unit) => {
      const now = strokeAt(unit, OPTIONS);
      const later = strokeAt(unit + 500, OPTIONS);
      expect(later.left).toEqual(now.right);
      expect(later.right).toEqual(now.left);
    });
  });

  it('swings the speed by 0.4 m/s around the pace speed', () => {
    const speeds = SAMPLES.map((unit) => speedAt(unit, 'sprint'));
    close(Math.max(...speeds) - Math.min(...speeds), SWING_MS, 3);
    close(speeds.reduce((sum, v) => sum + v, 0) / speeds.length, paceSpeed('sprint'), 3);
  });

  it('keeps the surge to a few centimetres with zero mean', () => {
    PACE_IDS.forEach((pace) => {
      const surges = SAMPLES.map((unit) => surgeAt(unit, pace));
      expect(Math.max(...surges)).toBeLessThan(0.05);
      close(surges.reduce((sum, s) => sum + s, 0) / surges.length, 0, 4);
    });
  });

  it('rolls the shoulders about 50 degrees each side at every pace', () => {
    PACE_IDS.forEach((pace) => {
      const rolls = SAMPLES.map(
        (unit) => strokeAt(unit, { ...OPTIONS, pace, breathing: 'none' }).shoulderRollDeg,
      );
      close(Math.max(...rolls), 50, 3);
      close(Math.min(...rolls), -50, 3);
    });
  });

  it('adds about 9 degrees of roll and a head turn only when breathing right', () => {
    const rolls = SAMPLES.map((unit) => strokeAt(unit, OPTIONS));
    expect(Math.min(...rolls.map((r) => r.shoulderRollDeg))).toBeLessThan(-55);
    expect(Math.max(...rolls.map((r) => r.headTurn))).toBeCloseTo(1, 5);
    SAMPLES.forEach((unit) => {
      const quiet = strokeAt(unit, { ...OPTIONS, breathing: 'none' });
      expect(quiet.headTurn).toBe(0);
      expect(quiet.breathExtraDeg).toBe(0);
    });
  });

  it('alternates the legs and counts the beats', () => {
    const two = strokeAt(0, { ...OPTIONS, kick: 'two' });
    const six = strokeAt(0, OPTIONS);
    expect(two.legs.left.beats).toBe(1);
    expect(six.legs.left.beats).toBe(3);
    expect(two.legs.left.phase).toBe(0);
    expect(two.legs.right.phase).toBeCloseTo(0.5);
    expect(six.legs.right.phase).toBeCloseTo(0.5);
  });

  it('follows drag K v squared and flags the head-up factor', () => {
    const reading = strokeAt(300, { ...OPTIONS, headUp: true });
    close(reading.dragN, DRAG_K * reading.speedMs ** 2);
    close(activeDragN(2), 108);
    expect(reading.dragFactor).toBe(3);
    expect(dragFactor(false)).toBe(1);
  });

  it('starts each hand splash at its entry and fades it', () => {
    expect(strokeAt(0, OPTIONS).entrySplash.right).toBe(1);
    expect(strokeAt(500, OPTIONS).entrySplash.left).toBe(1);
    expect(strokeAt(60, OPTIONS).entrySplash.right).toBeGreaterThan(0);
    expect(strokeAt(300, OPTIONS).entrySplash.right).toBe(0);
  });

  it('keeps the mannequin to the sourced sizes', () => {
    close(SEGMENT_M.upperArm, 0.28, 2);
    close(SEGMENT_M.hand * 0.08, 0.0153, 3);
  });
});
