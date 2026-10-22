import { DoubleSide } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import type { PartId } from '../ids';
import { THEME } from '../theme';

const MATTE = 0.9;
const SATIN = 0.5;
const GLOSS = 0.28;
const METAL = 0.7;
const GLOW = 0.9;
const GLASS_OPACITY = 0.45;
const GHOST_OPACITY = 0.45;
const INSET_OPACITY = 0.9;

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
  return {
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: DoubleSide,
    roughness: SATIN,
  };
}

export const FINISHES = {
  trainWhite: { color: THEME.trainBody, roughness: GLOSS, metalness: 0.08 },
  trainShade: satin('#d8d4cb'),
  windowBand: { color: THEME.trainBand, roughness: 0.12, metalness: 0.6 },
  underbody: matte('#3b4047'),
  joint: matte('#2b3037'),
  magnet: metal(THEME.magnet, 0.42),
  magnetCore: matte('#474c54'),
  guidanceMagnet: metal('#9a6a3c', 0.45),
  eddyBrake: { ...metal('#4b4f55'), emissive: THEME.eddy, emissiveIntensity: 0 },
  skid: metal(THEME.skid),
  concrete: matte(THEME.concrete),
  concreteDark: matte('#8f8b83'),
  steel: metal('#8c949c', 0.4),
  stator: { color: THEME.stator, roughness: 0.55, metalness: 0.6 },
  guidanceRail: metal(THEME.guidanceRail, 0.35),
  slideStrip: metal('#b9bec4', 0.3),
  cable: matte('#2c2f33'),
  tray: metal('#7d848b'),
  platform: matte('#b9b4aa'),
  canopy: satin('#e8e8e6'),
  glass: {
    color: '#9fb8c8',
    roughness: 0.1,
    metalness: 0.3,
    transparent: true,
    opacity: GLASS_OPACITY,
  },
  ghost: veil(THEME.ghost, GHOST_OPACITY),
  insetPanel: { ...matte(THEME.inset), transparent: true, opacity: INSET_OPACITY },
  field: matte(THEME.ground),
  road: matte('#6d6d6a'),
  water: { color: '#6f8fa0', roughness: 0.2, metalness: 0.1 },
  building: matte('#cfc8bc'),
  roof: matte('#8a5a48'),
  tree: matte('#4f6b3a'),
  plinth: matte('#9a968e'),
  channel: matte('#a19d95'),
  coil: metal('#b07a45'),
  compareBody: satin('#c9d2da'),
  callout: glowing(THEME.insetLine),
  powered: glowing(THEME.powered),
} as const satisfies Record<string, MaterialFinish>;

export type Finish = keyof typeof FINISHES;

export const PART_FINISHES: Readonly<Record<PartId, Finish>> = {
  train: 'trainWhite',
  wrapArms: 'trainWhite',
  supportMagnets: 'magnet',
  guidanceMagnets: 'guidanceMagnet',
  eddyBrakes: 'eddyBrake',
  skids: 'skid',
  guideway: 'concrete',
  statorPacks: 'stator',
  guidanceRails: 'guidanceRail',
  feederCable: 'cable',
  piers: 'concrete',
  stations: 'platform',
  poweredSection: 'powered',
  travellingWave: 'powered',
  gapInset: 'insetPanel',
  powerFlow: 'powered',
  ghostTrain: 'ghost',
  scmaglev: 'compareBody',
  wheelRail: 'compareBody',
  gapCallouts: 'callout',
};
