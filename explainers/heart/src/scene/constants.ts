import type { ChamberId, PartId, ValveId } from '../ids';
import {
  APEX,
  BEAT_MS,
  CHAMBERS,
  PULMONARY_VEIN_MOUTHS,
  STROKE_ML,
  VALVES,
  VESSEL_MOUTHS,
} from '../model';
import type { Point } from '../model';
import { THEME } from '../theme';
import type { ContractionFrame, ContractionProfile } from './geometry/contraction';
import type { ShapeSpec } from './geometry/heartShape';
import type { CuspShape } from './geometry/cusp';
import type { FlapShape, FlapSpec } from './geometry/leaflet';
import { planAngle, ringFrame } from './geometry/valveFrame';
import type { SurfaceMark } from './geometry/surfacePath';
import type { VesselRoute } from './geometry/vesselPath';

export type Blob =
  | {
      readonly kind: 'cylinder';
      readonly from: Point;
      readonly to: Point;
      readonly radius: number;
    }
  | {
      readonly kind: 'ellipsoid';
      readonly centre: Point;
      readonly radii: Point;
      readonly axis?: Point;
    }
  | {
      readonly kind: 'cone';
      readonly from: Point;
      readonly to: Point;
      readonly fromRadius: number;
      readonly toRadius: number;
      readonly squash?: Point;
    };

export interface CavityPiece {
  readonly chamber: ChamberId;
  readonly blob: Blob;
  readonly wall?: number;
}

function shifted(point: Point, offset: Point): Point {
  return [point[0] + offset[0], point[1] + offset[1], point[2] + offset[2]];
}

export const PULMONARY_RING_SHIFT: Point = [0, 6, 13];
export const PULMONARY_RING: Point = shifted(VALVES.pulmonary.centre, PULMONARY_RING_SHIFT);

export const VESSEL_WALL_MM = 1.8;
export const VESSEL_SEAM_MM = 0.15;
export const PORTAL_OVERLAP_MM = 2.5;
export const COLLAR_BEYOND_MM = 6;

const RING_INSET_MM = 0.8;
const OUTFLOW_WALL_MM = 2.5;
const NECK_OVERLAP_MM = 1;
const ringRadius = (radius: number) => radius - RING_INSET_MM;
const pastRing = (centre: Point, normal: Point, distance: number): Point => {
  const size = Math.hypot(...normal);
  return [
    centre[0] + (normal[0] / size) * distance,
    centre[1] + (normal[1] / size) * distance,
    centre[2] + (normal[2] / size) * distance,
  ];
};
const tricuspid = VALVES.tricuspid;
const mitral = VALVES.mitral;
const aortic = VALVES.aortic;

export const CAVITY_PIECES: readonly CavityPiece[] = [
  {
    chamber: 'rightAtrium',
    blob: { kind: 'ellipsoid', centre: CHAMBERS.rightAtrium.centre, radii: [18.5, 17.5, 16.5] },
  },
  {
    chamber: 'rightAtrium',
    blob: { kind: 'ellipsoid', centre: [-25, 11, 0], radii: [17, 5.5, 15] },
  },
  {
    chamber: 'rightAtrium',
    blob: {
      kind: 'cylinder',
      from: [-23.5, 7, 1.5],
      to: pastRing(tricuspid.centre, tricuspid.normal, NECK_OVERLAP_MM),
      radius: ringRadius(tricuspid.radius),
    },
  },
  {
    chamber: 'rightVentricle',
    blob: {
      kind: 'cylinder',
      from: pastRing(tricuspid.centre, tricuspid.normal, -NECK_OVERLAP_MM),
      to: [-22, -3, 2.5],
      radius: ringRadius(tricuspid.radius),
    },
  },
  {
    chamber: 'rightVentricle',
    blob: { kind: 'ellipsoid', centre: [-22, -5.5, 3], radii: [17.5, 5.5, 15] },
  },
  {
    chamber: 'rightVentricle',
    blob: {
      kind: 'ellipsoid',
      centre: [-22, -28, 4],
      radii: [17, 29.5, 16],
      axis: [-0.25, 1, 0],
    },
  },
  {
    chamber: 'rightVentricle',
    blob: { kind: 'cone', from: [-14, -44, 6], to: [-5, -64, 6], fromRadius: 10, toRadius: 3.5 },
  },
  {
    chamber: 'rightVentricle',
    wall: OUTFLOW_WALL_MM,
    blob: { kind: 'cone', from: [-15, -10, 12], to: [-8, 8, 22], fromRadius: 8.5, toRadius: 9 },
  },
  {
    chamber: 'rightVentricle',
    wall: OUTFLOW_WALL_MM,
    blob: {
      kind: 'cylinder',
      from: [-8, 8, 22],
      to: PULMONARY_RING,
      radius: ringRadius(VALVES.pulmonary.radius),
    },
  },
  {
    chamber: 'leftAtrium',
    blob: { kind: 'ellipsoid', centre: [26, 29, -8], radii: [18, 16.5, 14] },
  },
  {
    chamber: 'leftAtrium',
    blob: { kind: 'ellipsoid', centre: [34, 27, -6], radii: [14, 15, 14] },
  },
  {
    chamber: 'leftAtrium',
    blob: { kind: 'ellipsoid', centre: [24, 11.5, -2.5], radii: [17, 5.5, 15] },
  },
  {
    chamber: 'leftAtrium',
    blob: {
      kind: 'cylinder',
      from: [22, 7, -1.5],
      to: pastRing(mitral.centre, mitral.normal, NECK_OVERLAP_MM),
      radius: ringRadius(mitral.radius),
    },
  },
  {
    chamber: 'leftVentricle',
    blob: {
      kind: 'cylinder',
      from: pastRing(mitral.centre, mitral.normal, -NECK_OVERLAP_MM),
      to: [21, -3, -1],
      radius: ringRadius(mitral.radius),
    },
  },
  {
    chamber: 'leftVentricle',
    blob: { kind: 'ellipsoid', centre: [23, -5.5, -1], radii: [18, 5.5, 16] },
  },
  {
    chamber: 'leftVentricle',
    blob: { kind: 'ellipsoid', centre: [23, -16, 0], radii: [18, 15, 17.5] },
  },
  {
    chamber: 'leftVentricle',
    blob: {
      kind: 'ellipsoid',
      centre: [24, -36, 0],
      radii: [19, 37, 18],
      axis: [-0.1, 1, -0.03],
    },
  },
  {
    chamber: 'leftVentricle',
    blob: { kind: 'cone', from: [26, -58, 3], to: [28, -73, 5], fromRadius: 9, toRadius: 3.5 },
  },
  {
    chamber: 'leftVentricle',
    wall: OUTFLOW_WALL_MM,
    blob: { kind: 'cone', from: [8, -10, -3], to: [0, 2, -4], fromRadius: 7, toRadius: 5.8 },
  },
  {
    chamber: 'leftVentricle',
    wall: OUTFLOW_WALL_MM,
    blob: {
      kind: 'cone',
      from: [0, 2, -4],
      to: aortic.centre,
      fromRadius: 5.8,
      toRadius: ringRadius(aortic.radius),
    },
  },
];

export const OUTER_BLOBS: readonly Blob[] = [
  {
    kind: 'cone',
    from: [2, -14, 4],
    to: [27, -74, 6],
    fromRadius: 40,
    toRadius: 10,
    squash: [1, 1, 0.75],
  },
  { kind: 'ellipsoid', centre: [-6, -24, 20], radii: [27, 28, 16] },
  { kind: 'ellipsoid', centre: [-2, 27, -9], radii: [16, 12, 11] },
  { kind: 'ellipsoid', centre: [-21, 36, 13], radii: [4.5, 10, 5], axis: [1, 0.3, 0.35] },
  { kind: 'ellipsoid', centre: [24, 29, 16], radii: [4, 9, 4.5], axis: [-1, 0.45, 0.3] },
];

export type VesselName =
  | 'aorta'
  | 'brachiocephalic'
  | 'leftCarotid'
  | 'leftSubclavian'
  | 'pulmonaryTrunk'
  | 'leftPulmonaryArtery'
  | 'rightPulmonaryArtery'
  | 'superiorVenaCava'
  | 'inferiorVenaCava'
  | 'pulmonaryVein0'
  | 'pulmonaryVein1'
  | 'pulmonaryVein2'
  | 'pulmonaryVein3';

export type Blood = 'arterial' | 'venous';

export interface VesselSpec {
  readonly part: PartId;
  readonly blood: Blood;
  readonly route: VesselRoute;
  readonly portalMm?: number;
  readonly chamber?: ChamberId;
  readonly carves?: readonly ChamberId[];
}

const ARCH_TOP: Point = [5, 90, -16];
const PULMONARY_SPLIT: Point = [18, 62, 14];

const PULMONARY_VEIN_RADIUS_MM = 5.5;

function veinRoute(index: number, points: readonly Point[]): VesselRoute {
  return {
    points: [PULMONARY_VEIN_MOUTHS[index].point, ...points],
    radius: PULMONARY_VEIN_RADIUS_MM,
  };
}

export const VESSELS: Readonly<Record<VesselName, VesselSpec>> = {
  aorta: {
    part: 'aorta',
    blood: 'arterial',
    chamber: 'leftVentricle',
    carves: ['rightAtrium', 'leftAtrium'],
    portalMm: 40,
    route: {
      points: [
        VESSEL_MOUTHS.aorta.point,
        [2, 33, -5],
        [-2, 46, -6],
        [-5, 60, -6],
        [-4, 76, -8],
        ARCH_TOP,
        [17, 91, -26],
        [24, 80, -36],
        [24, 62, -43],
        [22, 30, -46],
        [20, -20, -46],
        [19, -100, -44],
      ],
      radius: 13,
      rootRadius: ringRadius(aortic.radius) + VESSEL_WALL_MM,
      flareMm: 14,
    },
  },
  brachiocephalic: {
    part: 'archBranches',
    blood: 'arterial',
    route: {
      points: [
        [-3, 86, -11],
        [-8, 104, -10],
        [-12, 130, -8],
      ],
      radius: 5.5,
    },
  },
  leftCarotid: {
    part: 'archBranches',
    blood: 'arterial',
    route: {
      points: [
        [6, 94, -17],
        [7, 110, -17],
        [8, 130, -17],
      ],
      radius: 4.5,
    },
  },
  leftSubclavian: {
    part: 'archBranches',
    blood: 'arterial',
    route: {
      points: [
        [15, 93, -25],
        [21, 108, -27],
        [28, 130, -29],
      ],
      radius: 5,
    },
  },
  pulmonaryTrunk: {
    part: 'pulmonaryTrunk',
    blood: 'venous',
    chamber: 'rightVentricle',
    portalMm: 12,
    route: {
      points: [PULMONARY_RING, [0, 44, 22], [9, 54, 18], PULMONARY_SPLIT],
      radius: 12,
      rootRadius: ringRadius(VALVES.pulmonary.radius) + VESSEL_WALL_MM,
      flareMm: 10,
    },
  },
  leftPulmonaryArtery: {
    part: 'pulmonaryArteries',
    blood: 'venous',
    route: {
      points: [PULMONARY_SPLIT, [31, 63, 0], [48, 63, -12], [80, 62, -22]],
      radius: 9,
    },
  },
  rightPulmonaryArtery: {
    part: 'pulmonaryArteries',
    blood: 'venous',
    route: {
      points: [
        PULMONARY_SPLIT,
        [14, 60, -8],
        [2, 59, -30],
        [-22, 59, -27],
        [-45, 58, -24],
        [-80, 57, -20],
      ],
      radius: 9,
    },
  },
  superiorVenaCava: {
    part: 'superiorVenaCava',
    blood: 'venous',
    chamber: 'rightAtrium',
    portalMm: 16,
    route: {
      points: [VESSEL_MOUTHS.superiorVenaCava.point, [-28, 58, -1], [-27, 80, -3], [-26, 130, -5]],
      radius: 10,
    },
  },
  inferiorVenaCava: {
    part: 'inferiorVenaCava',
    blood: 'venous',
    chamber: 'rightAtrium',
    portalMm: 26,
    route: {
      points: [
        VESSEL_MOUTHS.inferiorVenaCava.point,
        [-31, 5, -20],
        [-29, -4, -34],
        [-24, -30, -44],
        [-20, -100, -48],
      ],
      radius: 11,
    },
  },
  pulmonaryVein0: {
    part: 'pulmonaryVeins',
    blood: 'arterial',
    chamber: 'leftAtrium',
    portalMm: 16,
    route: veinRoute(0, [
      [56, 38, -12],
      [80, 44, -18],
    ]),
  },
  pulmonaryVein1: {
    part: 'pulmonaryVeins',
    blood: 'arterial',
    chamber: 'leftAtrium',
    portalMm: 16,
    route: veinRoute(1, [
      [56, 16, -14],
      [80, 10, -20],
    ]),
  },
  pulmonaryVein2: {
    part: 'pulmonaryVeins',
    blood: 'arterial',
    chamber: 'leftAtrium',
    portalMm: 16,
    route: veinRoute(2, [
      [4, 43, -32],
      [-4, 46, -46],
      [-12, 48, -60],
    ]),
  },
  pulmonaryVein3: {
    part: 'pulmonaryVeins',
    blood: 'arterial',
    chamber: 'leftAtrium',
    portalMm: 16,
    route: veinRoute(3, [
      [12, 30, -34],
      [4, 30, -48],
      [-2, 30, -60],
    ]),
  },
};

export const ATRIAL_CARVE_MM = 2.5;

export interface CoronarySpec {
  readonly marks: readonly SurfaceMark[];
  readonly radius: readonly [from: number, to: number];
  readonly groove: boolean;
}

const front = (x: number, y: number): SurfaceMark => ({ view: 'front', at: [x, y] });
const back = (x: number, y: number): SurfaceMark => ({ view: 'back', at: [x, y] });
const leftSide = (z: number, y: number): SurfaceMark => ({ view: 'left', at: [z, y] });
const rightSide = (z: number, y: number): SurfaceMark => ({ view: 'right', at: [z, y] });
const below = (x: number, z: number): SurfaceMark => ({ view: 'below', at: [x, z] });

export const CORONARIES: readonly CoronarySpec[] = [
  {
    marks: [
      front(2, 27),
      front(10, 23),
      front(11, 8),
      front(12, -15),
      front(16, -40),
      front(21, -62),
      below(29, 8),
    ],
    radius: [2.4, 1.4],
    groove: true,
  },
  {
    marks: [
      front(10, 23),
      front(22, 17),
      front(34, 12),
      leftSide(14, 8),
      leftSide(-6, 4),
      back(40, 0),
      back(28, -4),
    ],
    radius: [2.2, 1.5],
    groove: true,
  },
  {
    marks: [
      front(-7, 26),
      front(-18, 14),
      front(-30, 6),
      rightSide(16, 3),
      rightSide(-3, 0),
      back(-36, -4),
      back(-22, -8),
    ],
    radius: [2.3, 1.6],
    groove: true,
  },
  {
    marks: [front(12, -2), front(24, -10), front(36, -22), front(44, -36)],
    radius: [1.5, 0.9],
    groove: false,
  },
  {
    marks: [front(15, -33), front(27, -43), front(37, -56)],
    radius: [1.4, 0.9],
    groove: false,
  },
  {
    marks: [front(-35, 3), front(-38, -20), front(-30, -42), front(-18, -58)],
    radius: [1.5, 0.9],
    groove: false,
  },
];

export const GROOVE = { radiusMm: 3.4, liftMm: 1.3, smoothness: 3, sampleMm: 6 } as const;

export const CORONARY_DETAIL = {
  embed: 0.35,
  radialSegments: 8,
  segmentMm: 2.5,
} as const;

export const EPICARDIUM = {
  muscle: THEME.muscle,
  fat: THEME.fat,
  fatShare: 0.28,
  fatNearMm: 0.4,
  fatFarMm: 2.4,
  occlusionSteps: [1.5, 3.5, 7] as const,
  occlusionStrength: 0.9,
  occlusionFloor: 0.55,
} as const;

export const VESSEL_DETAIL = {
  segmentMm: 2.5,
  radialPerMm: 2.2,
  minRadialSegments: 12,
  plugInsetMm: 0.4,
  saturation: 0.72,
  brightness: 0.92,
  lumenBrightness: 0.42,
  rimShade: 0.85,
  collarLipMm: 1.1,
  collarMm: 4,
  lumenFadeMm: 14,
  jointSegments: 28,
  jointMarginMm: 0.6,
} as const;

export const SHAPE = {
  cavitySmoothness: 7,
  envelopeSmoothness: 12,
  collarSmoothness: 5,
  carveSmoothness: 4,
  envelopeResolution: 80,
  cavityResolution: 76,
  gridMarginMm: 8,
} as const;

export const CONTRACTION_FRAME: ContractionFrame = {
  baseY: mitral.centre[1],
  ventricleRampMm: 16,
  atriumRampMm: 10,
  septumBlendMm: 7,
  rightAxisOffsetMm: 10,
  atriumReach: 1.05,
  atriumFadeMm: 8,
};

export const OUTER_CONTRACTION: ContractionProfile = {
  radial: 0.06,
  rightRadial: 0.14,
  longitudinal: 0.07,
  atrial: 0.1,
};

export const CAVITY_CONTRACTION: ContractionProfile = {
  radial: 0.3,
  rightRadial: 0.28,
  longitudinal: 0.1,
  atrial: 0.2,
};

export const PORTAL_FADE_MM = 12;

export const APEX_POINT: Point = APEX;

export const CAP = {
  bandMm: 1.6,
  bandShare: 0.35,
  lipMm: 0.35,
  cellMm: 0.6,
  muscle: '#a8323d',
  deep: THEME.muscleDeep,
  glow: '#ff7a4d',
  glowStrength: 0.16,
} as const;

export const SHAPE_SPEC: ShapeSpec = {
  pieces: CAVITY_PIECES,
  extras: OUTER_BLOBS,
  vessels: Object.values(VESSELS),
  cavitySmoothness: SHAPE.cavitySmoothness,
  envelopeSmoothness: SHAPE.envelopeSmoothness,
  collarSmoothness: SHAPE.collarSmoothness,
  coronaries: CORONARIES,
  groove: GROOVE,
  carveSmoothness: SHAPE.carveSmoothness,
  vesselWall: VESSEL_WALL_MM,
  seam: VESSEL_SEAM_MM,
  collarBeyond: COLLAR_BEYOND_MM,
  atrialCarve: ATRIAL_CARVE_MM,
};

export interface PapillarySpec {
  readonly angleOffset: number;
  readonly radiusShare: number;
  readonly depthMm: number;
  readonly outward: number;
  readonly downward: number;
  readonly baseRadiusMm: number;
  readonly tipRadiusMm: number;
}

export interface CordPlan {
  readonly primaryPerHalf: readonly number[];
  readonly strutsPerHalf: readonly number[];
  readonly strutRowShare: number;
  readonly edgeMargin: number;
}

export interface FlapValveDesign {
  readonly kind: 'flap';
  readonly leaflets: readonly FlapSpec[];
  readonly shape: FlapShape;
  readonly saddleMm: number;
  readonly saddlePeak: number;
  readonly papillaries: readonly PapillarySpec[];
  readonly cords: CordPlan;
}

export interface CuspValveDesign {
  readonly kind: 'cusp';
  readonly shape: CuspShape;
}

export type ValveDesign = FlapValveDesign | CuspValveDesign;

const DEGREE = Math.PI / 180;
const MITRAL_ANTERIOR_SPAN = 120 * DEGREE;
const MITRAL_FRAME = ringFrame(mitral.centre, mitral.normal, mitral.radius);
const MITRAL_ANTERIOR_MIDDLE = planAngle(MITRAL_FRAME, aortic.centre);
const MITRAL_COMMISSURES = [
  MITRAL_ANTERIOR_MIDDLE - MITRAL_ANTERIOR_SPAN / 2,
  MITRAL_ANTERIOR_MIDDLE + MITRAL_ANTERIOR_SPAN / 2,
] as const;
const MITRAL_POSTERIOR_MIDDLE = MITRAL_ANTERIOR_MIDDLE + Math.PI;
const MITRAL_JUNCTION_SHARE = 0.34;

const FLAP_SHAPE: FlapShape = {
  columnsPerTurn: 48,
  minColumns: 10,
  rows: 11,
  lipRows: 2,
  commissureDepthMm: 5,
  commissureGap: 0.07,
  junction: [0, 0],
  smile: 0.25,
  seamBend: 0,
  closedDropMm: 3,
  domeMm: 2.2,
  lipMm: 3.2,
  appositionMm: 0.35,
  openTilt: 0.2,
  openBellyMm: 1.4,
  tongue: 0.65,
  cleftDepth: 0.5,
  cleftWidth: 0.045,
};

const SEMILUNAR_SHAPE: CuspShape = {
  count: 3,
  firstCommissure: Math.PI / 2,
  columns: 14,
  rows: 8,
  commissureHeightMm: 8,
  meetHeightMm: 6,
  edgeSagMm: 0.8,
  bellyMm: 3.2,
  wallInsetMm: 1.3,
  openBellyMm: 0.6,
};

const TRICUSPID_COMMISSURES = {
  anteroseptal: 20,
  anteroposterior: 150,
  posteroseptal: 265,
} as const;

export const VALVE_DESIGN: Readonly<Record<ValveId, ValveDesign>> = {
  mitral: {
    kind: 'flap',
    leaflets: [
      { from: MITRAL_COMMISSURES[0], to: MITRAL_COMMISSURES[1], depthMm: 23, clefts: [] },
      {
        from: MITRAL_COMMISSURES[1],
        to: MITRAL_COMMISSURES[0] + 2 * Math.PI,
        depthMm: 13,
        clefts: [0.3, 0.7],
      },
    ],
    shape: {
      ...FLAP_SHAPE,
      junction: [
        Math.cos(MITRAL_POSTERIOR_MIDDLE) * MITRAL_JUNCTION_SHARE,
        Math.sin(MITRAL_POSTERIOR_MIDDLE) * MITRAL_JUNCTION_SHARE,
      ],
    },
    saddleMm: 1.8,
    saddlePeak: MITRAL_ANTERIOR_MIDDLE,
    papillaries: [
      {
        angleOffset: -8 * DEGREE,
        radiusShare: 0.62,
        depthMm: 27,
        outward: 0.8,
        downward: 1,
        baseRadiusMm: 4.8,
        tipRadiusMm: 2.4,
      },
      {
        angleOffset: 8 * DEGREE,
        radiusShare: 0.62,
        depthMm: 28,
        outward: 0.8,
        downward: 1,
        baseRadiusMm: 4.8,
        tipRadiusMm: 2.4,
      },
    ],
    cords: { primaryPerHalf: [3, 4], strutsPerHalf: [1, 0], strutRowShare: 0.5, edgeMargin: 0.06 },
  },
  tricuspid: {
    kind: 'flap',
    leaflets: [
      {
        from: TRICUSPID_COMMISSURES.anteroseptal * DEGREE,
        to: TRICUSPID_COMMISSURES.anteroposterior * DEGREE,
        depthMm: 20,
        clefts: [],
      },
      {
        from: TRICUSPID_COMMISSURES.anteroposterior * DEGREE,
        to: TRICUSPID_COMMISSURES.posteroseptal * DEGREE,
        depthMm: 15,
        clefts: [0.5],
      },
      {
        from: TRICUSPID_COMMISSURES.posteroseptal * DEGREE,
        to: (TRICUSPID_COMMISSURES.anteroseptal + 360) * DEGREE,
        depthMm: 16,
        clefts: [],
      },
    ],
    shape: { ...FLAP_SHAPE, junction: [0.16, -0.14], seamBend: 0.1, cleftDepth: 0.35 },
    saddleMm: 0,
    saddlePeak: 0,
    papillaries: [
      {
        angleOffset: 0,
        radiusShare: 0.78,
        depthMm: 16,
        outward: 1,
        downward: 0.3,
        baseRadiusMm: 2.4,
        tipRadiusMm: 1.3,
      },
      {
        angleOffset: 0,
        radiusShare: 0.62,
        depthMm: 26,
        outward: 0.8,
        downward: 1,
        baseRadiusMm: 4.6,
        tipRadiusMm: 2.2,
      },
      {
        angleOffset: 0,
        radiusShare: 0.62,
        depthMm: 25,
        outward: 0.8,
        downward: 1,
        baseRadiusMm: 3.8,
        tipRadiusMm: 1.9,
      },
    ],
    cords: {
      primaryPerHalf: [3, 3, 3],
      strutsPerHalf: [0, 0, 0],
      strutRowShare: 0.5,
      edgeMargin: 0.07,
    },
  },
  aortic: { kind: 'cusp', shape: { ...SEMILUNAR_SHAPE } },
  pulmonary: { kind: 'cusp', shape: { ...SEMILUNAR_SHAPE } },
};

export const VALVE_DETAIL = {
  ringTubeMm: 1.1,
  crownTubeMm: 0.85,
  ringRadialSegments: 8,
  ringSegments: 72,
  chordRadiusMm: 0.3,
  chordSegments: 5,
  papillaryWallMm: 1.5,
  papillaryStepMm: 0.5,
  papillarySegments: 12,
  pulseGlow: 0.9,
  pulseColour: THEME.valve,
} as const;

const MS_PER_SECOND = 1000;

export const BLOOD = {
  count: 900,
  venousSeed: 11,
  arterialSeed: 23,
  route: { depthMm: 4, chamberSpread: 0.55, vesselSpread: 0.62 },
  flow: {
    mmPerMsPerMl: 0.0016,
    meanFlow: STROKE_ML / (BEAT_MS / MS_PER_SECOND),
    referenceRadius: 6,
    minimumRadius: 3,
    complianceMm: 70,
  },
  swirlMm: 2.2,
  swirlRate: (Math.PI * 2) / 900,
  fadeMm: 10,
  cutawayShowZ: 0.5,
  maxStepMs: 120,
  sizePerDistance: 0.014,
  minSize: 3.5,
  maxSize: 9,
  renderOrder: 2,
} as const;

export const CONDUCTION = {
  colour: THEME.node,
  glowStrength: 1.6,
  sampleMm: 2,
  radialSegments: 8,
  nodeSegments: 16,
  sinusAxis: [0.25, 1, 0.1] as const,
  avRadiusMm: 2.6,
  bundleRadiusMm: 1.3,
  branchRadiusMm: 1.1,
  septalLiftMm: 0.2,
  pulse: { riseMs: 6, fadeMs: 45, rest: 0.18 },
} as const;

export interface PurkinjeFan {
  readonly side: 'left' | 'right';
  readonly start: Point;
  readonly ends: readonly Point[];
}

export const PURKINJE_FANS: readonly PurkinjeFan[] = [
  {
    side: 'left',
    start: [16, -62, -2],
    ends: [
      [38, -30, -8],
      [40, -12, -8],
      [34, -48, -12],
      [26, -66, -10],
      [10, -44, -14],
      [8, -20, -12],
      [24, -26, -16],
    ],
  },
  {
    side: 'right',
    start: [-14, -60, -2],
    ends: [
      [-34, -30, -6],
      [-36, -12, -6],
      [-26, -46, -8],
      [-10, -30, -10],
      [-22, -20, -12],
    ],
  },
];

export const PURKINJE = {
  liftMm: 0.5,
  radius: [0.55, 0.3] as const,
  radialSegments: 5,
  sagMm: 6,
  depthMm: 6,
} as const;

export const LABELS = {
  liftMm: 3,
  trunkAboveRingMm: 12,
  septum: [0, -32, 0] as Point,
  wall: [48, -38, 0] as Point,
  bundleBranches: [-6, -40, 1] as Point,
  purkinjeFibres: [30, -52, -10] as Point,
  surface: {
    rightAtrium: { view: 'right', at: [8, 26] },
    rightVentricle: { view: 'front', at: [-16, -30] },
    leftAtrium: { view: 'left', at: [-2, 30] },
    leftVentricle: { view: 'left', at: [6, -34] },
    septum: { view: 'front', at: [13, -28] },
    wall: { view: 'front', at: [34, -46] },
  } satisfies Record<string, SurfaceMark>,
  vesselShare: {
    aorta: 0.3,
    archBranches: 0.5,
    pulmonaryTrunk: 0.45,
    pulmonaryArteries: 0.5,
    superiorVenaCava: 0.3,
    inferiorVenaCava: 0.7,
    pulmonaryVeins: 0.6,
    venousBlood: 0.45,
    arterialBlood: 0.08,
  },
} as const;
