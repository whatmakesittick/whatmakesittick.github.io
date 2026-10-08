import { DoubleSide } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import type { PartId } from '../../ids';
import { THEME } from '../../theme';

const MATTE = 0.85;
const SATIN = 0.5;
const METAL = 0.6;
const GLOW = 0.6;
const VEIL_OPACITY = 0.3;
const RING_OPACITY = 0.45;

function matte(color: string): MaterialFinish {
  return { color, roughness: MATTE, metalness: 0 };
}

function satin(color: string): MaterialFinish {
  return { color, roughness: SATIN, metalness: 0.1 };
}

function metal(color: string): MaterialFinish {
  return { color, roughness: SATIN, metalness: METAL };
}

function glowing(color: string): MaterialFinish {
  return { color, emissive: color, emissiveIntensity: GLOW, roughness: MATTE };
}

function veil(color: string, opacity: number): MaterialFinish {
  return { color, transparent: true, opacity, depthWrite: false, side: DoubleSide };
}

export const PART_FINISHES: Readonly<Record<PartId, MaterialFinish>> = {
  land: matte(THEME.grass),
  foundation: matte(THEME.concrete),
  tower: satin(THEME.turbineWhite),
  transformer: satin(THEME.substation),
  towerCable: glowing(THEME.cable),
  nacelle: satin(THEME.turbineWhite),
  cooler: satin(THEME.cooler),
  bedplate: metal(THEME.castIron),
  hub: satin(THEME.turbineWhite),
  blades: satin(THEME.turbineGrey),
  pitchCylinders: metal(THEME.hydraulic),
  mainBearing: metal(THEME.steel),
  mainShaft: metal(THEME.steel),
  gearbox: metal(THEME.gearOil),
  brakeDisc: metal(THEME.brakeGlow),
  generator: metal(THEME.copper),
  converter: satin(THEME.converterCabinet),
  yawDrives: metal(THEME.castIron),
  sweptArea: veil(THEME.wind, RING_OPACITY),
  streamlinesGroup: glowing(THEME.wind),
  heroWake: veil(THEME.wake, VEIL_OPACITY),
  farmLand: matte(THEME.grassDark),
  farmTurbines: satin(THEME.turbineWhite),
  accessRoads: matte(THEME.gravel),
  spacingMarker: glowing(THEME.spacing),
  prevailingWind: glowing(THEME.wind),
  windArrows: glowing(THEME.wind),
  shearProfile: glowing(THEME.wind),
  wakePlumes: veil(THEME.wake, VEIL_OPACITY),
  collectorCables: glowing(THEME.cable),
  substation: satin(THEME.substation),
  gridLine: metal(THEME.gridLine),
};
