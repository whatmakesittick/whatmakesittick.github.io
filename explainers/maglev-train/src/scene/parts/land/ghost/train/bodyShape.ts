import { BODY, CONSIST, GROOVE, LOFT, NOSE } from './constants';
import { carSpans, junctionCentres } from './layout';
import { biasedDistances, endSection, noseSection } from './section';
import type { BodySection } from './section';

export interface NoseTip {
  readonly x: number;
  readonly direction: number;
}

const HALF_LENGTH = CONSIST.length / 2;
const HALF_GAP = CONSIST.gap / 2;
const JUNCTIONS = junctionCentres(carSpans());
const NOSE_DISTANCES = biasedDistances(NOSE.length, LOFT.noseStations, LOFT.noseBias);

export const NOSE_TIPS: readonly NoseTip[] = [
  { x: HALF_LENGTH, direction: 1 },
  { x: -HALF_LENGTH, direction: -1 },
];

function junctionDistance(x: number): number {
  return Math.min(...JUNCTIONS.map((centre) => Math.abs(x - centre)));
}

export function bodySection(x: number): BodySection {
  const fromTip = HALF_LENGTH - Math.abs(x);
  if (fromTip < NOSE.length) return noseSection(fromTip, NOSE, BODY);
  return endSection(junctionDistance(x) - HALF_GAP, GROOVE, BODY);
}

export function bodyStations(): number[] {
  const noses = NOSE_DISTANCES.flatMap((distance) => [
    HALF_LENGTH - distance,
    distance - HALF_LENGTH,
  ]);
  const grooves = JUNCTIONS.flatMap((centre) =>
    GROOVE.faceOffsets.flatMap((offset) => [
      centre - HALF_GAP - offset,
      centre + HALF_GAP + offset,
    ]),
  );
  return [...new Set([...noses, ...grooves])].sort((a, b) => a - b);
}
