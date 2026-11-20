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
  booster: '#b9c0c8',
  rotor: '#c8ced5',
  stator: '#7f8994',
  casing: '#8d959e',
  casingDark: '#5d656e',
  fuelNozzle: '#c9a96e',
  hpTurbine: '#a99a88',
  hptStator: '#8f8378',
  lpTurbine: '#9a9590',
  lptStator: '#7c7975',
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
    roughness: 0.14,
    metalness: 1,
    envMapIntensity: LOOK.envLip,
  }),
  fanCase: cut({ color: PALETTE.fanCaseInner, roughness: 0.6, metalness: 0.2 }),
  acousticLiner: { color: PALETTE.liner, roughness: 0.85, metalness: 0.1 },
  fanBlade: {
    color: THEME.composite,
    roughness: 0.36,
    metalness: 0.05,
    envMapIntensity: 0.65,
  },
  bladeEdge: { color: '#dde2e8', roughness: 0.18, metalness: 1, envMapIntensity: 1.6 },
  spinner: { color: PALETTE.spinner, roughness: 0.22, metalness: 0.4, envMapIntensity: 1.2 },
  spinnerMark: { color: THEME.spinnerMark, roughness: 0.4, metalness: 0, side: DoubleSide },
  fanHub: metal(PALETTE.casingDark, 0.4),
  guideVanes: metal(PALETTE.guideVane, 0.45),
  splitter: metal(PALETTE.splitter, 0.3),
  booster: metal(PALETTE.booster, 0.32),
  boosterCasing: metal(PALETTE.casing, 0.45),
  compressorRotor: metal(PALETTE.rotor, 0.28),
  compressorStator: metal(PALETTE.stator, 0.42),
  compressorCasing: metal(PALETTE.casing, 0.45),
  drum: metal(PALETTE.casing, 0.38),
  outerShaft: metal(THEME.shaftOuter, 0.32),
  innerShaft: metal(THEME.shaftInner, 0.32),
  spinBand: { color: '#f4f1ea', roughness: 0.3, metalness: 0.2, emissive: '#3a3a3a' },
  diffuser: metal(PALETTE.casing, 0.4),
  fuelNozzles: metal(PALETTE.fuelNozzle, 0.3, 0.9),
  combustorLiner: cut({ color: THEME.linerCeramic, roughness: 0.82, metalness: 0 }),
  combustorCasing: metal(PALETTE.casingDark, 0.5),
  hpTurbine: metal(PALETTE.hpTurbine, 0.45, 0.7),
  hptStator: metal(PALETTE.hptStator, 0.5, 0.7),
  turbineCasing: metal(PALETTE.casingDark, 0.5),
  lpTurbine: metal(PALETTE.lpTurbine, 0.42, 0.75),
  lptStator: metal(PALETTE.lptStator, 0.48, 0.75),
  cowl: cut({ color: PALETTE.cowl, roughness: 0.35, metalness: 0.1, envMapIntensity: 1.1 }),
  cowlCavity: cut({ color: PALETTE.cavity, roughness: 0.75, metalness: 0.1 }),
  coldNozzle: metal(PALETTE.coldNozzle, 0.25, 0.9),
  hotNozzle: metal(PALETTE.hotNozzle, 0.4, 0.8),
  plug: metal(PALETTE.plug, 0.45, 0.8),
  strut: metal(PALETTE.strut, 0.45),
  reverserSkin: cut({
    color: THEME.nacelle,
    roughness: 0.2,
    metalness: 0.32,
    envMapIntensity: LOOK.envNacelle,
  }),
  reverserInner: cut({ color: PALETTE.nacelleInner, roughness: 0.55, metalness: 0.1 }),
  blockerDoor: metal(PALETTE.door, 0.4, 0.5),
  cascades: metal(PALETTE.cascade, 0.5, 0.7),
  pylon: { color: PALETTE.pylon, roughness: 0.3, metalness: 0.15, envMapIntensity: 1.1 },
  pylonCap: { color: LOOK.cutCap, roughness: 0.6, metalness: 0.1 },
  person: { color: '#ffffff', vertexColors: true, roughness: 0.62, metalness: 0 },
  lod: { color: '#ffffff', roughness: 0.5, metalness: 0.6 },
} as const satisfies Record<string, MaterialFinish>;

export type Finish = keyof typeof FINISHES;
