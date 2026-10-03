import { DoubleSide } from 'three';
import type { Texture } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { THEME } from '../theme';

export const PAINT = {
  hull: THEME.hull,
  deck: THEME.deck,
  panel: THEME.panel,
  jetBlack: THEME.jetBlack,
  glass: THEME.glass,
  section: THEME.section,
  inner: '#5b6065',
  pocket: '#262a2e',
  cap: '#eceeef',
  louvre: '#5d656d',
  dome: '#7d858d',
  ring: '#3d4349',
  foam: '#d8bf55',
  tub: '#aeb5bc',
  block: '#8f969d',
  head: '#23262a',
  manifold: '#3a3d42',
  exhaust: '#7a6656',
  tank: '#eef0ec',
  petrol: '#b98a34',
  box: '#3a3f46',
  router: '#e4e5e1',
  cable: '#17181a',
  hose: '#2a2d30',
  steel: '#c9ced3',
  rubber: '#141516',
  stator: '#3b3f44',
  bay: '#5a6168',
  bulkhead: '#454b51',
  missile: '#8f979e',
  rail: '#4a5157',
} as const;

const PAINT_REFLECTION = 0.9;
const METAL_REFLECTION = 1.6;
const GLASS_REFLECTION = 2.4;

function matte(color: string, roughness: number, metalness = 0): MaterialFinish {
  return { color, roughness, metalness, envMapIntensity: PAINT_REFLECTION };
}

function metal(color: string, roughness: number, metalness = 0.85): MaterialFinish {
  return { color, roughness, metalness, envMapIntensity: METAL_REFLECTION };
}

export const FINISHES = {
  inner: { ...matte(PAINT.inner, 0.85), side: DoubleSide },
  section: { ...matte(PAINT.section, 0.7), side: DoubleSide },
  pocket: matte(PAINT.pocket, 0.8),
  deckPlain: matte(PAINT.deck, 0.7, 0.05),
  cap: matte(PAINT.cap, 0.55),
  louvre: matte(PAINT.louvre, 0.7),
  dome: matte(PAINT.dome, 0.45),
  ring: matte(PAINT.ring, 0.6, 0.2),
  glass: { color: PAINT.glass, metalness: 0.3, roughness: 0.06, envMapIntensity: GLASS_REFLECTION },
  handle: metal(PAINT.steel, 0.3),
  foam: { ...matte(PAINT.foam, 0.95), side: DoubleSide },
  tub: { ...metal(PAINT.tub, 0.42, 0.75), side: DoubleSide },
  block: metal(PAINT.block, 0.38, 0.7),
  head: matte(PAINT.head, 0.5, 0.3),
  manifold: matte(PAINT.manifold, 0.55, 0.2),
  exhaust: metal(PAINT.exhaust, 0.5, 0.6),
  tank: {
    color: PAINT.tank,
    roughness: 0.55,
    metalness: 0,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    envMapIntensity: PAINT_REFLECTION,
  },
  petrol: {
    color: PAINT.petrol,
    roughness: 0.3,
    metalness: 0,
    transparent: true,
    opacity: 0.75,
    envMapIntensity: PAINT_REFLECTION,
  },
  box: matte(PAINT.box, 0.55, 0.3),
  router: matte(PAINT.router, 0.5),
  cable: matte(PAINT.cable, 0.6),
  hose: matte(PAINT.hose, 0.7),
  steel: metal(PAINT.steel, 0.24, 0.95),
  steelTwoSided: { ...metal(PAINT.steel, 0.24, 0.95), side: DoubleSide },
  rubber: matte(PAINT.rubber, 0.85),
  jetBlack: matte(PAINT.jetBlack, 0.55, 0.15),
  jetInside: { ...matte(PAINT.jetBlack, 0.7, 0.1), side: DoubleSide },
  jetTwoSided: { ...matte(PAINT.jetBlack, 0.55, 0.15), side: DoubleSide },
  stator: { ...matte(PAINT.stator, 0.5, 0.4), side: DoubleSide },
  bay: matte(PAINT.bay, 0.75),
  bulkhead: { ...matte(PAINT.bulkhead, 0.8), side: DoubleSide },
  missile: matte(PAINT.missile, 0.5, 0.2),
  rail: metal(PAINT.rail, 0.5, 0.6),
} as const satisfies Record<string, MaterialFinish>;

export interface BoatMaps {
  side: Texture;
  deck: Texture;
  cells: Texture;
  grain: Texture;
}

export interface BoatLooks {
  side: MaterialFinish;
  deck: MaterialFinish;
  panel: MaterialFinish;
  companionSide: MaterialFinish;
  companionDeck: MaterialFinish;
}

export function createBoatLooks(maps: BoatMaps): BoatLooks {
  const side = {
    color: PAINT.hull,
    map: maps.side,
    roughnessMap: maps.grain,
    roughness: 1,
    metalness: 0.05,
    envMapIntensity: PAINT_REFLECTION,
  };
  const deck = {
    color: PAINT.deck,
    map: maps.deck,
    roughnessMap: maps.grain,
    roughness: 1,
    metalness: 0.05,
    envMapIntensity: PAINT_REFLECTION,
  };
  return {
    side,
    deck,
    panel: { color: PAINT.panel, map: maps.cells, roughness: 0.42, metalness: 0.05 },
    companionSide: { ...side },
    companionDeck: { ...deck },
  };
}
