import { DoubleSide } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import type { ElementId } from '../ids';
import { ATOM_COLOURS, THEME } from '../theme';
import { LOOK } from './constants';

const CLAY = 0.78;

function clay(color: string, roughness = CLAY): MaterialFinish {
  return { color, roughness, metalness: 0 };
}

function wet(color: string): MaterialFinish {
  return { color, roughness: 0.32, metalness: 0 };
}

function veil(color: string, opacity: number): MaterialFinish {
  return { color, roughness: 0.2, metalness: 0, transparent: true, opacity, depthWrite: false };
}

function atom(element: ElementId): MaterialFinish {
  return { color: ATOM_COLOURS[element], roughness: 0.38, metalness: 0.05 };
}

export const ATOM_FINISH: Readonly<Record<ElementId, MaterialFinish>> = {
  C: atom('C'),
  O: atom('O'),
  H: atom('H'),
};

export const FINISHES = {
  skin: clay(THEME.skin, 0.7),
  cutFace: clay(LOOK.cutFace, 0.85),
  cutEdge: clay(LOOK.cutEdge),
  innerWall: wet(LOOK.innerWall),
  cavityBack: wet(LOOK.cavityBack),
  cavityAir: clay(THEME.cavityAir, 0.9),
  palate: wet(THEME.palate),
  shelf: wet(THEME.palate),
  tongue: wet(THEME.innerMouth),
  tongueSide: wet(LOOK.tongueBody),
  throat: wet(LOOK.innerWall),
  ear: clay(LOOK.ear, 0.75),
  lid: clay(LOOK.lid, 0.6),
  brow: clay(LOOK.brow, 0.9),
  blush: { ...veil(LOOK.blush, 0.35), roughness: 0.9 },
  steel: { color: LOOK.steel, roughness: 0.28, metalness: 0.95, side: DoubleSide },
  steelDark: { color: LOOK.steelDark, roughness: 0.35, metalness: 0.9 },
  iceCream: {
    color: '#ffffff',
    vertexColors: true,
    roughness: 0.72,
    metalness: 0,
    envMapIntensity: 0.35,
  },
  puddle: { color: LOOK.puddle, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.9 },
  smellPatch: { color: THEME.firing, roughness: 0.4, metalness: 0 },
  bulb: { color: LOOK.bulb, roughness: 0.5, metalness: 0 },
  fibre: clay(LOOK.nerveFibre, 0.6),
  clip: { color: LOOK.clip, roughness: 0.35, metalness: 0.05 },
  clipSpring: { color: LOOK.clipSpring, roughness: 0.25, metalness: 0.6 },
  tongueTop: clay(LOOK.tongueTop, 0.6),
  tongueBody: wet(LOOK.tongueBody),
  tongueCut: clay(LOOK.tongueCut, 0.8),
  papilla: clay(LOOK.tongueTop, 0.55),
  pore: { color: LOOK.tongueBody, roughness: 0.5, metalness: 0 },
  budCell: { color: LOOK.tongueCut, roughness: 0.5, metalness: 0 },
  budSweet: { color: LOOK.budCell, roughness: 0.45, metalness: 0 },
  budSour: { color: LOOK.budCell, roughness: 0.45, metalness: 0 },
  nerve: { color: LOOK.nerveFibre, roughness: 0.5, metalness: 0 },
  ice: {
    color: THEME.ice,
    emissive: THEME.frost,
    emissiveIntensity: 0.3,
    roughness: 0.05,
    metalness: 0,
    flatShading: true,
    transparent: true,
    opacity: 0.72,
    envMapIntensity: 1.6,
  },
  fat: { color: THEME.fat, roughness: 0.3, metalness: 0 },
  bubble: {
    color: '#ffffff',
    roughness: 0.04,
    metalness: 0,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    envMapIntensity: 2,
  },
  cherryBit: wet(THEME.cherryBits),
  receptor: { color: '#ffffff', roughness: 0.55, metalness: 0 },
  cilia: clay(LOOK.receptorOff, 0.6),
  neuronLit: { color: '#ffffff', vertexColors: true, roughness: 0.5, metalness: 0 },
  mucus: veil(LOOK.mucus, 0.16),
  bond: { color: '#cfd4db', roughness: 0.4, metalness: 0.1 },
} as const satisfies Record<string, MaterialFinish>;

export type Finish = keyof typeof FINISHES;
