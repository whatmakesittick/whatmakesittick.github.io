import { DoubleSide } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import type { PartId } from '../ids';
import { THEME } from '../theme';

const MATTE = 0.92;
const SATIN = 0.55;
const METAL = 0.65;
const GLOW = 1.4;
const GLASS_OPACITY = 0.35;
const INSET_OPACITY = 0.92;

function matte(color: string): MaterialFinish {
  return { color, roughness: MATTE };
}

function satin(color: string): MaterialFinish {
  return { color, roughness: SATIN, metalness: 0.1 };
}

function metal(color: string, roughness = SATIN): MaterialFinish {
  return { color, roughness, metalness: METAL };
}

function glowing(color: string, intensity = GLOW): MaterialFinish {
  return { color, emissive: color, emissiveIntensity: intensity, roughness: MATTE };
}

export const FINISHES = {
  grass: matte(THEME.ground),
  road: matte(THEME.road),
  gravel: matte('#9b978e'),
  concrete: matte(THEME.concrete),
  concreteDark: matte('#8a867e'),
  fence: metal('#9aa1a8', 0.45),
  steel: metal(THEME.steel, 0.5),
  steelLight: metal('#b4bbc2', 0.45),
  steelDark: metal('#5d646c', 0.55),
  cladding: satin('#9aa2aa'),
  roof: matte('#b9bcbe'),
  insulator: satin('#7b6a5c'),
  transformer: satin('#7c8a86'),
  conductor: metal('#c4c8cc', 0.35),
  genset: satin('#d7d4c8'),
  cabinet: satin('#c9ccd0'),
  battery: satin('#3f454c'),
  busway: metal('#a7adb4', 0.4),
  darkRack: satin(THEME.rack),
  rackDoor: metal('#2d3238', 0.6),
  copper: metal(THEME.copper, 0.35),
  tray: metal('#6f7780', 0.5),
  traySteel: metal('#aeb5bc', 0.4),
  fan: matte('#1c1f23'),
  cable: matte('#2a2d31'),
  coil: metal('#9ea6ad', 0.6),
  pipeSupply: satin(THEME.coolantSupply),
  pipeReturn: satin(THEME.coolantReturn),
  pipeInsulated: matte('#d9dcdf'),
  glass: {
    color: '#9fb8c8',
    roughness: 0.1,
    metalness: 0.3,
    transparent: true,
    opacity: GLASS_OPACITY,
    depthWrite: false,
    side: DoubleSide,
  },
  insetPanel: { ...matte(THEME.inset), transparent: true, opacity: INSET_OPACITY },
  insetLine: glowing(THEME.insetLine, 0.6),
  desk: satin('#b8a284'),
  laptop: metal('#c3c7cc', 0.35),
  statusLight: glowing(THEME.statusLight),
  fibre: glowing(THEME.packet, 0.8),
  current: glowing(THEME.current, 2),
  heat: glowing(THEME.heat, 2),
} as const satisfies Record<string, MaterialFinish>;

export type Finish = keyof typeof FINISHES;

export const PART_FINISHES: Readonly<Record<PartId, Finish>> = {
  gridLine: 'conductor',
  substation: 'gravel',
  transformers: 'transformer',
  generators: 'genset',
  switchgear: 'cabinet',
  ups: 'cabinet',
  batteries: 'battery',
  busway: 'busway',
  hall: 'cladding',
  racks: 'darkRack',
  subjectRack: 'darkRack',
  powerShelves: 'traySteel',
  busbar: 'copper',
  computeTrays: 'tray',
  switchTrays: 'steelDark',
  trayFans: 'fan',
  chipInset: 'insetPanel',
  manifold: 'pipeReturn',
  cdu: 'steelLight',
  facilityPipes: 'pipeInsulated',
  chiller: 'steelLight',
  dryCoolers: 'coil',
  airHandlers: 'steelLight',
  fibreEntry: 'fibre',
  spineSwitches: 'darkRack',
  leafSwitches: 'darkRack',
  joule: 'current',
  laptop: 'laptop',
};
