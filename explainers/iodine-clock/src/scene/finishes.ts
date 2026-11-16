import { DoubleSide } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import type { ElementId } from '../ids';
import { ATOM_COLOURS, LIQUID_TINTS, THEME } from '../theme';
import { ACCENT, ATOM_LOOK, BENCH, GLASS, THERMOMETER_LOOK } from './constants';

const MATTE = 0.85;
const SATIN = 0.45;

function satin(color: string, roughness = SATIN): MaterialFinish {
  return { color, roughness, metalness: 0.05 };
}

function liquid(color: string, opacity: number): MaterialFinish {
  return { color, roughness: 0.05, metalness: 0, transparent: true, opacity, depthWrite: false };
}

function atom(element: ElementId): MaterialFinish {
  return { color: ATOM_COLOURS[element], roughness: ATOM_LOOK.roughness, metalness: 0.04 };
}

export const FINISHES = {
  glass: {
    color: GLASS.tint,
    roughness: 0.02,
    metalness: 0,
    transparent: true,
    opacity: GLASS.opacity,
    depthWrite: false,
    envMapIntensity: 1.6,
  },
  innerGlass: {
    color: GLASS.tint,
    roughness: 0.02,
    metalness: 0,
    transparent: true,
    opacity: GLASS.innerOpacity,
    depthWrite: false,
    envMapIntensity: 1.2,
  },
  mixture: liquid(LIQUID_TINTS.clear, LIQUID_TINTS.clearOpacity),
  solution: liquid(LIQUID_TINTS.clear, LIQUID_TINTS.clearOpacity * 1.6),
  stream: liquid('#dff1fa', 0.55),
  stirBar: satin('#f1f0ea', 0.36),
  stirBarBand: satin('#d9d7cf', 0.5),
  stirrerBody: { color: '#2a2f37', roughness: 0.5, metalness: 0.2 },
  stirrerPlate: satin('#8e949b', 0.45),
  knob: satin('#141619', 0.42),
  knobMark: satin('#e9ebee', 0.5),
  led: { color: ACCENT.led, emissive: ACCENT.led, emissiveIntensity: 1.6, roughness: 0.3 },
  rubber: { color: '#121316', roughness: MATTE, metalness: 0 },
  chrome: { color: '#d3d8de', roughness: 0.16, metalness: 1 },
  watchCase: { color: '#24272d', roughness: 0.38, metalness: 0.4 },
  hand: {
    color: ACCENT.hand,
    emissive: ACCENT.hand,
    emissiveIntensity: 0.25,
    roughness: 0.4,
    metalness: 0.1,
  },
  pin: { color: '#2b2e33', roughness: 0.3, metalness: 0.8 },
  alcohol: {
    color: THERMOMETER_LOOK.alcohol,
    emissive: THERMOMETER_LOOK.alcohol,
    emissiveIntensity: 0.35,
    roughness: 0.25,
    metalness: 0,
  },
  bond: satin(ATOM_LOOK.bond, 0.4),
  atomI: atom('I'),
  atomS: atom('S'),
  atomO: atom('O'),
  atomH: atom('H'),
  glucose: satin(THEME.amylose, 0.48),
  backbone: satin('#c8b585', 0.5),
  ribbon: {
    color: THEME.amylose,
    roughness: 0.6,
    metalness: 0,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    side: DoubleSide,
  },
  bridgeOxygen: atom('O'),
  benchTop: { color: BENCH.top, roughness: 0.86, metalness: 0, envMapIntensity: 0.25 },
  standLeg: { color: '#1b1d21', roughness: 0.5, metalness: 0.3 },
} as const satisfies Record<string, MaterialFinish>;

export type Finish = keyof typeof FINISHES;

export const ATOM_FINISH: Readonly<Record<ElementId, Finish>> = {
  I: 'atomI',
  S: 'atomS',
  O: 'atomO',
  H: 'atomH',
};
