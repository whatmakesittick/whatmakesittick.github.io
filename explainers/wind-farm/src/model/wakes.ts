import { clamp, toRadians } from '@core/math';
import type { FarmSite, SpacingD } from '../ids';
import {
  MAX_PLUME_D,
  PLUME_VISIBLE_DEFICIT,
  ROTOR_RADIUS_M,
  TURBINE_COUNT,
  WAKE_DECAY,
} from './constants';
import { farmLayout } from './layout';
import { isGenerating, thrustCoefficient, turbinePowerKw } from './power';

interface DownwindOffset {
  along: number;
  across: number;
}

export function initialDeficit(ct: number): number {
  return 1 - Math.sqrt(1 - ct);
}

export function axialInduction(ct: number): number {
  return initialDeficit(ct) / 2;
}

function expansion(xOverD: number): number {
  return 1 + 2 * WAKE_DECAY * xOverD;
}

export function centrelineDeficit(ct: number, xOverD: number): number {
  return initialDeficit(ct) / expansion(xOverD) ** 2;
}

function lensAngle(offset: number, near: number, far: number): number {
  return Math.acos(clamp((offset ** 2 + near ** 2 - far ** 2) / (2 * offset * near), -1, 1));
}

function lensArea(offset: number, radiusA: number, radiusB: number): number {
  const kite = Math.sqrt(
    Math.max(
      0,
      (-offset + radiusA + radiusB) *
        (offset + radiusA - radiusB) *
        (offset - radiusA + radiusB) *
        (offset + radiusA + radiusB),
    ),
  );
  return (
    radiusA ** 2 * lensAngle(offset, radiusA, radiusB) +
    radiusB ** 2 * lensAngle(offset, radiusB, radiusA) -
    kite / 2
  );
}

export function overlapShare(offset: number, wakeRadius: number, rotorRadius: number): number {
  const distance = Math.abs(offset);
  if (distance >= wakeRadius + rotorRadius) return 0;
  if (distance <= Math.abs(wakeRadius - rotorRadius)) {
    return Math.min(1, (wakeRadius / rotorRadius) ** 2);
  }
  return lensArea(distance, wakeRadius, rotorRadius) / (Math.PI * rotorRadius ** 2);
}

function downwindOffset(from: FarmSite, to: FarmSite, fromDeg: number): DownwindOffset {
  const bearing = toRadians(fromDeg);
  const towardX = -Math.sin(bearing);
  const towardZ = Math.cos(bearing);
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  return { along: dx * towardX + dz * towardZ, across: dx * towardZ - dz * towardX };
}

function wakeDeficitAt(offset: DownwindOffset, strength: number): number {
  const wakeRadius = ROTOR_RADIUS_M + WAKE_DECAY * offset.along;
  return (
    strength *
    (ROTOR_RADIUS_M / wakeRadius) ** 2 *
    overlapShare(offset.across, wakeRadius, ROTOR_RADIUS_M)
  );
}

export function wakeDeficits(sites: readonly FarmSite[], ct: number, fromDeg: number): number[] {
  const strength = initialDeficit(ct);
  return sites.map((site) => {
    const squares = sites.reduce((sum, upwind) => {
      const offset = downwindOffset(upwind, site, fromDeg);
      return offset.along > 0 ? sum + wakeDeficitAt(offset, strength) ** 2 : sum;
    }, 0);
    return Math.sqrt(squares);
  });
}

export function farmPowerKw(wind: number, fromDeg: number, spacing: SpacingD): number {
  if (!isGenerating(wind)) return 0;
  const deficits = wakeDeficits(farmLayout(spacing), thrustCoefficient(wind), fromDeg);
  return deficits.reduce((sum, deficit) => sum + turbinePowerKw(wind * (1 - deficit)), 0);
}

export function wakeLoss(wind: number, fromDeg: number, spacing: SpacingD): number {
  const freeKw = turbinePowerKw(wind);
  if (freeKw === 0) return 0;
  return Math.max(0, 1 - farmPowerKw(wind, fromDeg, spacing) / (TURBINE_COUNT * freeKw));
}

export function plumeLengthD(ct: number): number {
  const visibleExpansion = Math.sqrt(initialDeficit(ct) / PLUME_VISIBLE_DEFICIT);
  return clamp((visibleExpansion - 1) / (2 * WAKE_DECAY), 0, MAX_PLUME_D);
}
