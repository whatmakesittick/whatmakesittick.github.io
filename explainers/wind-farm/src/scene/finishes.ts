import { DoubleSide } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import type { PartId } from '../ids';
import { THEME } from '../theme';

const MATTE = 0.9;
const SATIN = 0.48;
const POLISHED = 0.28;
const METAL = 0.75;
const GLOW = 0.8;
const VEIL_OPACITY = 0.28;
const RING_OPACITY = 0.35;

function matte(color: string): MaterialFinish {
  return { color, roughness: MATTE, metalness: 0 };
}

function satin(color: string): MaterialFinish {
  return { color, roughness: SATIN, metalness: 0.05 };
}

function metal(color: string, roughness = SATIN): MaterialFinish {
  return { color, roughness, metalness: METAL };
}

function glowing(color: string): MaterialFinish {
  return { color, emissive: color, emissiveIntensity: GLOW, roughness: MATTE };
}

function veil(color: string, opacity: number): MaterialFinish {
  return { color, transparent: true, opacity, depthWrite: false, side: DoubleSide };
}

export const FINISHES = {
  paint: { color: THEME.turbineWhite, roughness: 0.32, metalness: 0.04 },
  towerPaint: matte(THEME.turbineWhite),
  paintShade: satin(THEME.turbineGrey),
  gelcoat: { color: THEME.turbineWhite, roughness: 0.26, metalness: 0.03 },
  concrete: matte(THEME.concrete),
  castIron: metal(THEME.castIron),
  steel: metal(THEME.steel, POLISHED),
  gearbox: metal(THEME.gearOil),
  copper: metal(THEME.copper),
  hydraulic: metal(THEME.hydraulic),
  brake: metal(THEME.steel, POLISHED),
  brakeGlow: glowing(THEME.brakeGlow),
  cabinet: satin(THEME.converterCabinet),
  cooler: metal(THEME.cooler),
  grille: metal(THEME.castIron, MATTE),
  substation: satin(THEME.substation),
  gridSteel: metal(THEME.gridLine),
  cable: glowing(THEME.cable),
  cableDark: matte(THEME.gridLine),
  gravel: matte(THEME.gravel),
  grass: { color: '#ffffff', roughness: 1, metalness: 0, vertexColors: true },
  trees: matte(THEME.trees),
  wind: glowing(THEME.wind),
  spacing: glowing(THEME.spacing),
  wake: veil(THEME.wake, VEIL_OPACITY),
  sweep: veil(THEME.wind, RING_OPACITY),
  shadow: { color: '#000000', transparent: true, opacity: 0.22, depthWrite: false },
} as const satisfies Record<string, MaterialFinish>;

export type Finish = keyof typeof FINISHES;

export const PART_FINISHES: Readonly<Record<PartId, Finish>> = {
  land: 'grass',
  foundation: 'concrete',
  tower: 'towerPaint',
  transformer: 'substation',
  towerCable: 'cable',
  nacelle: 'paint',
  cooler: 'cooler',
  bedplate: 'castIron',
  hub: 'paint',
  blades: 'gelcoat',
  pitchCylinders: 'hydraulic',
  mainBearing: 'steel',
  mainShaft: 'steel',
  gearbox: 'gearbox',
  brakeDisc: 'brake',
  generator: 'copper',
  converter: 'cabinet',
  yawDrives: 'castIron',
  sweptArea: 'sweep',
  streamlinesGroup: 'wind',
  heroWake: 'wake',
  farmLand: 'grass',
  farmTurbines: 'paint',
  accessRoads: 'gravel',
  spacingMarker: 'spacing',
  prevailingWind: 'wind',
  windArrows: 'wind',
  shearProfile: 'wind',
  wakePlumes: 'wake',
  collectorCables: 'cable',
  substation: 'substation',
  gridLine: 'gridSteel',
};
