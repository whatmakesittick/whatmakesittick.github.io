import type { PartInfo } from '@core/explainer';
import type { LabelSide } from '@core/scene/labelLayout';
import { PART_IDS } from '../ids';
import type { PartId } from '../ids';

const LEFT_PARTS: ReadonlySet<PartId> = new Set<PartId>([
  'intakeLip',
  'fanBlades',
  'booster',
  'compressorStator',
  'outerShaft',
  'gearbox',
  'starter',
  'diffuser',
  'hpTurbine',
  'lpTurbine',
  'coldStream',
  'coldNozzle',
  'person',
  'bypassDuct',
  'splitter',
  'nacelle',
]);

const PRIORITY_FIRST: readonly PartId[] = [
  'fanBlades',
  'hotStream',
  'coldStream',
  'combustorLiner',
  'hpTurbine',
  'lpTurbine',
  'outerShaft',
  'innerShaft',
  'reverser',
  'person',
  'nacelle',
];

export const LABEL_PRIORITY: readonly PartId[] = [
  ...PRIORITY_FIRST,
  ...PART_IDS.filter((id) => !PRIORITY_FIRST.includes(id)),
];

function labelSide(id: PartId): LabelSide {
  return LEFT_PARTS.has(id) ? 'left' : 'right';
}

export const PART_INFO: Record<PartId, PartInfo> = Object.fromEntries(
  PART_IDS.map((id) => [id, { labelKey: `parts.${id}`, side: labelSide(id) }]),
) as Record<PartId, PartInfo>;
