import { Vector3 } from 'three';
import { clamp, smoothstep } from '@core/math';
import { IMPACT_UNITS, LAUNCH_UNITS, missilePointAt } from '../../model/strike';
import { MISSILE_FX } from '../constants';

export function missileClock(phase: number): number {
  return (phase - LAUNCH_UNITS) / (IMPACT_UNITS - LAUNCH_UNITS);
}

export function railShare(share: number): number {
  return 1 - smoothstep(share, 0, MISSILE_FX.railBlend);
}

export function missilePosition(share: number, railOffset: Vector3, target: Vector3): Vector3 {
  const t = clamp(share, 0, 1);
  return target.set(...missilePointAt(t)).addScaledVector(railOffset, railShare(t));
}

export function missileDirection(share: number, railOffset: Vector3, target: Vector3): Vector3 {
  const step = MISSILE_FX.tangentStep;
  const from = clamp(share, 0, 1 - step);
  const ahead = missilePosition(from + step, railOffset, new Vector3());
  return target
    .copy(ahead)
    .sub(missilePosition(from, railOffset, new Vector3()))
    .normalize();
}
