import { DoubleSide } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { THEME } from '../../../theme';

const BLACK = '#000000';

function matte(color: string, roughness: number, metalness = 0): MaterialFinish {
  return { color, roughness, metalness, emissive: BLACK, emissiveIntensity: 1 };
}

const KIT = {
  skin: THEME.skin,
  singlet: THEME.singlet,
  sidePanel: '#c9ced3',
  shorts: THEME.shorts,
  waistband: '#1f2838',
  piping: '#d8dce1',
  sock: '#f1efe9',
  sockCuff: '#d4d1ca',
  cap: THEME.shorts,
  hair: '#2b2420',
  capLogo: '#f3f1ea',
  midsole: '#f3f1eb',
  outsole: '#2a2b2e',
  overlay: '#2e3237',
  laces: '#f4f2ec',
  collar: '#2b2f35',
  lens: '#3a2a20',
  frame: '#1d1f22',
  watchCase: '#2c2e31',
  watchGlass: '#101214',
  strap: '#1e2022',
} as const;

export const GARMENT = {
  singlet: 0,
  trimRight: 1,
  trimLeft: 2,
  sidePanel: 3,
  shorts: 4,
  waistband: 5,
  piping: 6,
  sock: 7,
  sockCuff: 8,
  hair: 9,
  cap: 10,
  capLogo: 11,
} as const;

const GARMENT_TONES: readonly (readonly [color: string, roughness: number])[] = [
  [KIT.singlet, 0.9],
  [THEME.rightAccent, 0.82],
  [THEME.leftAccent, 0.82],
  [KIT.sidePanel, 0.94],
  [KIT.shorts, 0.7],
  [KIT.waistband, 0.82],
  [KIT.piping, 0.8],
  [KIT.sock, 0.96],
  [KIT.sockCuff, 0.96],
  [KIT.hair, 0.72],
  [KIT.cap, 0.86],
  [KIT.capLogo, 0.7],
];

export const GARMENT_COLORS = GARMENT_TONES.map(([color]) => color);
export const GARMENT_ROUGHNESS = GARMENT_TONES.map(([, roughness]) => roughness);

export const SHOE_OVERLAY_COLORS = [KIT.overlay, KIT.overlay, KIT.laces, KIT.overlay, KIT.overlay];
export const SHOE_OVERLAY_ROUGHNESS = [0.82, 0.7, 0.78, 0.62, 0.72];

export const SKIN_FLUSH = [1, 0.78, 0.72] as const;

export const RUNNER_FINISHES = {
  skin: matte(KIT.skin, 0.6),
  midsole: matte(KIT.midsole, 0.86),
  outsole: matte(KIT.outsole, 0.92),
  upperRight: { ...matte(THEME.rightAccent, 0.84), side: DoubleSide },
  upperLeft: { ...matte(THEME.leftAccent, 0.84), side: DoubleSide },
  collar: matte(KIT.collar, 0.9),
  brim: matte(KIT.cap, 0.8),
  lens: { ...matte(KIT.lens, 0.12, 0.7), side: DoubleSide },
  frame: matte(KIT.frame, 0.45),
  watchCase: matte(KIT.watchCase, 0.38, 0.35),
  watchGlass: matte(KIT.watchGlass, 0.12, 0.2),
  strap: matte(KIT.strap, 0.62),
} as const satisfies Record<string, MaterialFinish>;

export type RunnerFinish = keyof typeof RUNNER_FINISHES;
