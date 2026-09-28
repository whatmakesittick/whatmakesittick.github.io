import {
  CYCLE_DEG,
  SECONDS_PER_HALF_DAY,
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
} from './kinematics';
import { OSCILLATIONS_PER_SECOND } from './train';

export { cycleCountAfter } from './kinematics';

const SLOW_MOTION_BASE = 2;
const HOURS_ON_DIAL = 12;
const CLOCK_DIGITS = 2;

export function slowMotionFactor(speed: number): number {
  return SLOW_MOTION_BASE ** speed;
}

export function phaseDegreesPerSecond(speed: number): number {
  return (CYCLE_DEG * OSCILLATIONS_PER_SECOND) / slowMotionFactor(speed);
}

function twoDigits(value: number): string {
  return String(value).padStart(CLOCK_DIGITS, '0');
}

export function formatTimeOnDial(seconds: number): string {
  const whole = Math.floor(seconds);
  const onDial = ((whole % SECONDS_PER_HALF_DAY) + SECONDS_PER_HALF_DAY) % SECONDS_PER_HALF_DAY;
  const hours = Math.floor(onDial / SECONDS_PER_HOUR) || HOURS_ON_DIAL;
  const minutes = Math.floor((onDial % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const rest = onDial % SECONDS_PER_MINUTE;
  return [hours, minutes, rest].map(twoDigits).join(':');
}
