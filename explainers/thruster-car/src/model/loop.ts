import { CAR_MASS_KG, G } from './constants';
import { NEWTONS_PER_KILONEWTON } from './units';

const LOOP_STEPS = 2048;

export function loopSpeedAt(entrySpeed: number, radius: number, angle: number): number {
  return Math.sqrt(Math.max(0, entrySpeed ** 2 - 2 * G * radius * (1 - Math.cos(angle))));
}

export function topSpeed(entrySpeed: number, radius: number): number {
  return loopSpeedAt(entrySpeed, radius, Math.PI);
}

export function bottomLoadG(entrySpeed: number, radius: number): number {
  return entrySpeed ** 2 / (G * radius);
}

export function topLoadG(entrySpeed: number, radius: number): number {
  return (topSpeed(entrySpeed, radius) ** 2 / radius - G) / G;
}

export function minimumEntrySpeed(radius: number): number {
  return Math.sqrt(4 * G * radius);
}

export function loopTimetable(entrySpeed: number, radius: number): readonly number[] {
  const step = Math.PI / LOOP_STEPS;
  const pace = (angle: number) => radius / loopSpeedAt(entrySpeed, radius, angle);
  const times = [0];
  for (let index = 1; index <= LOOP_STEPS; index += 1) {
    const span = (step * (pace((index - 1) * step) + pace(index * step))) / 2;
    times.push(times[index - 1] + span);
  }
  return times;
}

export function loopAngleAt(times: readonly number[], seconds: number): number {
  const last = times.length - 1;
  if (seconds >= times[last]) return Math.PI;
  let low = 0;
  let high = last;
  while (high - low > 1) {
    const mid = (low + high) >> 1;
    if (times[mid] <= seconds) low = mid;
    else high = mid;
  }
  const share = (Math.max(0, seconds) - times[low]) / (times[high] - times[low]);
  return ((low + share) * Math.PI) / last;
}

export function dropSeconds(height: number): number {
  return Math.sqrt((2 * height) / G);
}

export function dropSpeed(height: number): number {
  return Math.sqrt(2 * G * height);
}

export function leapAccel(thrustN: number): number {
  return thrustN / CAR_MASS_KG - G;
}

export function leapSpeedFor(height: number, burnAccel: number): number {
  return Math.sqrt((2 * height) / (1 / burnAccel + 1 / G));
}

export function leapBurnSeconds(height: number, burnAccel: number): number {
  return leapSpeedFor(height, burnAccel) / burnAccel;
}

export function leapImpulseKns(height: number, thrustN: number): number {
  return (thrustN * leapBurnSeconds(height, leapAccel(thrustN))) / NEWTONS_PER_KILONEWTON;
}

export function airTimeFrom(heightGained: number, upSpeed: number): number {
  return (upSpeed + Math.sqrt(upSpeed ** 2 + 2 * G * heightGained)) / G;
}
