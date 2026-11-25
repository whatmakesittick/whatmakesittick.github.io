import { describe, expect, it } from 'vitest';
import { PACE_IDS } from '../ids';
import { ANGLE_KEYS, ATTRIBUTION, GAIT_DATA, SOURCE_SHA256 } from './gaitData';
import { evaluateFit } from './legAngles';

const WRAP_TOLERANCE_DEG = 0.05;
const FIT_ERROR_LIMIT_DEG = 1.2;
const TAIL_SAMPLES = 8;

describe('gait data', () => {
  it('records the attribution and the source hash', () => {
    expect(ATTRIBUTION).toContain('doi:10.7717/peerj.3298');
    expect(ATTRIBUTION).toContain('CC BY 4.0');
    expect(ATTRIBUTION).toContain('Averaged and refitted');
    expect(SOURCE_SHA256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('keeps every curve periodic', () => {
    PACE_IDS.forEach((pace) =>
      ANGLE_KEYS.forEach((key) => {
        const fit = GAIT_DATA[pace].angles[key];
        expect(Math.abs(evaluateFit(fit, 0) - evaluateFit(fit, 999.999))).toBeLessThan(
          WRAP_TOLERANCE_DEG,
        );
      }),
    );
  });

  it('keeps the fit errors small', () => {
    PACE_IDS.forEach((pace) =>
      ANGLE_KEYS.forEach((key) =>
        expect(GAIT_DATA[pace].fitErrors[key]).toBeLessThanOrEqual(FIT_ERROR_LIMIT_DEG),
      ),
    );
  });

  it('holds 100 force samples that are zero in flight', () => {
    PACE_IDS.forEach((pace) => {
      const { forces, toeOffUnits } = GAIT_DATA[pace];
      expect(forces.vert).toHaveLength(100);
      expect(forces.fwd).toHaveLength(100);
      expect(forces.right).toHaveLength(100);
      const firstFlight = Math.ceil(toeOffUnits / 10) + TAIL_SAMPLES;
      forces.vert.slice(firstFlight).forEach((value) => expect(value).toBe(0));
    });
  });

  it('removes the marker offset of the ankle inversion and rotation', () => {
    PACE_IDS.forEach((pace) => {
      expect(GAIT_DATA[pace].angles.ankleInv.a0).toBe(0);
      expect(GAIT_DATA[pace].angles.ankleRot.a0).toBe(0);
    });
  });

  it('reproduces the sanity table of the data sheet', () => {
    expect(PACE_IDS.map((pace) => GAIT_DATA[pace].kneeSwingPeakDeg)).toEqual(
      [94, 109, 118].map((v) => expect.closeTo(v, 0)),
    );
    expect(PACE_IDS.map((pace) => GAIT_DATA[pace].peakBrakingBW)).toEqual([0.23, 0.31, 0.36]);
  });
});
