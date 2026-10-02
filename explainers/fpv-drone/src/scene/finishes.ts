import { AdditiveBlending, DoubleSide } from 'three';
import type { Texture } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { THEME } from '../theme';

export const PAINT = {
  carbon: THEME.carbon,
  carbonLight: THEME.carbonLight,
  olive: THEME.olive,
  oliveDark: THEME.oliveDark,
  aluminium: '#aab0b8',
  motorBase: THEME.motor,
  bell: '#111317',
  bellRing: '#c8452f',
  copper: '#b4703a',
  prop: THEME.prop,
  propHub: '#2a3024',
  lens: THEME.lens,
  lensRing: '#2a2f36',
  cameraBody: '#17191d',
  cameraDigital: '#2b2f35',
  rubber: '#202326',
  pcb: '#1f4d33',
  chip: '#0f1114',
  capacitor: '#2d3a4a',
  plug: '#f2c230',
  wireRed: '#b3262a',
  wireBlack: '#15171a',
  balance: '#e8e6dc',
  ceramic: '#d9d4c3',
  grass: THEME.grass,
  straw: THEME.straw,
  earth: THEME.earth,
  log: '#5a4330',
  logEnd: '#9a7b57',
  sandbag: '#8b7d5a',
  tripod: '#3b3f44',
  patch: '#d8dadb',
  hardCase: '#2a2e26',
  goggles: '#1e2126',
  gogglesLens: '#0c1016',
  radio: '#2d3136',
  pad: '#3b3d40',
  padMark: '#a9ad92',
  shedWall: '#7a6e58',
  shedRoof: '#4b4a48',
  shedDoor: '#3a3128',
  carRust: '#5c3b2a',
  carGlass: '#1d2328',
  tyre: '#1b1c1e',
  trunk: '#4a3a2c',
  conifer: THEME.tree,
  poplar: '#6b5d50',
} as const;

const PAINT_REFLECTION = 1.6;
const METAL_REFLECTION = 1.4;
const GLASS_REFLECTION = 2.4;
const GROUND_REFLECTION = 0.3;

function painted(color: string, roughness: number, metalness = 0.1): MaterialFinish {
  return { color, metalness, roughness, envMapIntensity: PAINT_REFLECTION };
}

function metal(color: string, roughness: number, metalness = 0.8): MaterialFinish {
  return { color, metalness, roughness, envMapIntensity: METAL_REFLECTION };
}

function matte(color: string, roughness = 0.9): MaterialFinish {
  return { color, metalness: 0, roughness, envMapIntensity: GROUND_REFLECTION };
}

export const FINISHES = {
  printed: painted(PAINT.olive, 0.72, 0.05),
  printedDark: painted(PAINT.oliveDark, 0.75, 0.05),
  aluminium: metal(PAINT.aluminium, 0.35),
  motorBase: metal(PAINT.motorBase, 0.4, 0.7),
  bellRing: painted(PAINT.bellRing, 0.45, 0.4),
  copper: metal(PAINT.copper, 0.5, 0.6),
  prop: painted(PAINT.prop, 0.5, 0.15),
  propHub: painted(PAINT.propHub, 0.55, 0.1),
  lens: { color: PAINT.lens, metalness: 0.5, roughness: 0.05, envMapIntensity: GLASS_REFLECTION },
  lensRing: metal(PAINT.lensRing, 0.4, 0.6),
  cameraBody: painted(PAINT.cameraBody, 0.55, 0.3),
  cameraDigital: painted(PAINT.cameraDigital, 0.5, 0.35),
  rubber: matte(PAINT.rubber, 0.95),
  shrink: painted(PAINT.oliveDark, 0.4, 0.05),
  pcb: painted(PAINT.pcb, 0.5, 0.1),
  chip: painted(PAINT.chip, 0.4, 0.2),
  capacitor: metal(PAINT.capacitor, 0.35, 0.6),
  plug: painted(PAINT.plug, 0.45, 0.05),
  wireRed: painted(PAINT.wireRed, 0.6, 0.05),
  wireBlack: painted(PAINT.wireBlack, 0.6, 0.05),
  balance: painted(PAINT.balance, 0.6, 0.02),
  ceramic: painted(PAINT.ceramic, 0.6, 0.02),
} as const satisfies Record<string, MaterialFinish>;

export const WORLD_FINISHES = {
  outerField: matte(PAINT.grass, 0.95),
  road: {
    ...matte(PAINT.earth, 0.95),
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  },
  log: matte(PAINT.log, 0.9),
  logEnd: matte(PAINT.logEnd, 0.85),
  sandbag: matte(PAINT.sandbag, 0.95),
  tripod: metal(PAINT.tripod, 0.45, 0.6),
  patch: painted(PAINT.patch, 0.5, 0.1),
  hardCase: painted(PAINT.hardCase, 0.7, 0.05),
  goggles: painted(PAINT.goggles, 0.45, 0.2),
  gogglesLens: { color: PAINT.gogglesLens, metalness: 0.4, roughness: 0.1, envMapIntensity: 2 },
  radio: painted(PAINT.radio, 0.55, 0.2),
  pad: matte(PAINT.pad, 0.85),
  padMark: {
    ...matte(PAINT.padMark, 0.8),
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  },
  shedWall: matte(PAINT.shedWall, 0.9),
  shedRoof: metal(PAINT.shedRoof, 0.6, 0.4),
  shedDoor: matte(PAINT.shedDoor, 0.9),
  carRust: matte(PAINT.carRust, 0.95),
  carGlass: { color: PAINT.carGlass, metalness: 0.3, roughness: 0.3, envMapIntensity: 1.2 },
  tyre: matte(PAINT.tyre, 0.95),
  trunk: matte(PAINT.trunk, 0.9),
  conifer: matte(PAINT.conifer, 0.95),
  poplar: matte(PAINT.poplar, 0.9),
} as const satisfies Record<string, MaterialFinish>;

export const GLOW_SPRITE = {
  transparent: true,
  blending: AdditiveBlending,
  depthWrite: false,
  toneMapped: false,
} as const;

export const ARROW_PLANE = {
  transparent: true,
  depthWrite: false,
  side: DoubleSide,
  toneMapped: false,
} as const;

export interface DroneLooks {
  carbon: MaterialFinish;
  bell: MaterialFinish;
}

export function carbonFinish(map: Texture): MaterialFinish {
  return {
    color: PAINT.carbonLight,
    map,
    metalness: 0.45,
    roughness: 0.38,
    envMapIntensity: PAINT_REFLECTION,
  };
}

export function bellFinish(map: Texture): MaterialFinish {
  return {
    color: PAINT.bell,
    map,
    metalness: 0.7,
    roughness: 0.4,
    envMapIntensity: METAL_REFLECTION,
  };
}

export function fieldFinish(map: Texture): MaterialFinish {
  return {
    color: '#ffffff',
    map,
    vertexColors: true,
    metalness: 0,
    roughness: 0.96,
    envMapIntensity: GROUND_REFLECTION,
  };
}

export function roadFinish(map: Texture): MaterialFinish {
  return { ...WORLD_FINISHES.road, map };
}
