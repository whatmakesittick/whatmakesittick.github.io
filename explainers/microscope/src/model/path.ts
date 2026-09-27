import { lerp } from '@core/math';
import { fieldOfView } from './field';
import { imageDistance, refractedSlope } from './lens';
import {
  DEFAULT_OBJECTIVE,
  OBJECTIVES,
  PARFOCAL_DISTANCE_MM,
  SPECIMEN_TO_IMAGE_MM,
  TUBE_LENGTH_MM,
  acceptanceHalfAngle,
  eyepieceFocalLength,
  frontAboveSpecimen,
  specimenToLens,
} from './objectives';
import type { EyepieceId, ObjectiveId } from './objectives';

export const PATH_CYCLE = 402;

export const PHASE_IDS = [
  'lamp',
  'condenser',
  'specimen',
  'objective',
  'tube',
  'eyepiece',
  'eye',
] as const;
export type PhaseId = (typeof PHASE_IDS)[number];

export interface PathRange {
  start: number;
  end: number;
}

export const PHASE_RANGES: Record<PhaseId, PathRange> = {
  lamp: { start: 0, end: 100 },
  condenser: { start: 100, end: 136 },
  specimen: { start: 136, end: 144 },
  objective: { start: 144, end: 181 },
  tube: { start: 181, end: 331 },
  eyepiece: { start: 331, end: 375 },
  eye: { start: 375, end: 402 },
};

export const STATIONS = {
  collector: 16,
  fieldDiaphragm: 30,
  condenserEntry: 100,
  iris: 118,
  condenser: 128,
  slideBottom: 135,
  specimen: 136,
} as const;

export const SHOULDER = STATIONS.specimen + PARFOCAL_DISTANCE_MM;
export const IMAGE_PLANE = STATIONS.specimen + SPECIMEN_TO_IMAGE_MM;
export const TUBE_TOP = SHOULDER + TUBE_LENGTH_MM;

export const BEAM_RADIUS_MM = 18;
export const ILLUMINATION = { irisShare: 0.8, condenserAperture: 0.9 } as const;
export const EYE_FOCAL_LENGTH_MM = 17;
export const EYE_RELIEF_MM = 9.5;
export const VIRTUAL_RAY_LENGTH_MM = 150;

const CONDENSER_FOCAL_LENGTH = STATIONS.specimen - STATIONS.condenser;
const FILAMENT = 0;
const MARGINAL_SIDES = [-1, 0, 1] as const;

export interface OpticalLayout {
  specimen: number;
  condenserEntry: number;
  iris: number;
  irisOpening: number;
  condenser: number;
  objectiveFront: number;
  objectiveLens: number;
  objectiveAperture: number;
  magnification: number;
  image: number;
  eyepieceLens: number;
  eyepieceFocalLength: number;
  eyepieceTop: number;
  eyeLens: number;
  retina: number;
  fieldHeight: number;
  imageHeight: number;
  retinaHeight: number;
}

export interface RayPoint {
  lateral: number;
  axial: number;
}

export type Ray = readonly RayPoint[];

export interface LightRays {
  illumination: Ray[];
  blocked: Ray[];
  image: Ray[];
  virtual: Ray[];
}

export function phaseAt(position: number): PhaseId {
  return PHASE_IDS.find((id) => position < PHASE_RANGES[id].end) ?? PHASE_IDS[PHASE_IDS.length - 1];
}

export function illuminationAperture(objective: ObjectiveId): number {
  const { irisShare, condenserAperture } = ILLUMINATION;
  return Math.min(irisShare * OBJECTIVES[objective].numericalAperture, condenserAperture);
}

export function irisOpening(objective: ObjectiveId): number {
  return CONDENSER_FOCAL_LENGTH * Math.tan(Math.asin(illuminationAperture(objective)));
}

function objectiveLensAt(objective: ObjectiveId): number {
  return STATIONS.specimen + specimenToLens(objective);
}

function eyepieceLensAt(eyepiece: EyepieceId): number {
  return IMAGE_PLANE + eyepieceFocalLength(eyepiece);
}

export function exitPupil(objective: ObjectiveId, eyepiece: EyepieceId): number {
  const lens = eyepieceLensAt(eyepiece);
  return lens + imageDistance(eyepieceFocalLength(eyepiece), lens - objectiveLensAt(objective));
}

export function eyepieceTop(eyepiece: EyepieceId): number {
  return exitPupil(DEFAULT_OBJECTIVE, eyepiece) - EYE_RELIEF_MM;
}

export function opticalLayout(
  objective: ObjectiveId,
  eyepiece: EyepieceId,
  lift = 0,
): OpticalLayout {
  const { magnification } = OBJECTIVES[objective];
  const lensHeight = specimenToLens(objective);
  const focalLength = eyepieceFocalLength(eyepiece);
  const fieldHeight = fieldOfView(objective) / 2;
  const imageHeight = -magnification * fieldHeight;
  const eyeLens = exitPupil(objective, eyepiece);
  return {
    specimen: STATIONS.specimen + lift,
    condenserEntry: STATIONS.condenserEntry + lift,
    iris: STATIONS.iris + lift,
    irisOpening: irisOpening(objective),
    condenser: STATIONS.condenser + lift,
    objectiveFront: STATIONS.specimen + frontAboveSpecimen(objective),
    objectiveLens: objectiveLensAt(objective),
    objectiveAperture: lensHeight * Math.tan(acceptanceHalfAngle(objective)),
    magnification,
    image: IMAGE_PLANE,
    eyepieceLens: eyepieceLensAt(eyepiece),
    eyepieceFocalLength: focalLength,
    eyepieceTop: eyepieceTop(eyepiece),
    eyeLens,
    retina: eyeLens + EYE_FOCAL_LENGTH_MM,
    fieldHeight,
    imageHeight,
    retinaHeight: (-imageHeight / focalLength) * EYE_FOCAL_LENGTH_MM,
  };
}

export function stationBounds(layout: OpticalLayout): Record<PhaseId, PathRange> {
  const edges = [
    FILAMENT,
    layout.condenserEntry,
    layout.specimen,
    layout.objectiveFront,
    SHOULDER,
    layout.image,
    layout.eyepieceTop,
    layout.retina,
  ];
  return Object.fromEntries(
    PHASE_IDS.map((id, index) => [id, { start: edges[index], end: edges[index + 1] }]),
  ) as Record<PhaseId, PathRange>;
}

export function axialPosition(position: number, layout: OpticalLayout): number {
  const id = phaseAt(position);
  const nominal = PHASE_RANGES[id];
  const actual = stationBounds(layout)[id];
  const share = (position - nominal.start) / (nominal.end - nominal.start);
  return lerp(actual.start, actual.end, share);
}

function passesIris(layout: OpticalLayout, offset: number): boolean {
  return Math.abs(offset) <= layout.irisOpening;
}

function collectorPoint(offset: number): RayPoint {
  return { lateral: offset, axial: STATIONS.collector };
}

function litRay(layout: OpticalLayout, offset: number): Ray {
  return [
    { lateral: 0, axial: FILAMENT },
    collectorPoint(offset),
    { lateral: offset, axial: layout.condenser },
    { lateral: 0, axial: layout.specimen },
  ];
}

function blockedRay(layout: OpticalLayout, offset: number): Ray {
  return [
    { lateral: 0, axial: FILAMENT },
    collectorPoint(offset),
    { lateral: offset, axial: layout.iris },
  ];
}

function slopeBetween(from: RayPoint, to: RayPoint): number {
  return (to.lateral - from.lateral) / (to.axial - from.axial);
}

function advance(from: RayPoint, slope: number, axial: number): RayPoint {
  return { lateral: from.lateral + slope * (axial - from.axial), axial };
}

function imageRay(layout: OpticalLayout, height: number, side: number): Ray {
  const start = { lateral: height, axial: layout.specimen };
  const lens = { lateral: side * layout.objectiveAperture, axial: layout.objectiveLens };
  const image = { lateral: -layout.magnification * height, axial: layout.image };
  const converging = slopeBetween(lens, image);
  const eyepiece = advance(lens, converging, layout.eyepieceLens);
  const parallel = refractedSlope(converging, eyepiece.lateral, layout.eyepieceFocalLength);
  const eye = advance(eyepiece, parallel, layout.eyeLens);
  const focused = refractedSlope(parallel, eye.lateral, EYE_FOCAL_LENGTH_MM);
  return [start, lens, image, eyepiece, eye, advance(eye, focused, layout.retina)];
}

function virtualRay(ray: Ray): Ray {
  const [, , , eyepiece, eye] = ray;
  const slope = slopeBetween(eyepiece, eye);
  return [advance(eyepiece, slope, eyepiece.axial - VIRTUAL_RAY_LENGTH_MM), eyepiece];
}

export function specimenHeights(layout: OpticalLayout): readonly number[] {
  return [0, layout.fieldHeight];
}

export function lightRays(layout: OpticalLayout): LightRays {
  const offsets = [-BEAM_RADIUS_MM, -layout.irisOpening, 0, layout.irisOpening, BEAM_RADIUS_MM];
  const [axis, edge] = specimenHeights(layout).map((height) =>
    MARGINAL_SIDES.map((side) => imageRay(layout, height, side)),
  );
  return {
    illumination: offsets
      .filter((offset) => passesIris(layout, offset))
      .map((offset) => litRay(layout, offset)),
    blocked: offsets
      .filter((offset) => !passesIris(layout, offset))
      .map((offset) => blockedRay(layout, offset)),
    image: [...axis, ...edge],
    virtual: edge.map(virtualRay),
  };
}

export function lateralAt(ray: Ray, axial: number): number | null {
  for (let index = 1; index < ray.length; index++) {
    const from = ray[index - 1];
    const to = ray[index];
    if (axial >= from.axial && axial <= to.axial) {
      return lerp(from.lateral, to.lateral, (axial - from.axial) / (to.axial - from.axial));
    }
  }
  return null;
}
