import type { PartInfo } from '@core/explainer';
import type { LabelSide } from '@core/scene/labelLayout';
import { LEFT_LABEL_PARTS, PART_IDS } from '../ids';
import type { PartId } from '../ids';

export { LABEL_PRIORITY } from '../ids';

function labelSide(id: PartId): LabelSide {
  return LEFT_LABEL_PARTS.includes(id) ? 'left' : 'right';
}

export const PART_INFO: Record<PartId, PartInfo> = Object.fromEntries(
  PART_IDS.map((id) => [id, { labelKey: `parts.${id}`, side: labelSide(id) }]),
) as Record<PartId, PartInfo>;
