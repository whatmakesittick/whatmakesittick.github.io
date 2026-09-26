import { clearanceHeight, crankGeometry, topDeadCentreHeight } from '../model';
import type { CrankGeometry, EngineSpec } from '../model';
import { BLOCK, PISTON, PORT, VALVE } from './constants';

export type ValveSide = 'intake' | 'exhaust';

export interface ValveDimensions {
  side: ValveSide;
  sign: number;
  headRadius: number;
  offset: number;
  portRadius: number;
}

export interface EngineDimensions {
  geometry: CrankGeometry;
  boreRadius: number;
  pistonRadius: number;
  linerOuterRadius: number;
  headFaceHeight: number;
  valves: Record<ValveSide, ValveDimensions>;
}

function valveDimensions(spec: EngineSpec, side: ValveSide): ValveDimensions {
  const radiusPerBore = side === 'intake' ? VALVE.intakeRadiusPerBore : VALVE.exhaustRadiusPerBore;
  const headRadius = spec.bore * radiusPerBore;
  return {
    side,
    sign: side === 'intake' ? -1 : 1,
    headRadius,
    offset: spec.bore * VALVE.offsetPerBore,
    portRadius: headRadius * PORT.radiusPerValve,
  };
}

export function headFaceHeight(spec: EngineSpec): number {
  return topDeadCentreHeight(crankGeometry(spec)) + PISTON.pinToCrown + clearanceHeight(spec);
}

export function engineDimensions(spec: EngineSpec): EngineDimensions {
  const boreRadius = spec.bore / 2;
  return {
    geometry: crankGeometry(spec),
    boreRadius,
    pistonRadius: boreRadius - PISTON.wallClearance,
    linerOuterRadius: boreRadius + BLOCK.linerThickness,
    headFaceHeight: headFaceHeight(spec),
    valves: { intake: valveDimensions(spec, 'intake'), exhaust: valveDimensions(spec, 'exhaust') },
  };
}
