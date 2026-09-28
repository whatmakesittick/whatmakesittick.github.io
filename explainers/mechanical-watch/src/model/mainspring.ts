import { FULL_TURN, clamp, lerp } from '@core/math';
import { SECONDS_PER_HOUR } from './kinematics';
import { BARREL_HOURS_PER_TURN, MAINSPRING_TORQUE_MNM, POWER_RESERVE_HOURS } from './train';

export const FULL_WIND_AMPLITUDE_DEG = 280;
export const DEFAULT_AMPLITUDE = FULL_WIND_AMPLITUDE_DEG;
export const RESERVE_AFTER_A_DAY_HOURS = POWER_RESERVE_HOURS - 24;

const JOULES_PER_MILLINEWTON_METRE_RADIAN = 1e-3;
const MICRO_PER_UNIT = 1e6;
const ARBOR_RADIANS_PER_HOUR = FULL_TURN / BARREL_HOURS_PER_TURN;

interface TorquePoint {
  readonly reserveHours: number;
  readonly torqueMNm: number;
}

const TORQUE_CURVE: readonly TorquePoint[] = [
  { reserveHours: 0, torqueMNm: MAINSPRING_TORQUE_MNM.runDown },
  { reserveHours: RESERVE_AFTER_A_DAY_HOURS, torqueMNm: MAINSPRING_TORQUE_MNM.after24Hours },
  { reserveHours: POWER_RESERVE_HOURS, torqueMNm: MAINSPRING_TORQUE_MNM.fullWind },
];

function reserveWithin(reserveHours: number): number {
  return clamp(reserveHours, 0, POWER_RESERVE_HOURS);
}

export function torqueMNm(reserveHours: number): number {
  const hours = reserveWithin(reserveHours);
  const upper = Math.max(
    1,
    TORQUE_CURVE.findIndex((point) => point.reserveHours >= hours),
  );
  const from = TORQUE_CURVE[upper - 1];
  const to = TORQUE_CURVE[upper];
  const share = (hours - from.reserveHours) / (to.reserveHours - from.reserveHours);
  return lerp(from.torqueMNm, to.torqueMNm, share);
}

export function amplitude(reserveHours: number): number {
  return (
    FULL_WIND_AMPLITUDE_DEG * Math.sqrt(torqueMNm(reserveHours) / MAINSPRING_TORQUE_MNM.fullWind)
  );
}

function torqueHours(reserveHours: number): number {
  const hours = reserveWithin(reserveHours);
  return TORQUE_CURVE.slice(1).reduce((total, point, index) => {
    const from = TORQUE_CURVE[index].reserveHours;
    const to = Math.min(point.reserveHours, hours);
    if (to <= from) return total;
    return total + ((torqueMNm(from) + torqueMNm(to)) / 2) * (to - from);
  }, 0);
}

export function storedEnergyJ(reserveHours: number): number {
  return torqueHours(reserveHours) * ARBOR_RADIANS_PER_HOUR * JOULES_PER_MILLINEWTON_METRE_RADIAN;
}

export function averagePowerMicroW(): number {
  const runSeconds = POWER_RESERVE_HOURS * SECONDS_PER_HOUR;
  return (storedEnergyJ(POWER_RESERVE_HOURS) / runSeconds) * MICRO_PER_UNIT;
}
