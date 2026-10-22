import { describe, expect, it } from 'vitest';
import { BRAKE_MODE_IDS, PHASE_IDS, TOP_SPEED_IDS } from '../ids';
import type { BrakeModeId, PhaseId, PowerFlowId } from '../ids';
import { GENERATOR_KMH } from './constants';
import { motionAt } from './motion';
import { onboardPowerAt, powerAt, powerFlowAt } from './power';

const SPEED_STEP_KMH = 0.1;
const DEPART_UNITS = 60;
const EARLY_DRIVE_UNITS = 61;
const CRUISE_UNITS = 500;

const UNITS_IN_PHASE: Readonly<Record<PhaseId, number>> = {
  liftOff: 30,
  accelerate: 200,
  cruise: CRUISE_UNITS,
  brake: 700,
  settle: 970,
};

const EXPECTED_FLOW: Readonly<Record<BrakeModeId, Record<PhaseId, PowerFlowId>>> = {
  regen: { liftOff: 'none', accelerate: 'drive', cruise: 'drive', brake: 'regen', settle: 'none' },
  eddy: {
    liftOff: 'none',
    accelerate: 'drive',
    cruise: 'drive',
    brake: 'battery',
    settle: 'battery',
  },
};

const FLOW_CASES = TOP_SPEED_IDS.flatMap((topSpeed) =>
  BRAKE_MODE_IDS.flatMap((brakeMode) =>
    PHASE_IDS.map((phase) => [topSpeed, brakeMode, phase] as const),
  ),
);

describe('powerFlowAt', () => {
  it.each(FLOW_CASES)('at %s with %s braking in %s', (topSpeed, brakeMode, phase) => {
    expect(powerFlowAt(UNITS_IN_PHASE[phase], topSpeed, brakeMode)).toBe(
      EXPECTED_FLOW[brakeMode][phase],
    );
  });

  it('stays off at the instant of departure, before the train moves', () => {
    expect(powerFlowAt(DEPART_UNITS, 'kmh430', 'regen')).toBe('none');
    expect(powerFlowAt(EARLY_DRIVE_UNITS, 'kmh430', 'regen')).toBe('drive');
  });
});

describe('onboardPowerAt', () => {
  it('switches from the power rails to the linear generators at 100 km/h', () => {
    expect(onboardPowerAt(GENERATOR_KMH - SPEED_STEP_KMH, 'regen', 'accelerate')).toBe('rails');
    expect(onboardPowerAt(GENERATOR_KMH, 'regen', 'accelerate')).toBe('generator');
    expect(onboardPowerAt(GENERATOR_KMH + SPEED_STEP_KMH, 'regen', 'brake')).toBe('generator');
    expect(onboardPowerAt(GENERATOR_KMH - SPEED_STEP_KMH, 'regen', 'brake')).toBe('rails');
  });

  it('runs on the battery while the eddy brake stops the train', () => {
    expect(onboardPowerAt(300, 'eddy', 'brake')).toBe('battery');
    expect(onboardPowerAt(0, 'eddy', 'settle')).toBe('battery');
    expect(onboardPowerAt(0, 'regen', 'settle')).toBe('rails');
    expect(onboardPowerAt(300, 'eddy', 'cruise')).toBe('generator');
  });
});

describe('powerAt', () => {
  it('flags the eddy brake only while it is braking', () => {
    expect(powerAt(UNITS_IN_PHASE.brake, 'kmh430', 'eddy').eddy).toBe(true);
    expect(powerAt(UNITS_IN_PHASE.settle, 'kmh430', 'eddy').eddy).toBe(false);
    expect(powerAt(UNITS_IN_PHASE.brake, 'kmh430', 'regen').eddy).toBe(false);
    expect(powerAt(UNITS_IN_PHASE.cruise, 'kmh430', 'eddy').eddy).toBe(false);
  });

  it('reads the onboard power from the train speed', () => {
    expect(powerAt(EARLY_DRIVE_UNITS, 'kmh430', 'regen').onboard).toBe('rails');
    expect(powerAt(CRUISE_UNITS, 'kmh300', 'regen').onboard).toBe('generator');
    Object.values(UNITS_IN_PHASE).forEach((units) => {
      const motion = motionAt(units, 'kmh430', 'eddy');
      expect(powerAt(units, 'kmh430', 'eddy')).toEqual({
        flow: powerFlowAt(units, 'kmh430', 'eddy'),
        onboard: onboardPowerAt(motion.speedKmh, 'eddy', motion.phase),
        eddy: motion.phase === 'brake',
      });
    });
  });
});
