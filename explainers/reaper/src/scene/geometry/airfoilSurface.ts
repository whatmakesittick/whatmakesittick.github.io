import type { BufferGeometry } from 'three';
import { stitchRings } from './rings';
import type { Ring, RingPoint } from './rings';

export type Vec3 = readonly [x: number, y: number, z: number];

export interface LoopPoint {
  fraction: number;
  thickness: number;
  camber: number;
  upper: boolean;
}

export interface Station {
  leadingEdge: Vec3;
  chordAxis: Vec3;
  normalAxis: Vec3;
  chord: number;
  thickness: number;
  camber: number;
}

const NACA_SPREAD = 5;
const NACA = [0.2969, -0.126, -0.3516, 0.2843, -0.1036] as const;
const CAMBER_PEAK = 0.4;

export function thicknessShape(fraction: number): number {
  const [root, linear, square, cube, quartic] = NACA;
  const x = fraction;
  return (
    NACA_SPREAD *
    (root * Math.sqrt(x) + linear * x + square * x ** 2 + cube * x ** 3 + quartic * x ** 4)
  );
}

export function camberShape(fraction: number): number {
  const p = CAMBER_PEAK;
  if (fraction < p) return (2 * p * fraction - fraction ** 2) / p ** 2;
  return (1 - 2 * p + 2 * p * fraction - fraction ** 2) / (1 - p) ** 2;
}

function cosineSpacing(samples: number): number[] {
  return Array.from(
    { length: samples + 1 },
    (_, index) => (1 - Math.cos((Math.PI * index) / samples)) / 2,
  );
}

export function airfoilLoop(samples: number): LoopPoint[] {
  const fractions = cosineSpacing(samples);
  const upper = [...fractions].reverse().map((fraction) => ({
    fraction,
    thickness: thicknessShape(fraction),
    camber: camberShape(fraction),
    upper: true,
  }));
  const lower = fractions.slice(1, -1).map((fraction) => ({
    fraction,
    thickness: -thicknessShape(fraction),
    camber: camberShape(fraction),
    upper: false,
  }));
  return [...upper, ...lower];
}

function stationRing(station: Station, loop: readonly LoopPoint[]): Ring {
  const { leadingEdge, chordAxis, normalAxis, chord, thickness, camber } = station;
  return loop.map((point): RingPoint => {
    const along = point.fraction * chord;
    const across = (point.thickness * thickness + point.camber * camber) * chord;
    return [
      leadingEdge[0] + chordAxis[0] * along + normalAxis[0] * across,
      leadingEdge[1] + chordAxis[1] * along + normalAxis[1] * across,
      leadingEdge[2] + chordAxis[2] * along + normalAxis[2] * across,
    ];
  });
}

export function loopCoordinate(point: LoopPoint): number {
  const half = point.fraction / 2;
  return point.upper ? 0.5 - half : 0.5 + half;
}

export function airfoilSurface(
  stations: readonly Station[],
  loop: readonly LoopPoint[],
  along?: readonly number[],
): BufferGeometry {
  const rings = stations.map((station) => stationRing(station, loop));
  const around = [...loop, loop[0]].map(loopCoordinate);
  around[around.length - 1] = 1;
  return stitchRings(rings, { capStart: true, capEnd: true, along, around });
}
