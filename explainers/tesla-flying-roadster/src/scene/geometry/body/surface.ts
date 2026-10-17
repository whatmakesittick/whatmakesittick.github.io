import { clamp } from '@core/math';
import { SEGMENTS, StationSection } from './section';
import type { SegmentId } from './section';
import { cross, normalize, sub } from './mesh';
import type { Vec3 } from './mesh';

export type SurfaceSpot = readonly [x: number, s: number];

const STEP = { x: 1e-3, s: 1e-3 } as const;
const LAST_SEGMENT = SEGMENTS.length - 1;

export function spot(segment: SegmentId, u: number): number {
  return SEGMENTS.indexOf(segment) + u;
}

export class BodySurface {
  private readonly sections = new Map<number, StationSection>();

  point(x: number, s: number, mirror = 1): Vec3 {
    const index = clamp(Math.floor(s), 0, LAST_SEGMENT);
    const u = clamp(s - index, 0, 1);
    const [z, y] = this.section(x).point(SEGMENTS[index], u);
    return [x, y, z * mirror];
  }

  normal(x: number, s: number, mirror = 1): Vec3 {
    const alongX = sub(this.point(x + STEP.x, s), this.point(x - STEP.x, s));
    const alongS = sub(this.point(x, s + STEP.s), this.point(x, s - STEP.s));
    const [nx, ny, nz] = normalize(cross(alongX, alongS));
    return [nx, ny, nz * mirror];
  }

  section(x: number): StationSection {
    let section = this.sections.get(x);
    if (!section) {
      section = new StationSection(x);
      this.sections.set(x, section);
    }
    return section;
  }
}
