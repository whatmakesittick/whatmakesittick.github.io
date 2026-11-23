import type { PartInfo } from '@core/explainer';
import type { LabelSide } from '@core/scene/labelLayout';
import { PART_IDS } from '../ids';
import type { PartId } from '../ids';

const LEFT_PARTS: ReadonlySet<PartId> = new Set<PartId>([
  'shoulder',
  'arm',
  'elbow',
  'pelvis',
  'hip',
  'heel',
  'road',
]);

export const LABEL_PRIORITY: readonly PartId[] = [
  'knee',
  'heel',
  'shoe',
  'achilles',
  'arch',
  'head',
  'elbow',
  'shoulder',
  'arm',
  'hip',
  'pelvis',
  'thigh',
  'shin',
  'trunk',
  'road',
];

function labelSide(id: PartId): LabelSide {
  return LEFT_PARTS.has(id) ? 'left' : 'right';
}

export const PART_INFO: Record<PartId, PartInfo> = Object.fromEntries(
  PART_IDS.map((id) => [id, { labelKey: `parts.${id}`, side: labelSide(id) }]),
) as Record<PartId, PartInfo>;
