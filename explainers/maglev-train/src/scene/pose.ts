import type { Object3D } from 'three';
import type { ChaseTarget, MotionReading } from '../ids';
import { LIFT_TRAVEL_MM, TRAIN, mm } from '../model';

type LiftReading = Pick<MotionReading, 'liftMm'>;

const WRAP_TOLERANCE_M = 1e-6;
const BODY_MIDDLE_Y = (TRAIN.bodyBottom + TRAIN.roof) / 2;

export function trainLift(motion: LiftReading): number {
  return mm(motion.liftMm - LIFT_TRAVEL_MM);
}

export function applyTrainPose(object: Object3D, motion: LiftReading, lateralMm = 0): void {
  object.position.set(0, trainLift(motion), mm(lateralMm));
}

export function lineX(lineMetres: number, distance: number): number {
  return lineMetres - distance;
}

export function wrapOffset(distance: number, period: number): number {
  const remainder = ((distance % period) + period) % period;
  const aligned = remainder < WRAP_TOLERANCE_M || period - remainder < WRAP_TOLERANCE_M;
  return aligned ? 0 : -remainder;
}

export function chaseTargetFor(motion: LiftReading, lateralMm = 0): ChaseTarget {
  return {
    position: [0, BODY_MIDDLE_Y + trainLift(motion), mm(lateralMm)],
    heading: 0,
    pitch: 0,
    roll: 0,
    span: TRAIN.length,
  };
}
