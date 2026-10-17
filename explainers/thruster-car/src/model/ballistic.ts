import { G } from './constants';

function verticalSpeed(speed: number, angleRad: number): number {
  return speed * Math.sin(angleRad);
}

export function peakHeight(speed: number, angleRad: number, exitHeight: number): number {
  return exitHeight + verticalSpeed(speed, angleRad) ** 2 / (2 * G);
}

export function airTime(speed: number, angleRad: number, exitHeight: number): number {
  const rise = verticalSpeed(speed, angleRad);
  return (rise + Math.sqrt(rise ** 2 + 2 * G * exitHeight)) / G;
}

export function range(speed: number, angleRad: number, exitHeight: number): number {
  return speed * Math.cos(angleRad) * airTime(speed, angleRad, exitHeight);
}

export function launchSpeed(entrySpeed: number, exitHeight: number): number {
  return Math.sqrt(Math.max(0, entrySpeed ** 2 - 2 * G * exitHeight));
}
