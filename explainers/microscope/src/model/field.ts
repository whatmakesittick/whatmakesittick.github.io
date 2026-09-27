import { FIELD_NUMBER_MM, OBJECTIVES, immersionIndex } from './objectives';
import type { ObjectiveId } from './objectives';

interface DepthAnchor {
  objective: ObjectiveId;
  depth: number;
}

interface DepthTerms {
  wave: number;
  detector: number;
}

const DEPTH_ANCHORS: readonly [DepthAnchor, DepthAnchor] = [
  { objective: 'x10', depth: 8.5 },
  { objective: 'x100', depth: 0.7 },
];

function anchorRow({ objective, depth }: DepthAnchor): readonly [number, number, number] {
  const aperture = OBJECTIVES[objective].numericalAperture;
  return [1 / aperture ** 2, 1 / aperture, depth / immersionIndex(objective)];
}

function solveDepthTerms(): DepthTerms {
  const [a1, b1, c1] = anchorRow(DEPTH_ANCHORS[0]);
  const [a2, b2, c2] = anchorRow(DEPTH_ANCHORS[1]);
  const determinant = a1 * b2 - a2 * b1;
  return {
    wave: (c1 * b2 - c2 * b1) / determinant,
    detector: (a1 * c2 - a2 * c1) / determinant,
  };
}

const DEPTH_TERMS = solveDepthTerms();

export function fieldOfView(objective: ObjectiveId): number {
  return FIELD_NUMBER_MM / OBJECTIVES[objective].magnification;
}

export function depthOfField(objective: ObjectiveId): number {
  const aperture = OBJECTIVES[objective].numericalAperture;
  const { wave, detector } = DEPTH_TERMS;
  return immersionIndex(objective) * (wave / aperture ** 2 + detector / aperture);
}
