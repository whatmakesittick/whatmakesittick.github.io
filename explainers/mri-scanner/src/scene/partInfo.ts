import type { PartInfo } from '@core/explainer';
import type { LabelSide } from '@core/scene/labelLayout';
import { PART_IDS } from '../ids';
import type { PartId } from '../ids';

const LEFT_PARTS: ReadonlySet<PartId> = new Set<PartId>([
  'cover',
  'vacuumVessel',
  'radiationShield',
  'heliumVessel',
  'mainCoils',
  'shieldCoils',
  'table',
  'patient',
  'gradientX',
  'gradientY',
  'gradientZ',
  'spinArrows',
  'mainField',
  'rfWave',
  'fringeLine',
  'room',
]);

const RANKED_FIRST: readonly PartId[] = [
  'netMagnet',
  'screen',
  'headCoil',
  'mainCoils',
  'gradientZ',
  'gradientY',
  'gradientX',
  'bodyCoil',
  'coldHead',
  'bore',
  'echoWave',
  'rfWave',
  'heliumVessel',
  'spinArrows',
];

function labelSide(id: PartId): LabelSide {
  return LEFT_PARTS.has(id) ? 'left' : 'right';
}

export const PART_INFO: Record<PartId, PartInfo> = Object.fromEntries(
  PART_IDS.map((id) => [id, { labelKey: `parts.${id}`, side: labelSide(id) }]),
) as Record<PartId, PartInfo>;

export const LABEL_PRIORITY: readonly PartId[] = [
  ...RANKED_FIRST,
  ...PART_IDS.filter((id) => !RANKED_FIRST.includes(id)),
];
