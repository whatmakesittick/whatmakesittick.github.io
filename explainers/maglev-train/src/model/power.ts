import type {
  BrakeModeId,
  MotionReading,
  OnboardId,
  PhaseId,
  PowerFlowId,
  PowerReading,
  TopSpeedId,
} from '../ids';
import { GENERATOR_KMH } from './constants';
import { motionAt } from './motion';

const STOPPING_PHASES: ReadonlySet<PhaseId> = new Set(['brake', 'settle']);

function isBatteryStop(brakeMode: BrakeModeId, phase: PhaseId): boolean {
  return brakeMode === 'eddy' && STOPPING_PHASES.has(phase);
}

function flowFor({ phase, speedMs }: MotionReading, brakeMode: BrakeModeId): PowerFlowId {
  if (isBatteryStop(brakeMode, phase)) return 'battery';
  if (speedMs === 0) return 'none';
  return phase === 'brake' ? 'regen' : 'drive';
}

export function powerFlowAt(
  units: number,
  topSpeed: TopSpeedId,
  brakeMode: BrakeModeId,
): PowerFlowId {
  return flowFor(motionAt(units, topSpeed, brakeMode), brakeMode);
}

export function onboardPowerAt(
  speedKmh: number,
  brakeMode: BrakeModeId,
  phase: PhaseId,
): OnboardId {
  if (isBatteryStop(brakeMode, phase)) return 'battery';
  return speedKmh < GENERATOR_KMH ? 'rails' : 'generator';
}

export function powerAt(units: number, topSpeed: TopSpeedId, brakeMode: BrakeModeId): PowerReading {
  const motion = motionAt(units, topSpeed, brakeMode);
  return {
    flow: flowFor(motion, brakeMode),
    onboard: onboardPowerAt(motion.speedKmh, brakeMode, motion.phase),
    eddy: brakeMode === 'eddy' && motion.phase === 'brake',
  };
}
