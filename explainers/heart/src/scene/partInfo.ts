import type { PartInfo } from '@core/explainer';
import type { LabelSide } from '@core/scene/labelLayout';
import { PART_IDS } from '../ids';
import type { PartId } from '../ids';

const LEFT_SIDE_PARTS: ReadonlySet<PartId> = new Set<PartId>([
  'rightAtrium',
  'rightVentricle',
  'tricuspidValve',
  'pulmonaryValve',
  'superiorVenaCava',
  'inferiorVenaCava',
  'pulmonaryArteries',
  'sinusNode',
  'avNode',
  'bundleBranches',
  'venousBlood',
  'septum',
  'wall',
]);

function labelSide(id: PartId): LabelSide {
  return LEFT_SIDE_PARTS.has(id) ? 'left' : 'right';
}

export const PART_INFO: Record<PartId, PartInfo> = Object.fromEntries(
  PART_IDS.map((id) => [id, { labelKey: `parts.${id}`, side: labelSide(id) }]),
) as Record<PartId, PartInfo>;

export { PART_IDS };

export const LABEL_PRIORITY: readonly PartId[] = [
  'leftVentricle',
  'rightVentricle',
  'leftAtrium',
  'rightAtrium',
  'aorta',
  'pulmonaryTrunk',
  'mitralValve',
  'aorticValve',
  'tricuspidValve',
  'pulmonaryValve',
  'sinusNode',
  'avNode',
  'bundleBranches',
  'purkinjeFibres',
  'septum',
  'chordae',
  'superiorVenaCava',
  'inferiorVenaCava',
  'pulmonaryVeins',
  'pulmonaryArteries',
  'archBranches',
  'coronaries',
  'apex',
  'wall',
  'venousBlood',
  'arterialBlood',
];
