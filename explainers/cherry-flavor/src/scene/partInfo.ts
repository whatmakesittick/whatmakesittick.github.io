import type { PartInfo } from '@core/explainer';
import type { LabelSide } from '@core/scene/labelLayout';
import { PART_IDS } from '../ids';
import type { PartId } from '../ids';

const LEFT_PARTS: ReadonlySet<PartId> = new Set<PartId>([
  'tongue',
  'throat',
  'palate',
  'airway',
  'olfactoryBulb',
  'papilla',
  'tasteBud',
  'nerve',
  'iceCrystal',
  'benzaldehyde',
  'hexenal',
  'receptors',
  'neuron',
]);

export const LABEL_PRIORITY: readonly PartId[] = [
  'bite',
  'tongue',
  'smellPatch',
  'palate',
  'nostrils',
  'nasalCavity',
  'airway',
  'throat',
  'spoon',
  'olfactoryBulb',
  'tasteBud',
  'papilla',
  'nerve',
  'melt',
  'iceCrystal',
  'fatDroplet',
  'airBubble',
  'aromaCloud',
  'benzaldehyde',
  'hexenal',
  'linalool',
  'eugenol',
  'ionone',
  'receptors',
  'neuron',
  'mucus',
];

function labelSide(id: PartId): LabelSide {
  return LEFT_PARTS.has(id) ? 'left' : 'right';
}

export const PART_INFO: Record<PartId, PartInfo> = Object.fromEntries(
  PART_IDS.map((id) => [id, { labelKey: `parts.${id}`, side: labelSide(id) }]),
) as Record<PartId, PartInfo>;
