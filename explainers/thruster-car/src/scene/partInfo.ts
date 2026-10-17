import type { PartInfo } from '@core/explainer';
import type { LabelSide } from '@core/scene/labelLayout';
import { PART_IDS } from '../ids';
import type { PartId } from '../ids';

export { LABEL_PRIORITY } from '../ids';

const LEFT_PARTS: ReadonlySet<PartId> = new Set<PartId>([
  'seat',
  'frontNozzles',
  'fans',
  'runway',
  'ramp',
  'parkedRow',
]);

export const UNDIMMED_PARTS: readonly PartId[] = ['runway', 'landingPad'];

function labelSide(id: PartId): LabelSide {
  return LEFT_PARTS.has(id) ? 'left' : 'right';
}

export const PART_INFO: Record<PartId, PartInfo> = Object.fromEntries(
  PART_IDS.map((id) => [id, { labelKey: `parts.${id}`, side: labelSide(id) }]),
) as Record<PartId, PartInfo>;
