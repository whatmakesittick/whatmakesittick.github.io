import type { PartInfo } from '@core/explainer';
import type { LabelSide } from '@core/scene/labelLayout';
import { PART_IDS } from '../ids';
import type { PartId } from '../ids';

const LEFT_SIDE_PARTS: ReadonlySet<PartId> = new Set<PartId>([
  'oxygenInlet',
  'oxygenPump',
  'oxygenPreburner',
  'liquidOxygen',
  'oxygenRichGas',
  'actuators',
  'throat',
  'plume',
]);

function labelSide(id: PartId): LabelSide {
  return LEFT_SIDE_PARTS.has(id) ? 'left' : 'right';
}

export const PART_INFO: Record<PartId, PartInfo> = Object.fromEntries(
  PART_IDS.map((id) => [id, { labelKey: `parts.${id}`, side: labelSide(id) }]),
) as Record<PartId, PartInfo>;

export { PART_IDS };

export const LABEL_PRIORITY: readonly PartId[] = [
  'chamber',
  'nozzle',
  'oxygenPump',
  'methanePump',
  'oxygenPreburner',
  'methanePreburner',
  'injector',
  'throat',
  'plume',
  'shockDiamonds',
  'gimbal',
  'coolingChannels',
  'hotGasManifold',
  'oxygenInlet',
  'methaneInlet',
  'actuators',
  'liquidOxygen',
  'liquidMethane',
  'oxygenRichGas',
  'methaneRichGas',
  'booster',
];
