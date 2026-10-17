import { lerp } from '@core/math';
import type { Vec2 } from './curve';
import { StationSection } from './section';
import type { SegmentId } from './section';

const RISING: readonly SegmentId[] = ['sill', 'side', 'shoulder', 'belt', 'glass', 'rail', 'crown'];
const SAMPLES = 16;

function chain(x: number): Vec2[] {
  const section = new StationSection(x);
  return RISING.flatMap((segment) =>
    Array.from({ length: SAMPLES + 1 }, (_, step) => section.point(segment, step / SAMPLES)),
  );
}

function crossing(points: readonly Vec2[], axis: 0 | 1, target: number, rising: boolean): Vec2 {
  for (let index = 1; index < points.length; index += 1) {
    const [before, after] = [points[index - 1], points[index]];
    const passed = rising ? after[axis] >= target : after[axis] <= target;
    if (!passed) continue;
    const span = after[axis] - before[axis];
    const share = span === 0 ? 0 : (target - before[axis]) / span;
    return [lerp(before[0], after[0], share), lerp(before[1], after[1], share)];
  }
  return points[points.length - 1];
}

export function shellHalfWidth(x: number, y: number): number {
  return crossing(chain(x), 1, y, true)[0];
}

export function shellCeiling(x: number, halfWidth: number): number {
  const points = chain(x);
  const widest = points.reduce(
    (best, point, index) => (point[0] > points[best][0] ? index : best),
    0,
  );
  return crossing(points.slice(widest), 0, halfWidth, false)[1];
}
