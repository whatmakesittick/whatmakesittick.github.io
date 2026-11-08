import { CASE, PLATE, SOUNDBOARD, STRINGS, TUNING_PINS } from '../../../model';

export const STRING_RADIUS = { steel: 0.0008, tenor: 0.0009, core: 0.0009, wound: 0.002 } as const;

export const WINDING = { frontGap: 0.006, pitch: 0.004 } as const;

export const TUNING_PIN = {
  rows: 4,
  radius: 0.0035,
  hole: 0.0052,
  spacing: 0.0115,
  clearance: 0.015,
  bottom: 0.83,
  top: PLATE.topY + 0.012,
} as const;

export const PINBLOCK = {
  frontZ: -0.1,
  backZ: TUNING_PINS.backZ - 0.012,
  bottom: 0.8,
  top: 0.866,
} as const;

export const PLATE_PLAN = {
  gap: 0.006,
  frontZ: -0.1,
  webClearance: 0.006,
  bandWidth: 0.026,
  wallFrontZ: SOUNDBOARD.bellyRailZ,
  stringClearance: 0.012,
  hitchBehind: 0.02,
} as const;

export const PLATE_LEVELS = {
  webBottom: PLATE.topY - PLATE.thickness,
  top: PLATE.topY,
  floorBottom: 0.852,
  floorTop: 0.87,
  strutBottom: 0.925,
} as const;

export const STRUT = { width: 0.024, webOverlap: 0.03 } as const;

export const BREAK_KEYS = { tenor: STRINGS.tenorTopKey, treble: 70 } as const;

export const BRIDGE_PLAN = {
  frontShare: { bass: 0.75, tenor: 0.6, treble: 0.15 },
  overhang: 0.01,
  smoothing: 3,
  floorGap: 0.0015,
  boardMargin: 0.002,
  mainSamples: 72,
  bassSamples: 20,
} as const;

export const BRIDGE_PIN = { radius: 0.0012, rise: 0.007, sink: 0.004, stagger: 0.012 } as const;

export const HITCH_PIN = { radius: 0.0025, rise: 0.008 } as const;

export const BOARD = {
  edgeThickness: SOUNDBOARD.edgeThickness,
  centreThickness: SOUNDBOARD.centreThickness,
  steinerStep: 0.07,
  ribWidth: 0.022,
  ribHeight: 0.022,
  ribInset: 0.014,
} as const;

export const BELLY_RAIL = { depth: 0.06, bottom: 0.72 } as const;

export const RIM_INNER = CASE.rimThickness;
