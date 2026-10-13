import { DoubleSide } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import type { PartId } from '../ids';
import { THEME } from '../theme';

const MATTE = 0.85;
const SATIN = 0.45;
const POLISHED = 0.22;
const METAL = 0.85;

function matte(color: string): MaterialFinish {
  return { color, roughness: MATTE, metalness: 0 };
}

function satin(color: string, roughness = SATIN): MaterialFinish {
  return { color, roughness, metalness: 0.05 };
}

function metal(color: string, roughness = SATIN): MaterialFinish {
  return { color, roughness, metalness: METAL };
}

function rim(color: string): MaterialFinish {
  return { color, emissive: color, emissiveIntensity: 0, roughness: SATIN, metalness: 0.1 };
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
  housing: satin(THEME.housing, 0.42),
  plastic: satin(THEME.plastic, 0.62),
  grip: matte('#232529'),
  rubber: matte('#1d1f22'),
  alloy: metal('#b4b9bf', 0.5),
  castAlloy: metal('#9da3aa', 0.62),
  magnesium: metal('#7f868e', 0.55),
  steel: metal('#959ca3', 0.32),
  darkSteel: metal('#5d636a', 0.38),
  bar: metal(THEME.barSteel, 0.28),
  barNose: metal('#7f868d', 0.3),
  chain: metal(THEME.chainSteel, 0.26),
  driveLink: metal('#a8afb5', 0.3),
  cutter: { color: THEME.cutterChrome, roughness: POLISHED - 0.08, metalness: 1 },
  depthGauge: metal(THEME.depthGauge, 0.42),
  muffler: metal('#474b51', 0.6),
  ceramic: { color: '#efece4', roughness: 0.32, metalness: 0 },
  plugBoot: satin('#6e2a24', 0.6),
  brass: metal('#c9a54a', 0.32),
  felt: matte('#d6cfbd'),
  lining: matte('#4f3d30'),
  fuelLine: { color: THEME.fuel, roughness: 0.35, metalness: 0, transparent: true, opacity: 0.88 },
  pulseLine: satin('#4f7395', 0.4),
  oilCap: satin(THEME.barOil, 0.4),
  duct: veil(THEME.scavenge, 0.28),
  exhaustRim: rim(THEME.exhaust),
  transferRim: rim(THEME.scavenge),
  intakeRim: rim(THEME.compression),
  band: metal('#6b7178', 0.42),
  bandOn: {
    color: THEME.brake,
    emissive: THEME.brake,
    emissiveIntensity: 0.55,
    roughness: 0.45,
    metalness: 0.3,
  },
  zone: {
    color: THEME.zone,
    emissive: THEME.zone,
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    side: DoubleSide,
    roughness: SATIN,
  },
  bark: matte(THEME.bark),
  wood: { color: THEME.wood, roughness: 0.78, metalness: 0 },
  woodRing: matte('#a9834f'),
  chip: { color: THEME.wood, roughness: 0.8, metalness: 0, side: DoubleSide },
} as const satisfies Record<string, MaterialFinish>;

export type Finish = keyof typeof FINISHES;

export const PART_FINISHES: Readonly<Record<PartId, Finish>> = {
  powerhead: 'housing',
  rearHandle: 'plastic',
  throttleTrigger: 'grip',
  frontHandle: 'grip',
  handGuard: 'grip',
  starter: 'housing',
  sparkPlug: 'ceramic',
  cylinder: 'alloy',
  piston: 'alloy',
  connectingRod: 'steel',
  crankshaft: 'darkSteel',
  crankcase: 'magnesium',
  exhaustPort: 'exhaustRim',
  transferPorts: 'transferRim',
  intakePort: 'intakeRim',
  muffler: 'muffler',
  carburettor: 'castAlloy',
  throttleValve: 'brass',
  chokeValve: 'brass',
  airFilter: 'felt',
  fuelTank: 'plastic',
  pulseLine: 'pulseLine',
  clutch: 'steel',
  clutchDrum: 'darkSteel',
  sprocket: 'steel',
  chainBrakeBand: 'band',
  oilPump: 'castAlloy',
  oilTank: 'plastic',
  bar: 'bar',
  barNose: 'barNose',
  chain: 'chain',
  cutters: 'cutter',
  depthGauges: 'depthGauge',
  driveLinks: 'driveLink',
  chainCatcher: 'castAlloy',
  kickbackZone: 'zone',
  freshCharge: 'duct',
  exhaustGas: 'muffler',
  oilFlow: 'oilCap',
  log: 'bark',
  chips: 'chip',
  fuelCap: 'plastic',
  oilCap: 'oilCap',
  starterGrip: 'grip',
  starterRope: 'felt',
  starterPulley: 'plastic',
  pawls: 'steel',
  flywheel: 'castAlloy',
  ignitionCoil: 'darkSteel',
  primerBulb: 'duct',
  chokeLever: 'grip',
  decompressionValve: 'steel',
};
