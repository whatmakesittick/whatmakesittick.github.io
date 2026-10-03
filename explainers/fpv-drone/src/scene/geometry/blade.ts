import type { BufferGeometry } from 'three';
import type { SpinDirection } from '../../ids';
import { stitchRings } from './rings';
import type { Ring, RingPoint } from './rings';

export interface BladeStation {
  radius: number;
  chord: number;
  thickness: number;
}

export interface BladeShape {
  stations: readonly BladeStation[];
  pitchMetres: number;
  incidence: number;
  pitchAxisShare: number;
  camber: number;
  samples: number;
}

interface SectionPoint {
  fraction: number;
  offset: number;
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

function sectionLoop(thickness: number, camber: number, samples: number): SectionPoint[] {
  const fractions = cosineSpacing(samples);
  const upper = [...fractions].reverse().map((fraction) => ({
    fraction,
    offset: thicknessShape(fraction) * thickness + camberShape(fraction) * camber,
  }));
  const lower = fractions.slice(1, -1).map((fraction) => ({
    fraction,
    offset: -thicknessShape(fraction) * thickness + camberShape(fraction) * camber,
  }));
  return [...upper, ...lower];
}

export function spinSign(direction: SpinDirection): 1 | -1 {
  return direction === 'clockwise' ? -1 : 1;
}

export function bladeAngle(shape: BladeShape, radius: number): number {
  return Math.atan(shape.pitchMetres / (Math.PI * 2 * radius)) + shape.incidence;
}

function stationRing(shape: BladeShape, station: BladeStation, direction: SpinDirection): Ring {
  const angle = bladeAngle(shape, station.radius);
  const moving = -spinSign(direction);
  const chordAxis = [0, -Math.sin(angle), -moving * Math.cos(angle)] as const;
  const normalAxis = [0, Math.cos(angle), -moving * Math.sin(angle)] as const;
  const lead = shape.pitchAxisShare * station.chord;
  const leadingEdge = [station.radius, -chordAxis[1] * lead, -chordAxis[2] * lead] as const;
  return sectionLoop(station.thickness, shape.camber, shape.samples).map((point): RingPoint => {
    const alongChord = point.fraction * station.chord;
    const across = point.offset * station.chord;
    return [
      leadingEdge[0],
      leadingEdge[1] + chordAxis[1] * alongChord + normalAxis[1] * across,
      leadingEdge[2] + chordAxis[2] * alongChord + normalAxis[2] * across,
    ];
  });
}

export function bladeGeometry(shape: BladeShape, direction: SpinDirection): BufferGeometry {
  const rings = shape.stations.map((station) => stationRing(shape, station, direction));
  return stitchRings(rings, { capStart: true, capEnd: true });
}
