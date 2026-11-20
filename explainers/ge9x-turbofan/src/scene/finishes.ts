import { DoubleSide } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { THEME } from '../theme';
import { LOOK } from './constants';

function cut(finish: MaterialFinish): MaterialFinish {
  return { ...finish, side: DoubleSide, forceSinglePass: true };
}

function metal(color: string, roughness: number, metalness = 0.85): MaterialFinish {
  return cut({ color, roughness, metalness });
}

export const PALETTE = {
  nacelleInner: '#cdd2d8',
  fanCaseInner: '#5b626b',
  liner: '#3c434b',
  spinner: '#17191d',
  guideVane: '#8a929b',
  splitter: '#c3c9cf',
  booster: '#7aa2d6',
  innerSpool: '#7aa2d6',
  outerSpool: '#d69a48',
  innerDrum: '#5f86b8',
  outerDrum: '#b07c3c',
  rotor: '#d69a48',
  stator: '#6c737b',
  casing: '#8d959e',
  casingDark: '#5d656e',
  fuelNozzle: '#c9a96e',
  hpTurbine: '#cf8d44',
  hptStator: '#77716b',
  lpTurbine: '#6f97cf',
  lptStator: '#6d7077',
  cowl: '#d9dde2',
  coldNozzle: '#b8bfc7',
  hotNozzle: '#8f867c',
  plug: '#7c7268',
  cascade: '#9aa3ac',
  door: '#d3d9de',
  pylon: '#dfe3e8',
  strut: '#6f7780',
  marker: '#ffffff',
  cavity: '#59606a',
} as const;

export const FINISHES = {
  nacelle: cut({
    color: THEME.nacelle,
    roughness: 0.2,
    metalness: 0.32,
    envMapIntensity: LOOK.envNacelle,
  }),
  nacelleInner: cut({ color: PALETTE.nacelleInner, roughness: 0.55, metalness: 0.1 }),
  nacelleCavity: cut({ color: PALETTE.cavity, roughness: 0.75, metalness: 0.1 }),
  intakeLip: cut({
    color: THEME.intakeLip,
    roughness: 0.2,
    metalness: 1,
    envMapIntensity: LOOK.envLip,
  }),
  fanCase: cut({ color: PALETTE.fanCaseInner, roughness: 0.6, metalness: 0.2 }),
  acousticLiner: { color: PALETTE.liner, roughness: 0.85, metalness: 0.1 },
  fanBlade: {
    color: THEME.composite,
    roughness: 0.26,
    metalness: 0.08,
    envMapIntensity: 1,
  },
  bladeEdge: { color: '#d9dee5', roughness: 0.12, metalness: 1, envMapIntensity: 1.8 },
  spinner: { color: PALETTE.spinner, roughness: 0.22, metalness: 0.4, envMapIntensity: 1.2 },
  spinnerMark: { color: THEME.spinnerMark, roughness: 0.4, metalness: 0, side: DoubleSide },
  fanHub: metal(PALETTE.innerDrum, 0.36, 0.9),
  guideVanes: metal(PALETTE.guideVane, 0.45),
  splitter: metal(PALETTE.splitter, 0.3),
  booster: metal(PALETTE.booster, 0.34, 0.6),
  boosterCasing: metal(PALETTE.casing, 0.45),
  compressorRotor: metal(PALETTE.rotor, 0.32, 0.6),
  compressorStator: metal(PALETTE.stator, 0.42),
  compressorCasing: metal(PALETTE.casing, 0.45),
  drum: metal(PALETTE.casing, 0.38),
  innerDrum: metal(PALETTE.innerDrum, 0.36, 0.6),
  outerDrum: metal(PALETTE.outerDrum, 0.36, 0.6),
  outerShaft: metal(PALETTE.outerSpool, 0.3, 0.65),
  innerShaft: metal(PALETTE.innerSpool, 0.3, 0.65),
  spinBand: { color: '#f4f1ea', roughness: 0.3, metalness: 0.2, emissive: '#3a3a3a' },
  diffuser: metal(PALETTE.casing, 0.4),
  fuelNozzles: metal(PALETTE.fuelNozzle, 0.3, 0.9),
  combustorLiner: cut({ color: THEME.linerCeramic, roughness: 0.82, metalness: 0 }),
  combustorCasing: metal(PALETTE.casingDark, 0.5),
  hpTurbine: metal(PALETTE.hpTurbine, 0.42, 0.6),
  hptStator: metal(PALETTE.hptStator, 0.5, 0.7),
  turbineCasing: metal(PALETTE.casingDark, 0.5),
  lpTurbine: metal(PALETTE.lpTurbine, 0.4, 0.6),
  lptStator: metal(PALETTE.lptStator, 0.48, 0.75),
  cowl: cut({ color: PALETTE.cowl, roughness: 0.35, metalness: 0.1, envMapIntensity: 1.1 }),
  cowlCavity: cut({ color: PALETTE.cavity, roughness: 0.75, metalness: 0.1 }),
  coldNozzle: metal(PALETTE.coldNozzle, 0.25, 0.9),
  hotNozzle: metal(PALETTE.hotNozzle, 0.4, 0.8),
  plug: metal(PALETTE.plug, 0.45, 0.8),
  strut: metal(PALETTE.strut, 0.45),
  bearing: metal(PALETTE.casingDark, 0.42),
  reverserSkin: cut({
    color: THEME.nacelle,
    roughness: 0.2,
    metalness: 0.32,
    envMapIntensity: LOOK.envNacelle,
  }),
  reverserInner: cut({ color: PALETTE.nacelleInner, roughness: 0.55, metalness: 0.1 }),
  blockerDoor: metal(PALETTE.door, 0.4, 0.5),
  actuator: metal('#3f4a57', 0.4, 0.7),
  actuatorRod: metal('#e2e6ea', 0.12, 1),
  cascades: metal(PALETTE.cascade, 0.5, 0.7),
  pylon: { color: PALETTE.pylon, roughness: 0.3, metalness: 0.15, envMapIntensity: 1.1 },
  pylonCap: { color: LOOK.cutCap, roughness: 0.6, metalness: 0.1 },
  person: { color: '#ffffff', vertexColors: true, roughness: 0.62, metalness: 0 },
  stand: { color: '#ffffff', vertexColors: true, roughness: 0.48, metalness: 0.35 },
  lod: { color: '#ffffff', roughness: 0.5, metalness: 0.6 },
} as const satisfies Record<string, MaterialFinish>;

export type Finish = keyof typeof FINISHES;
