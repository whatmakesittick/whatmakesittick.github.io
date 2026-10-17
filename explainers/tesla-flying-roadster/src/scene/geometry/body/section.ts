import { lerp, smoothstep } from '@core/math';
import { ARCH, archCeiling } from './arches';
import { along, cubicPoint, direction, lerp2, quadraticPoint, solveIncreasing } from './curve';
import type { Vec2 } from './curve';
import { endScale, FLARE, stationProfile } from './profile';
import type { EndScale, StationProfile } from './profile';

export const SEGMENTS = [
  'floor',
  'wellWall',
  'wellRoof',
  'sill',
  'side',
  'shoulder',
  'belt',
  'glass',
  'rail',
  'crown',
] as const;

export type SegmentId = (typeof SEGMENTS)[number];

export const SEGMENT_CELLS: Readonly<Record<SegmentId, number>> = {
  floor: 1,
  wellWall: 1,
  wellRoof: 1,
  sill: 2,
  side: 7,
  shoulder: 8,
  belt: 2,
  glass: 4,
  rail: 2,
  crown: 9,
};

export const SMOOTH_FROM = SEGMENTS.indexOf('sill');

const LOWER_FULLNESS = { z: 0.62, y: 0.55 } as const;
const SHOULDER_FULLNESS = { z: 0.6, y: 0.5 } as const;
const BELT_FILLET = 0.024;
const RAIL_FILLET = 0.034;
const CROWN_SLOPE = 0.26;
const CROWN_HANDLE = 0.42;
const CROWN_FLAT = 0.45;
const SKIN_SPAN = 2;
const SCOOP_BAND = { floor: [0.3, 0.75], lip: [0.85, 1] } as const;
const FLARE_FADE = [1.5, SKIN_SPAN] as const;

type Cubic = readonly [Vec2, Vec2, Vec2, Vec2];
type Quadratic = readonly [Vec2, Vec2, Vec2];

interface SkinRange {
  ceiling: number;
  sill: number;
  shoulder: number;
}

function lowerSkin(p: StationProfile): Cubic {
  const tuck = p.sideZ - p.rockerZ;
  const rise = p.shoulderY - p.floorY;
  return [
    [p.rockerZ, p.floorY],
    [p.rockerZ + LOWER_FULLNESS.z * tuck, p.floorY],
    [p.sideZ, p.shoulderY - LOWER_FULLNESS.y * rise],
    [p.sideZ, p.shoulderY],
  ];
}

function shoulderSkin(p: StationProfile, beltFillet: number): Cubic {
  const inner = p.beltZ + beltFillet;
  return [
    [p.sideZ, p.shoulderY],
    [p.sideZ, p.shoulderY + SHOULDER_FULLNESS.y * (p.beltY - p.shoulderY)],
    [inner + SHOULDER_FULLNESS.z * (p.sideZ - inner), p.beltY],
    [inner, p.beltY],
  ];
}

function crownDirection(p: StationProfile): Vec2 {
  return direction([0, 0], [-1, CROWN_SLOPE * p.greenhouse]);
}

function crownCurve(p: StationProfile, start: Vec2, heading: Vec2): Cubic {
  let handle = CROWN_HANDLE * start[0];
  if (heading[1] > 0) handle = Math.min(handle, (p.topY - start[1]) / heading[1]);
  return [
    start,
    along(start, heading, Math.max(0, handle)),
    [CROWN_FLAT * start[0], p.topY],
    [0, p.topY],
  ];
}

function scoopWeight(at: number): number {
  const { floor, lip } = SCOOP_BAND;
  return smoothstep(at, floor[0], floor[1]) * (1 - smoothstep(at, lip[0], lip[1]));
}

function flareAt(x: number, y: number): number {
  const centre = ARCH.centresX.reduce((best, at) =>
    Math.abs(x - at) < Math.abs(x - best) ? at : best,
  );
  const reach = Math.hypot(x - centre, y - ARCH.centreY) - ARCH.radius;
  if (reach >= FLARE.band) return 0;
  const lip = 1 - smoothstep(Math.max(0, reach), 0, FLARE.band);
  const rise = smoothstep(y, ARCH.centreY - FLARE.fadeBelow, ARCH.centreY + FLARE.fullAbove);
  return FLARE.depth * lip * rise;
}

export class StationSection {
  readonly x: number;
  readonly profile: StationProfile;
  readonly ceilingY: number;
  private readonly scale: EndScale;
  private readonly lower: Cubic;
  private readonly shoulder: Cubic;
  private readonly beltFillet: Quadratic;
  private readonly railFillet: Quadratic;
  private readonly glass: readonly [Vec2, Vec2];
  private readonly crown: Cubic;
  private readonly skin: SkinRange;

  constructor(x: number) {
    this.x = x;
    const p = stationProfile(x);
    this.profile = p;
    this.scale = endScale(x);
    this.ceilingY = archCeiling(x, p.floorY);
    const beltSize = BELT_FILLET * p.greenhouse;
    const railSize = RAIL_FILLET * p.greenhouse;
    const belt: Vec2 = [p.beltZ, p.beltY];
    const rail: Vec2 = [p.railZ, p.railY];
    const up = direction(belt, rail);
    const heading = crownDirection(p);
    this.lower = lowerSkin(p);
    this.shoulder = shoulderSkin(p, beltSize);
    this.beltFillet = [this.shoulder[3], belt, along(belt, up, beltSize)];
    this.railFillet = [along(rail, up, -railSize), rail, along(rail, heading, railSize)];
    this.glass = [this.beltFillet[2], this.railFillet[0]];
    this.crown = crownCurve(p, this.railFillet[2], heading);
    this.skin = this.skinRange();
  }

  point(segment: SegmentId, u: number): Vec2 {
    const [z, y] = this.raw(segment, u);
    const { scale } = this;
    return [z * scale.z, scale.pivotY + (y - scale.pivotY) * scale.y];
  }

  private raw(segment: SegmentId, u: number): Vec2 {
    const { floorY } = this.profile;
    const { skin, ceilingY } = this;
    switch (segment) {
      case 'floor':
        return [ARCH.innerZ * u, floorY];
      case 'wellWall':
        return [ARCH.innerZ, lerp(floorY, ceilingY, u)];
      case 'wellRoof':
        return lerp2([ARCH.innerZ, ceilingY], this.skinPoint(skin.ceiling), u);
      case 'sill':
        return this.skinPoint(lerp(skin.ceiling, skin.sill, u));
      case 'side':
        return this.skinPoint(lerp(skin.sill, skin.shoulder, u));
      case 'shoulder':
        return this.skinPoint(lerp(skin.shoulder, SKIN_SPAN, u));
      case 'belt':
        return quadraticPoint(this.beltFillet, u);
      case 'glass':
        return lerp2(this.glass[0], this.glass[1], u);
      case 'rail':
        return quadraticPoint(this.railFillet, u);
      case 'crown':
        return cubicPoint(this.crown, u);
    }
  }

  private skinPoint(at: number): Vec2 {
    const upper = at > 1;
    const [z, y] = upper ? cubicPoint(this.shoulder, at - 1) : cubicPoint(this.lower, at);
    const scoop = upper ? 0 : this.profile.scoop * scoopWeight(at);
    const flare = flareAt(this.x, y) * (1 - smoothstep(at, FLARE_FADE[0], FLARE_FADE[1]));
    return [z - scoop + flare, y];
  }

  private skinRange(): SkinRange {
    const height = (at: number) => this.skinPoint(at)[1];
    const { floorY, sillY } = this.profile;
    const ceiling =
      this.ceilingY <= floorY ? 0 : solveIncreasing(height, this.ceilingY, 0, SKIN_SPAN);
    const sill = Math.max(ceiling, solveIncreasing(height, sillY, 0, 1));
    return { ceiling, sill, shoulder: Math.max(ceiling, 1) };
  }
}
