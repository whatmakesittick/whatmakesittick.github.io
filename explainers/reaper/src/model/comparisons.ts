import type { ComparisonId } from '../ids';

export interface AircraftFigures {
  spanM: number;
  weightKg: number;
  powerHp?: number;
  aspectRatio?: number;
}

export type Figure = keyof AircraftFigures;

export const REAPER_FIGURES: Required<AircraftFigures> = {
  spanM: 20.1,
  weightKg: 4760,
  powerHp: 900,
  aspectRatio: 17,
};

export const COMPARED_FIGURES: Readonly<Record<ComparisonId, AircraftFigures>> = {
  predator: { spanM: 16.8, weightKg: 1020, powerHp: 115 },
  cessna: { spanM: 11, weightKg: 1157, aspectRatio: 7.5 },
};

export function timesOther(figure: Figure, comparison: ComparisonId): number | undefined {
  const other = COMPARED_FIGURES[comparison][figure];
  return other === undefined ? undefined : REAPER_FIGURES[figure] / other;
}
