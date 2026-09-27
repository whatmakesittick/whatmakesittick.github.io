import { focalLengthFor, magnifierFocalLength } from './lens';

export const OBJECTIVE_IDS = ['x4', 'x10', 'x40', 'x100'] as const;
export type ObjectiveId = (typeof OBJECTIVE_IDS)[number];

export const EYEPIECE_IDS = ['x10', 'x125', 'x15'] as const;
export type EyepieceId = (typeof EYEPIECE_IDS)[number];

export type Immersion = 'air' | 'oil';

export interface Objective {
  magnification: number;
  numericalAperture: number;
  workingDistance: number;
  immersion: Immersion;
}

export const REFRACTIVE_INDEX: Record<Immersion, number> = { air: 1, oil: 1.515 };

export const OBJECTIVES: Record<ObjectiveId, Objective> = {
  x4: { magnification: 4, numericalAperture: 0.1, workingDistance: 25, immersion: 'air' },
  x10: { magnification: 10, numericalAperture: 0.25, workingDistance: 7.5, immersion: 'air' },
  x40: { magnification: 40, numericalAperture: 0.65, workingDistance: 0.6, immersion: 'air' },
  x100: { magnification: 100, numericalAperture: 1.25, workingDistance: 0.13, immersion: 'oil' },
};

export const EYEPIECE_MAGNIFICATION: Record<EyepieceId, number> = { x10: 10, x125: 12.5, x15: 15 };

export const DEFAULT_OBJECTIVE: ObjectiveId = 'x10';
export const DEFAULT_EYEPIECE: EyepieceId = 'x10';

export const FIELD_NUMBER_MM = 20;
export const COVERSLIP_MM = 0.17;
export const PARFOCAL_DISTANCE_MM = 45;
export const TUBE_LENGTH_MM = 160;
export const IMAGE_BELOW_TUBE_TOP_MM = 10;
export const SPECIMEN_TO_IMAGE_MM = PARFOCAL_DISTANCE_MM + TUBE_LENGTH_MM - IMAGE_BELOW_TUBE_TOP_MM;

export function frontAboveSpecimen(objective: ObjectiveId): number {
  return COVERSLIP_MM + OBJECTIVES[objective].workingDistance;
}

export function totalMagnification(objective: ObjectiveId, eyepiece: EyepieceId): number {
  return OBJECTIVES[objective].magnification * EYEPIECE_MAGNIFICATION[eyepiece];
}

export function immersionIndex(objective: ObjectiveId): number {
  return REFRACTIVE_INDEX[OBJECTIVES[objective].immersion];
}

export function acceptanceHalfAngle(objective: ObjectiveId): number {
  return Math.asin(OBJECTIVES[objective].numericalAperture / immersionIndex(objective));
}

export function specimenToLens(objective: ObjectiveId): number {
  return SPECIMEN_TO_IMAGE_MM / (OBJECTIVES[objective].magnification + 1);
}

export function lensToImage(objective: ObjectiveId): number {
  return SPECIMEN_TO_IMAGE_MM - specimenToLens(objective);
}

export function objectiveFocalLength(objective: ObjectiveId): number {
  return focalLengthFor(specimenToLens(objective), lensToImage(objective));
}

export function eyepieceFocalLength(eyepiece: EyepieceId): number {
  return magnifierFocalLength(EYEPIECE_MAGNIFICATION[eyepiece]);
}
