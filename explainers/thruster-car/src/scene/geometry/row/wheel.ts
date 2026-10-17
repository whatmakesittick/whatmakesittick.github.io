import type { BufferGeometry } from 'three';
import { mergeParts } from '../../parts/context';
import { latheAround } from '../gear/lathe';
import type { Profile } from '../gear/lathe';
import { paintTriangles } from './paint';
import type { RowSwatch, SwatchUv } from './swatch';

export interface WheelSpec {
  radius: number;
  rim: number;
  width: number;
  segments: number;
  dual?: boolean;
}

const TYRE = {
  bead: 0.006,
  beadInset: 0.012,
  bulge: 0.45,
  shoulder: 0.014,
  shoulderInset: 0.028,
  treadInset: 0.06,
  groove: 0.03,
} as const;

const RIM = {
  lipInset: 0.014,
  lipDrop: 0.008,
  spokeEnd: 0.5,
  spokeDish: 0.03,
  capDrop: 0.012,
} as const;

const TRIANGLES_PER_QUAD = 2;
const SPOKE_BAND = 1;

function tyreProfile(spec: WheelSpec): Profile {
  const outer = spec.width / 2;
  const wall = spec.rim + TYRE.bulge * (spec.radius - spec.rim);
  const tread = outer - TYRE.treadInset;
  const groove: Profile = spec.dual ? [[spec.radius - TYRE.groove, 0]] : [];
  return [
    [spec.radius, -tread],
    ...groove,
    [spec.radius, tread],
    [spec.radius - TYRE.shoulder, outer - TYRE.shoulderInset],
    [wall, outer],
    [spec.rim + TYRE.bead, outer - TYRE.beadInset],
  ];
}

function rimProfile(spec: WheelSpec): Profile {
  const face = spec.width / 2 - TYRE.beadInset;
  return [
    [spec.rim + TYRE.bead, face],
    [spec.rim - RIM.lipInset, face - RIM.lipDrop],
    [spec.rim * RIM.spokeEnd, face - RIM.spokeDish],
    [0, face - RIM.capDrop],
  ];
}

function lathePainted(
  profile: Profile,
  segments: number,
  swatchOf: (segment: number, band: number) => RowSwatch,
  uv: SwatchUv,
): BufferGeometry {
  const bands = profile.length - 1;
  const geometry = latheAround(profile, { axis: 'z', segments });
  return paintTriangles(geometry, (triangle) => {
    const quad = Math.floor(triangle / TRIANGLES_PER_QUAD);
    return uv(swatchOf(Math.floor(quad / bands), quad % bands));
  });
}

function rimSwatch(segment: number, band: number): RowSwatch {
  if (band !== SPOKE_BAND) return 'rim';
  return segment % 2 === 0 ? 'rim' : 'rimDark';
}

export function wheelGeometry(spec: WheelSpec, uv: SwatchUv): BufferGeometry {
  return mergeParts([
    lathePainted(tyreProfile(spec), spec.segments, () => 'tyre', uv),
    lathePainted(rimProfile(spec), spec.segments, rimSwatch, uv),
  ]);
}
