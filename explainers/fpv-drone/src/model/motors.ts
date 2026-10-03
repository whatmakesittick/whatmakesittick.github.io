import { clamp } from '@core/math';
import { MOTOR_PART_IDS } from '../ids';
import type { MotorPartId, MotorReading, MotorShares, MoveId } from '../ids';
import { MASS_G, MOTOR_COUNT, THRUST_PER_MOTOR_G } from './figures';
import type { FlightMotion } from './flight';
import { MOTOR_POSITIONS, MOTOR_SPIN } from './layout';
import { allUpG } from './payload';

export const MOTOR_MAX_THRUST_G = MOTOR_COUNT * THRUST_PER_MOTOR_G.flight;
export const PITCH_MIX = 0.04;
export const ROLL_MIX = 0.04;
export const YAW_MIX = 0.03;
export const DEMO_MIX_DELTA = 0.05;

type Sign = -1 | 0 | 1;
type MotorSigns = Readonly<Record<MotorPartId, Sign>>;

function signsBy(pick: (id: MotorPartId) => boolean): MotorSigns {
  return Object.fromEntries(
    MOTOR_PART_IDS.map((id) => [id, pick(id) ? 1 : -1] as const),
  ) as MotorSigns;
}

export const PITCH_SIGNS = signsBy((id) => MOTOR_POSITIONS[id][0] < 0);
export const ROLL_SIGNS = signsBy((id) => MOTOR_POSITIONS[id][2] < 0);
export const YAW_SIGNS = signsBy((id) => MOTOR_SPIN[id] === 'counterClockwise');

const NO_SIGNS = signsBy(() => false);
const ALL_SIGNS = signsBy(() => true);

const MOVE_SIGNS: Readonly<Record<MoveId, MotorSigns>> = {
  hover: NO_SIGNS,
  forward: PITCH_SIGNS,
  roll: ROLL_SIGNS,
  yaw: YAW_SIGNS,
  climb: ALL_SIGNS,
};

export function totalThrustG(flight: FlightMotion, allUp: number): number {
  if (!flight.armed) return 0;
  const level = allUp / (Math.cos(flight.pitch) * Math.cos(flight.roll));
  return flight.onGround ? level * flight.propRate * flight.propRate : level;
}

function sharesOf(share: (id: MotorPartId) => number): MotorShares {
  const [m1, m2, m3, m4] = MOTOR_PART_IDS.map((id) => clamp(share(id), 0, 1));
  return [m1, m2, m3, m4];
}

export function motorsAt(flight: FlightMotion, payloadG: number): MotorReading {
  const base = totalThrustG(flight, allUpG(payloadG)) / MOTOR_MAX_THRUST_G;
  const pitchTerm = PITCH_MIX * flight.pitchRate;
  const rollTerm = ROLL_MIX * flight.rollRate;
  const yawTerm = YAW_MIX * flight.headingRate;
  return {
    shares: sharesOf(
      (id) =>
        base + PITCH_SIGNS[id] * pitchTerm + ROLL_SIGNS[id] * rollTerm + YAW_SIGNS[id] * yawTerm,
    ),
  };
}

export const DEMO_HOVER_SHARE = allUpG(MASS_G.defaultPayload) / MOTOR_MAX_THRUST_G;

function demoMix(move: MoveId): MotorShares {
  const signs = MOVE_SIGNS[move];
  const delta = move === 'hover' ? 0 : DEMO_MIX_DELTA;
  return sharesOf((id) => DEMO_HOVER_SHARE + signs[id] * delta);
}

export const MOTOR_MIXES: Readonly<Record<MoveId, MotorShares>> = {
  hover: demoMix('hover'),
  forward: demoMix('forward'),
  roll: demoMix('roll'),
  yaw: demoMix('yaw'),
  climb: demoMix('climb'),
};

export function speedingMotors(move: MoveId): readonly MotorPartId[] {
  if (move === 'hover') return MOTOR_PART_IDS;
  return MOTOR_PART_IDS.filter((id) => MOVE_SIGNS[move][id] > 0);
}
