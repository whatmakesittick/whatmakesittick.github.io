export const MACHINE_FACTS = { tonnes: 150, crates: 250, containers: 43, trucks: 20 } as const;

export const LIGHT_FACTS = {
  dropletLowUm: 20,
  dropletHighUm: 30,
  speedLowMs: 60,
  speedHighMs: 120,
  spacingLowMm: 1.2,
  spacingHighMm: 2.4,
  flattenedUm: 100,
  plasmaCelsius: 220_000,
  plasmaSunLow: 30,
  plasmaSunHigh: 40,
  conversionPercent: 5,
} as const;

export const MIRROR_FACTS = {
  layers: 100,
  reflectPercent: 70,
  roughnessPm: 50,
  airPercent: 0.14,
  glassPercent: 0.004,
} as const;

export const MASK_FACTS = {
  pellicleOnePass: 0.9,
  tiltPasses: 2,
} as const;

export const SCAN_FACTS = {
  fieldsLow: 76,
  fieldsHigh: 80,
  sensingPm: 60,
  sensingPerSecond: 20_000,
  overlayNm: { nxe3600d: 1.1, nxe3800e: 0.9, exe5000: 1.1 },
} as const;

export const COMPARE_FACTS = {
  duvLowNm: 36,
  duvHighNm: 38,
  photonEv: 91.8,
  photonTimes: 14,
} as const;
