import { clamp, lerp, smoothstep } from '@core/math';

export type Ease = (share: number) => number;

export interface Keyframe {
  at: number;
  value: number;
  ease?: Ease;
}

export type Track = (time: number) => number;

export const linear: Ease = (share) => share;
export const accelerate: Ease = (share) => share * share;
export const decelerate: Ease = (share) => 1 - (1 - share) ** 2;
export const easeInOut: Ease = (share) => smoothstep(share);

export function progress(value: number, start: number, end: number): number {
  return clamp((value - start) / (end - start), 0, 1);
}

export function keyframes(keys: readonly Keyframe[]): Track {
  const first = keys[0];
  const last = keys[keys.length - 1];
  return (time) => {
    if (time <= first.at) return first.value;
    const nextIndex = keys.findIndex((key) => key.at > time);
    if (nextIndex < 0) return last.value;
    const from = keys[nextIndex - 1];
    const to = keys[nextIndex];
    const ease = to.ease ?? linear;
    return lerp(from.value, to.value, ease(progress(time, from.at, to.at)));
  };
}

const SOLVE_STEPS = 48;

export function timeWhen(track: Track, target: number, start: number, end: number): number {
  let low = start;
  let high = end;
  for (let step = 0; step < SOLVE_STEPS; step += 1) {
    const middle = (low + high) / 2;
    if (track(middle) < target) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}
