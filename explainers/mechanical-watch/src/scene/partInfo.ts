import type { PartInfo } from '@core/explainer';
import type { LabelSide } from '@core/scene/labelLayout';
import { PART_IDS } from '../ids';
import type { PartId } from '../ids';

const LEFT_SIDE_PARTS: ReadonlySet<PartId> = new Set<PartId>([
  'escapeWheel',
  'palletFork',
  'entryPallet',
  'exitPallet',
  'bankingPins',
  'roller',
  'impulseJewel',
  'balanceWheel',
  'hairspring',
  'stud',
  'regulator',
  'shockJewel',
  'balanceCock',
  'minuteWheel',
]);

function labelSide(id: PartId): LabelSide {
  return LEFT_SIDE_PARTS.has(id) ? 'left' : 'right';
}

export const PART_INFO: Record<PartId, PartInfo> = Object.fromEntries(
  PART_IDS.map((id) => [id, { labelKey: `parts.${id}`, side: labelSide(id) }]),
) as Record<PartId, PartInfo>;

export { PART_IDS };

export const LABEL_PRIORITY: readonly PartId[] = [
  'balanceWheel',
  'escapeWheel',
  'palletFork',
  'barrel',
  'mainspring',
  'hairspring',
  'centreWheel',
  'fourthWheel',
  'thirdWheel',
  'crown',
  'regulator',
  'impulseJewel',
  'entryPallet',
  'exitPallet',
  'bankingPins',
  'roller',
  'stud',
  'shockJewel',
  'ratchetWheel',
  'crownWheel',
  'click',
  'barrelArbor',
  'cannonPinion',
  'minuteWheel',
  'hourWheel',
  'jewels',
  'dial',
  'hourHand',
  'minuteHand',
  'secondHand',
  'stem',
  'windingPinion',
  'mainplate',
  'barrelBridge',
  'trainBridge',
  'balanceCock',
  'case',
];
