import { clamp } from '@core/math';
import type { CutawayId } from '../ids';

export const CUTAWAY_SECONDS = 0.9;
export const REVERSER_SECONDS = 1.4;

export function cutawayTarget(choice: CutawayId): number {
  return choice === 'cutaway' ? 1 : 0;
}

export function reverserTarget(deployed: boolean): number {
  return deployed ? 1 : 0;
}

export function ease(
  current: number,
  target: number,
  deltaSeconds: number,
  seconds: number,
): number {
  const step = deltaSeconds / seconds;
  if (target > current) return clamp(current + step, current, target);
  return clamp(current - step, target, current);
}
