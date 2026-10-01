import type { PartInfo } from '@core/explainer';
import type { LabelSide } from '@core/scene/labelLayout';
import { PART_IDS } from '../ids';
import type { PartId } from '../ids';

const BELOW_BORE_PARTS: ReadonlySet<PartId> = new Set<PartId>([
  'magazine',
  'trigger',
  'grip',
  'stock',
  'cleaningRod',
  'hammer',
  'ejector',
]);

const BORE_REAR_PARTS: ReadonlySet<PartId> = new Set<PartId>([
  'primer',
  'firingPin',
  'cartridgeCase',
  'bolt',
  'barrel',
  'hotGas',
]);

function labelSide(id: PartId): LabelSide {
  return BELOW_BORE_PARTS.has(id) || BORE_REAR_PARTS.has(id) ? 'left' : 'right';
}

export const PART_INFO: Record<PartId, PartInfo> = Object.fromEntries(
  PART_IDS.map((id) => [id, { labelKey: `parts.${id}`, side: labelSide(id) }]),
) as Record<PartId, PartInfo>;

export const LABEL_PRIORITY: readonly PartId[] = [
  'bullet',
  'barrel',
  'bolt',
  'carrier',
  'hammer',
  'gasPort',
  'pistonHead',
  'gasBlock',
  'firingPin',
  'cartridgeCase',
  'primer',
  'powder',
  'chamber',
  'spentCase',
  'extractor',
  'ejector',
  'returnSpring',
  'magazine',
  'trunnion',
  'hotGas',
  'muzzle',
  'gasTube',
  'receiver',
  'chargingHandle',
  'selector',
  'trigger',
  'stock',
  'pistonRod',
  'ventHoles',
  'rifling',
  'grip',
  'handguard',
  'rearSight',
  'frontSight',
  'cleaningRod',
];
