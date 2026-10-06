import { toRadians } from '@core/math';
import type { FieldId, TissueId, WeightingId } from '../ids';
import { TISSUE_IDS } from '../ids';
import { WEIGHTINGS } from './sequence';
import { RELAXATION } from './tissues';

export interface TipComponents {
  along: number;
  across: number;
}

export function tissueSignal(tissue: TissueId, field: FieldId, weighting: WeightingId): number {
  const { t1, t2 } = RELAXATION[field][tissue];
  const { tr, te } = WEIGHTINGS[weighting];
  return (1 - Math.exp(-tr / t1)) * Math.exp(-te / t2);
}

function mapTissues(value: (tissue: TissueId) => number): Record<TissueId, number> {
  return Object.fromEntries(TISSUE_IDS.map((tissue) => [tissue, value(tissue)])) as Record<
    TissueId,
    number
  >;
}

export function tissueSignals(field: FieldId, weighting: WeightingId): Record<TissueId, number> {
  return mapTissues((tissue) => tissueSignal(tissue, field, weighting));
}

export function brightnessOrder(field: FieldId, weighting: WeightingId): TissueId[] {
  const signals = tissueSignals(field, weighting);
  return [...TISSUE_IDS].sort((first, second) => signals[second] - signals[first]);
}

export function relativeBrightness(
  field: FieldId,
  weighting: WeightingId,
): Record<TissueId, number> {
  const signals = tissueSignals(field, weighting);
  const brightest = Math.max(...Object.values(signals));
  return mapTissues((tissue) => signals[tissue] / brightest);
}

export function tipComponents(angleDeg: number): TipComponents {
  const angle = toRadians(angleDeg);
  return { along: Math.cos(angle), across: Math.sin(angle) };
}
