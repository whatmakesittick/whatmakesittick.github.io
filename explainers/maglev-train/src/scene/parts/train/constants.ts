import { GUIDANCE_RAIL, GUIDEWAY_TOP, MAGNETS, SKIDS, STATOR, TRAIN, mm } from '../../../model';

export const BODY = {
  floorY: TRAIN.bodyBottom,
  roofY: TRAIN.roof,
  halfWidth: TRAIN.width / 2,
  floorEdgeZ: 1.7,
  seamZ: 1.79,
  seamY: TRAIN.bodyBottom + 0.075,
  bandBottom: 11.72,
  bandTop: 12.56,
  bandTopZ: 1.835,
  crownZ: 0.95,
} as const;

export const CONTOUR_CELLS = {
  floor: 3,
  corner: 3,
  lowerSide: 6,
  band: 3,
  shoulder: 14,
} as const;

export const NOSE = {
  tipTop: 11.5,
  tipBottom: 10.72,
  roofLength: 8.2,
  roofPower: 1.55,
  floorLength: 1.1,
  floorPower: 2,
  widthLengthLow: 1.1,
  widthLengthHigh: 6.6,
  widthCurve: 2.4,
  widthPower: 2,
  stations: 44,
  stationCurve: 2,
  lightBelly: 1.7,
  bellyLength: 1.1,
  bellyLift: 0.6,
  bellyFocus: 3,
} as const;

export const NOSE_REACH = Math.max(NOSE.roofLength, NOSE.widthLengthHigh);

export const JOINT = {
  halfGap: 0.11,
  edgeRadius: 0.1,
  edgeStations: [0, 0.008, 0.025, 0.05, 0.1],
  bellowsInset: 0.1,
  bellowsDepth: 0.035,
  bellowsFolds: 4,
  bellowsStationsPerFold: 4,
} as const;

export const WINDSCREEN = {
  bandEnd: 6.0,
  rearLow: 6.15,
  rearHigh: 4.9,
  frontLow: 1.7,
  frontHigh: 2.7,
  frameInset: 0.06,
  frameRows: 0.6,
  frameLift: mm(3),
  glassLift: mm(6),
  columns: 18,
  rows: 22,
} as const;

export const PANE = {
  width: 1.04,
  height: 0.6,
  radius: 0.13,
  lift: mm(5),
  curveSegments: 3,
  noseClearance: 7.0,
} as const;

export const DOOR = {
  width: 1.2,
  bottom: TRAIN.bodyBottom + 0.3,
  top: 12.82,
  radius: 0.16,
  line: 0.028,
  lift: mm(4),
  windowWidth: 0.62,
  frontSlotFromNose: 4,
  rearSlot: 1,
  frameSamples: 64,
} as const;

export const ROOF_FAIRING = {
  length: 5.2,
  width: 1.5,
  height: 0.17,
  sink: 0.03,
  endShare: 0.42,
  segments: 28,
  rings: 7,
} as const;

const SKIRT_TOP = TRAIN.bodyBottom + 0.01;

export const SKIRT = {
  outerZ: BODY.seamZ,
  innerZ: MAGNETS.guidance.faceZ + MAGNETS.guidance.depth,
  top: SKIRT_TOP,
  bottom: 9.8,
  notchBottom: GUIDEWAY_TOP - 0.04,
  notchHalfLength: 0.62,
  outerRadius: 0.05,
  bevel: 0.025,
  noseRadius: 0.32,
} as const;

export const ARM = {
  length: 0.5,
  bottom: TRAIN.armBottom,
  footInnerZ: 1.04,
  frameTop: MAGNETS.support.top - MAGNETS.support.height,
  frameOuterZ: STATOR.sideZ + 0.1,
  stepY: GUIDANCE_RAIL.centreY - GUIDANCE_RAIL.height / 2 - 0.025,
  cornerRadius: 0.09,
  tipRadius: 0.035,
  bevel: 0.02,
  overlap: 0.08,
} as const;

export const MAGNET_MODULE = {
  gap: 0.05,
  poles: 12,
  coilShare: 0.74,
  poleFace: 0.035,
  spineShare: 0.62,
  coilBulge: 0.006,
  eddyRibs: 7,
  eddyRibDepth: 0.018,
} as const;

export const SKID = {
  bottom: TRAIN.bodyBottom - SKIDS.height,
  padHeight: 0.045,
  toeRise: 0.05,
  toeLength: 0.12,
  mountShare: 0.6,
  bevel: 0.012,
} as const;

export const SPARK = {
  size: 0.55,
  trail: 3,
  trailStep: 0.22,
  opacity: 0.55,
  fade: 0.55,
} as const;

export const EDDY_GLOW = { intensity: 1.6 } as const;

export const CABIN = {
  floorY: TRAIN.bodyBottom + 0.68,
  wall: 0.085,
  depth: 3.6,
  seatPitch: 0.95,
  seatRows: 3,
  aisle: 0.56,
  seatWidth: 0.5,
  seatsPerSide: 2,
} as const;

export const CUT_CAP = {
  lift: mm(2),
  stubLength: 0.22,
  markerLift: mm(8),
  markerLength: 0.3,
  markerThickness: 0.035,
} as const;

export const INTERIOR = {
  seatY: CABIN.floorY + 0.42,
  cushion: { depth: 0.5, height: 0.13 },
  back: { depth: 0.11, height: 0.72, lean: 0.12 },
  pedestal: 0.16,
  radius: 0.04,
  frontGap: 0.55,
  rackY: 12.78,
  rackDepth: 0.36,
  rackThickness: 0.03,
  windowInset: 0.004,
  windowMargin: 0.12,
  lightWidth: 0.36,
  lightThickness: 0.02,
  doorWidth: 0.82,
  doorHeight: 2.0,
} as const;
