import type { PartInfo } from '@core/explainer';
import type { LabelSide } from '@core/scene/labelLayout';
import { PART_IDS } from '../ids';
import type { PartId } from '../ids';

const LEFT_PARTS: ReadonlySet<PartId> = new Set<PartId>([
  'mixingBeaker',
  'mixture',
  'stirBar',
  'stirrer',
  'stopwatch',
  'iodate',
  'iodide',
  'iodine',
  'amylose',
  'glucose',
]);

export const LABEL_PRIORITY: readonly PartId[] = [
  'mixture',
  'mixingBeaker',
  'pourBeaker',
  'bisulfiteSolution',
  'pourStream',
  'stirBar',
  'thermometer',
  'stopwatch',
  'stirrer',
  'iodate',
  'bisulfite',
  'iodine',
  'iodide',
  'sulfate',
  'hydrogenIon',
  'polyiodide',
  'amylose',
  'triiodide',
  'glucose',
  'water',
];

function labelSide(id: PartId): LabelSide {
  return LEFT_PARTS.has(id) ? 'left' : 'right';
}

export const PART_INFO: Record<PartId, PartInfo> = Object.fromEntries(
  PART_IDS.map((id) => [id, { labelKey: `parts.${id}`, side: labelSide(id) }]),
) as Record<PartId, PartInfo>;
