import { clamp, lerp } from '@core/math';

export const BAND_GAP_EV = 1.12;
export const PLANCK_EV_NM = 1239.84;
export const BAND_GAP_NM = PLANCK_EV_NM / BAND_GAP_EV;
export const ELEMENTARY_CHARGE_C = 1.602e-19;

export function photonEnergyEv(wavelengthNm: number): number {
  return PLANCK_EV_NM / wavelengthNm;
}

export function excessEnergyEv(wavelengthNm: number): number {
  return Math.max(0, photonEnergyEv(wavelengthNm) - BAND_GAP_EV);
}

export function passesThrough(wavelengthNm: number): boolean {
  return wavelengthNm > BAND_GAP_NM;
}

export type WavelengthDepth = readonly [wavelengthNm: number, depthUm: number];

export const ABSORPTION_DEPTH_UM: readonly WavelengthDepth[] = [
  [300, 0.006],
  [400, 0.105],
  [500, 0.9],
  [600, 2.4],
  [680, 4.5],
  [800, 11.8],
  [1000, 156],
  [1100, 2900],
];

export function absorptionDepthUm(wavelengthNm: number): number {
  const table = ABSORPTION_DEPTH_UM;
  const first = table[0];
  const last = table[table.length - 1];
  if (wavelengthNm <= first[0]) return first[1];
  if (wavelengthNm >= last[0]) return last[1];
  for (let index = 1; index < table.length; index += 1) {
    const [toNm, toDepth] = table[index];
    if (wavelengthNm <= toNm) {
      const [fromNm, fromDepth] = table[index - 1];
      const share = (wavelengthNm - fromNm) / (toNm - fromNm);
      return Math.exp(lerp(Math.log(fromDepth), Math.log(toDepth), share));
    }
  }
  return last[1];
}

export function absorbedShare(wavelengthNm: number, thicknessUm: number): number {
  if (passesThrough(wavelengthNm)) return 0;
  return 1 - Math.exp(-thicknessUm / absorptionDepthUm(wavelengthNm));
}

export const SPECTRUM_START_NM = 300;
export const SPECTRUM_STEP_NM = 20;

export const AM15G_SPECTRUM: readonly number[] = [
  0.076, 0.3736, 0.5037, 0.6595, 0.6922, 1.1779, 1.1938, 1.4892, 1.569, 1.5491, 1.5165, 1.5393,
  1.5272, 1.4955, 1.4722, 1.4648, 1.4258, 1.3902, 1.406, 1.2752, 1.2467, 1.1375, 1.2078, 0.9465,
  1.1209, 1.0005, 0.9386, 0.9761, 0.9536, 0.8578, 0.6842, 0.4804, 0.3466, 0.5749, 0.7295, 0.717,
  0.6869, 0.6537, 0.6139, 0.5582, 0.3542, 0.1495, 0.2239, 0.4174, 0.4316, 0.4389, 0.4608, 0.4513,
  0.3955, 0.4057, 0.3303, 0.2208, 0.0453, 0.0001, 0.0002,
];

export const SPECTRUM_END_NM = SPECTRUM_START_NM + SPECTRUM_STEP_NM * AM15G_SPECTRUM.length;
export const AM15G_TOTAL_W_M2 = 1000.4;

export const SPECTRUM_SHARES = {
  ultraviolet: 0.046,
  visible: 0.428,
  nearInfrared: 0.331,
  belowGap: 0.192,
  belowGapPhotons: 0.365,
  thermalised: 0.317,
  usable: 0.49,
} as const;

export function spectralIrradiance(wavelengthNm: number): number {
  const position = (wavelengthNm - SPECTRUM_START_NM) / SPECTRUM_STEP_NM;
  const index = Math.floor(position);
  if (index < 0 || index >= AM15G_SPECTRUM.length) return 0;
  return AM15G_SPECTRUM[index];
}

export function spectralShare(fromNm: number, toNm: number): number {
  let sum = 0;
  for (let nm = fromNm; nm < toNm; nm += SPECTRUM_STEP_NM) {
    sum += spectralIrradiance(nm) * SPECTRUM_STEP_NM;
  }
  return sum / AM15G_TOTAL_W_M2;
}

export const BAND_IDS = [
  'ultraviolet',
  'violet',
  'blue',
  'green',
  'yellow',
  'orange',
  'red',
  'nearInfrared',
  'infrared',
] as const;

export type BandId = (typeof BAND_IDS)[number];

const BAND_UPPER_NM: readonly (readonly [BandId, number])[] = [
  ['ultraviolet', 400],
  ['violet', 450],
  ['blue', 495],
  ['green', 570],
  ['yellow', 590],
  ['orange', 620],
  ['red', 700],
  ['nearInfrared', BAND_GAP_NM],
];

export function bandOf(wavelengthNm: number): BandId {
  const found = BAND_UPPER_NM.find(([, upper]) => wavelengthNm < upper);
  return found ? found[0] : 'infrared';
}

export type Rgb = readonly [r: number, g: number, b: number];

const VISIBLE = { start: 380, end: 700 } as const;
const INFRARED_FADE_NM = 1100;
const ULTRAVIOLET_RGB: Rgb = [0.55, 0.2, 0.95];
const INFRARED_RGB: Rgb = [0.45, 0.1, 0.05];
const DEEP_RED_RGB: Rgb = [0.85, 0.12, 0.08];

function visibleRgb(wavelengthNm: number): Rgb {
  const nm = clamp(wavelengthNm, VISIBLE.start, VISIBLE.end);
  if (nm < 440) return [lerp(0.6, 0.3, (nm - 380) / 60), 0.1, 1];
  if (nm < 490) return [0.1, lerp(0.2, 1, (nm - 440) / 50), 1];
  if (nm < 510) return [0.1, 1, lerp(1, 0.2, (nm - 490) / 20)];
  if (nm < 580) return [lerp(0.1, 1, (nm - 510) / 70), 1, 0.15];
  if (nm < 645) return [1, lerp(1, 0.3, (nm - 580) / 65), 0.1];
  return [
    1,
    lerp(0.3, DEEP_RED_RGB[1], (nm - 645) / 55),
    lerp(0.1, DEEP_RED_RGB[2], (nm - 645) / 55),
  ];
}

export function wavelengthColor(wavelengthNm: number): Rgb {
  if (wavelengthNm < VISIBLE.start) return ULTRAVIOLET_RGB;
  if (wavelengthNm <= VISIBLE.end) return visibleRgb(wavelengthNm);
  const share = clamp((wavelengthNm - VISIBLE.end) / (INFRARED_FADE_NM - VISIBLE.end), 0, 1);
  return [
    lerp(DEEP_RED_RGB[0], INFRARED_RGB[0], share),
    lerp(DEEP_RED_RGB[1], INFRARED_RGB[1], share),
    lerp(DEEP_RED_RGB[2], INFRARED_RGB[2], share),
  ];
}

export function pairsPerSecond(currentA: number): number {
  return currentA / ELEMENTARY_CHARGE_C;
}
