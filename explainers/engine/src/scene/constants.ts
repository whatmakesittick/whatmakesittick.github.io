export const SCENE_UNITS_PER_MM = 0.1;

export const RENDER_ORDER = { gas: 1, overlay: 2 } as const;

export const CURVE_SEGMENTS = 48;
export const RADIAL_SEGMENTS = 48;
export const CREASE_ANGLE = Math.PI / 5;

export const PISTON = {
  pinToCrown: 32,
  skirtBelowPin: 28,
  wallClearance: 0.3,
  cavityWall: 5,
  crownThickness: 8,
  crownChamfer: 1,
  ringDepthsFromCrown: [5, 9.5, 14],
  grooveHeight: 1.6,
  grooveDepth: 1.6,
  ringInset: 0.15,
  pinRadius: 11,
  pinProtrusion: 0.1,
} as const;

export const ROD = {
  width: 22,
  webThickness: 8,
  smallEndRadius: 16,
  bigEndRadius: 32,
  shankHalfWidthTop: 9,
  shankHalfWidthBottom: 16,
  flangeWidth: 3.5,
  pocketMargin: 7,
  bevel: 1,
  boltRadius: 3.6,
  boltOffset: 25,
  boltLength: 44,
} as const;

export const CRANK = {
  mainJournalRadius: 26,
  pinRadius: 22,
  webThickness: 14,
  webPinBossRadius: 30,
  counterweightRadius: 62,
  counterweightHalfAngleDegrees: 72,
  throwGap: 1,
  noseLength: 26,
  openFrontStub: 18,
  bevel: 1.5,
} as const;

export const FLYWHEEL = {
  radius: 95,
  thickness: 22,
  toothCount: 96,
  toothDepth: 3.2,
  hubRadius: 32,
  hubThickness: 30,
  holeCount: 6,
  holeRadius: 12,
  holeCircleRadius: 58,
  boltCount: 6,
  boltCircleRadius: 22,
  boltRadius: 3.5,
  gap: 4,
  bevel: 1,
  markWidth: 4,
  markLength: 16,
} as const;

export const STRUCTURE = {
  singleHalfDepth: 64,
  cylinderSpacing: 96,
  endMargin: 16,
  wall: 8,
} as const;

export const BLOCK = {
  bottom: 72,
  halfWidth: 66,
  linerThickness: 6,
  gasketThickness: 1.6,
} as const;

export const CRANKCASE = {
  outerHalfWidth: 92,
  shoulderHeight: 24,
  bottom: -92,
  cornerRadius: 14,
  frontJournalClearance: 2,
} as const;

export const FLOOR_GAP = 8;

export const HEAD = {
  deckHeight: 58,
  halfWidth: 70,
  chamfer: 5,
  coverTop: 180,
  coverWall: 8,
  coverCornerRadius: 18,
} as const;

export const VALVE = {
  intakeRadiusPerBore: 0.2,
  exhaustRadiusPerBore: 0.175,
  offsetPerBore: 0.256,
  marginHeight: 1.5,
  seatWidth: 3,
  stemRadius: 3.5,
  tulipHeight: 14,
  seatWasherRadius: 13,
  seatWasherHeight: 1.5,
} as const;

export const VALVE_TRAIN = {
  springRestLength: 38,
  springMeanRadius: 11,
  springWireRadius: 1.8,
  springCoils: 6.5,
  retainerHeight: 5,
  retainerRadius: 12,
  tappetRadius: 11,
  tappetHeight: 15,
  rollerRadius: 5,
  rollerWidth: 10,
  camBaseRadius: 12,
  camLobeWidth: 14,
  camShaftRadius: 9,
  camJournalRadius: 13,
  camJournalWidth: 12,
  camProfileSamples: 360,
  camBevel: 0.6,
  camFrontOverhang: 9,
} as const;

export const PORT = {
  radiusPerValve: 0.87,
  wall: 3,
  exitHeight: 36,
  bendRise: 0.7,
  bendReach: 0.4,
  runnerLength: 40,
  pathSamples: 64,
  rimLift: 0.25,
  flangeThickness: 6,
  flangeHalfHeight: 21,
  flangeDepth: 24,
} as const;

export const SPARK_PLUG = {
  tipDrop: 1.6,
  electrodeRadius: 0.9,
  shellRadius: 5,
  shellTop: 18,
  hexRadius: 8,
  hexTop: 26,
  insulatorRadius: 4.5,
  insulatorTop: 78,
  ribCount: 5,
  ribDepth: 0.6,
  terminalRadius: 2.5,
  terminalTop: 86,
  groundWidth: 2,
  glowSize: 44,
} as const;

export const INJECTOR = {
  tipDrop: 1.2,
  nozzleRadius: 3,
  bodyRadius: 7.5,
  bodyTop: 70,
  collarRadius: 10,
  collarBottom: 60,
  collarHeight: 6,
  capRadius: 5,
  capTop: 84,
} as const;

export const GAS = {
  wallGap: 0.4,
  faceGap: 0.2,
  lightRange: 120,
  heatLightIntensity: 40,
  sparkLightIntensity: 25,
} as const;

export const FLOW = {
  particlesSingle: 70,
  particlesPerCylinderMulti: 40,
  particleWorldSize: 1.1,
  cylinderSpan: 0.75,
  degreesRate: 1 / 30,
  maxDegreesPerFrame: 8,
  openLiftFraction: 0.3,
  crossSectionFill: 0.65,
  frontReach: 0.25,
  chamberSpread: 0.6,
  fadeIn: 0.08,
  fadeOut: 0.14,
  crownMargin: 1,
  chamberTopFraction: 0.15,
  chamberDepthFraction: 0.8,
} as const;

export const SPRAY = {
  jets: 6,
  particlesPerJet: 18,
  particleWorldSize: 1.2,
  downwardDegrees: 16,
  reachPerBore: 0.46,
  spread: 0.08,
  degreesRate: 1 / 9,
  decayPerDegree: 0.12,
  crownMargin: 0.6,
} as const;

export const SPARK = {
  holdSeconds: 0.07,
  flickerMin: 0.65,
} as const;
