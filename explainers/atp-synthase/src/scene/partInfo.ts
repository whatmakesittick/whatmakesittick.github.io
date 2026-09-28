import type { PartInfo } from '@core/explainer';
import type { LabelSide } from '@core/scene/labelLayout';
import { PART_IDS } from '../ids';
import type { PartId } from '../ids';

const LEFT_SIDE_PARTS: ReadonlySet<PartId> = new Set<PartId>([
  'pumps',
  'electrons',
  'oxygen',
  'matrix',
  'intermembraneSpace',
  'cRing',
  'alphaSubunits',
  'looseSite',
  'adpPhosphate',
  'protons',
]);

function labelSide(id: PartId): LabelSide {
  return LEFT_SIDE_PARTS.has(id) ? 'left' : 'right';
}

export const PART_INFO: Record<PartId, PartInfo> = Object.fromEntries(
  PART_IDS.map((id) => [id, { labelKey: `parts.${id}`, side: labelSide(id) }]),
) as Record<PartId, PartInfo>;

export { PART_IDS };

export const LABEL_PRIORITY: readonly PartId[] = [
  'cRing',
  'centralStalk',
  'betaSubunits',
  'peripheralStalk',
  'subunitA',
  'openSite',
  'looseSite',
  'tightSite',
  'atp',
  'adpPhosphate',
  'protons',
  'pumps',
  'oxygen',
  'electrons',
  'matrix',
  'intermembraneSpace',
  'membrane',
  'alphaSubunits',
  'neighbourMotors',
];
