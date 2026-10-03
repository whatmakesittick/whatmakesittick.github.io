import { clamp } from '@core/math';

export type Keyframe = readonly [x: number, y: number];
export type Keyframes = readonly Keyframe[];

function spanIndex(keys: Keyframes, x: number): number {
  const index = keys.findIndex((key) => x <= key[0]);
  if (index <= 0) return 0;
  return index - 1;
}

export function valueAt(keys: Keyframes, x: number): number {
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];
  const index = spanIndex(keys, x);
  const [x0, y0] = keys[index];
  const [x1, y1] = keys[index + 1];
  return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
}

export function integralTo(keys: Keyframes, x: number): number {
  const end = clamp(x, keys[0][0], keys[keys.length - 1][0]);
  let total = 0;
  for (let index = 0; index < keys.length - 1; index += 1) {
    const [x0, y0] = keys[index];
    const x1 = keys[index + 1][0];
    if (end <= x0) break;
    const to = Math.min(end, x1);
    total += ((y0 + valueAt(keys, to)) / 2) * (to - x0);
  }
  return total;
}

export function firstCrossing(keys: Keyframes, y: number): number {
  for (let index = 0; index < keys.length - 1; index += 1) {
    const [x0, y0] = keys[index];
    const [x1, y1] = keys[index + 1];
    if (y0 === y) return x0;
    if ((y0 - y) * (y1 - y) < 0) return x0 + ((y - y0) / (y1 - y0)) * (x1 - x0);
  }
  const last = keys[keys.length - 1];
  return last[1] === y ? last[0] : Number.NaN;
}
