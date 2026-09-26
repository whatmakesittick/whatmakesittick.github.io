import { toRadians } from './cycle';
import type { EngineSpec } from './spec';

export interface CrankGeometry {
  crankRadius: number;
  rodLength: number;
}

export interface Point2 {
  x: number;
  y: number;
}

const MM_PER_METER = 1000;
const SECONDS_PER_MINUTE = 60;

export function crankGeometry(spec: EngineSpec): CrankGeometry {
  return { crankRadius: spec.strokeLength / 2, rodLength: spec.rodLength };
}

export function crankPinOffset(angle: number, geometry: CrankGeometry): Point2 {
  const theta = toRadians(angle);
  return {
    x: geometry.crankRadius * Math.sin(theta),
    y: geometry.crankRadius * Math.cos(theta),
  };
}

export function pistonPinHeight(angle: number, geometry: CrankGeometry): number {
  const { crankRadius: r, rodLength: l } = geometry;
  const theta = toRadians(angle);
  const sin = Math.sin(theta);
  return r * Math.cos(theta) + Math.sqrt(l * l - r * r * sin * sin);
}

export function topDeadCentreHeight(geometry: CrankGeometry): number {
  return geometry.crankRadius + geometry.rodLength;
}

export function pistonDisplacement(angle: number, geometry: CrankGeometry): number {
  return topDeadCentreHeight(geometry) - pistonPinHeight(angle, geometry);
}

export function pistonVelocityPerRadian(angle: number, geometry: CrankGeometry): number {
  const { crankRadius: r, rodLength: l } = geometry;
  const theta = toRadians(angle);
  const sin = Math.sin(theta);
  const cos = Math.cos(theta);
  return -r * sin - (r * r * sin * cos) / Math.sqrt(l * l - r * r * sin * sin);
}

export function pistonSpeed(angle: number, geometry: CrankGeometry, rpm: number): number {
  const omega = (rpm * 2 * Math.PI) / SECONDS_PER_MINUTE;
  return (pistonVelocityPerRadian(angle, geometry) * omega) / MM_PER_METER;
}

export function rodTilt(angle: number, geometry: CrankGeometry): number {
  const pin = crankPinOffset(angle, geometry);
  return Math.asin(pin.x / geometry.rodLength);
}

export function boreArea(spec: EngineSpec): number {
  const radius = spec.bore / 2;
  return Math.PI * radius * radius;
}

export function clearanceHeight(spec: EngineSpec): number {
  return spec.strokeLength / (spec.compressionRatio - 1);
}

export function sweptVolume(spec: EngineSpec): number {
  return boreArea(spec) * spec.strokeLength;
}

export function cylinderVolume(angle: number, spec: EngineSpec): number {
  const displacement = pistonDisplacement(angle, crankGeometry(spec));
  return boreArea(spec) * (clearanceHeight(spec) + displacement);
}
