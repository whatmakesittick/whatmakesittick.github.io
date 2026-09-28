import type { PartInfo } from '@core/explainer';
import type { LabelSide } from '@core/scene/labelLayout';
import { PART_IDS } from '../ids';
import type { PartId } from '../ids';

const LEFT_SIDE_PARTS: ReadonlySet<PartId> = new Set<PartId>([
  'sun',
  'roof',
  'frame',
  'glass',
  'cell',
  'backsheet',
  'junctionBox',
  'dcCable',
  'meter',
  'arCoating',
  'junction',
  'rearContact',
]);

function labelSide(id: PartId): LabelSide {
  return LEFT_SIDE_PARTS.has(id) ? 'left' : 'right';
}

export const PART_INFO: Record<PartId, PartInfo> = Object.fromEntries(
  PART_IDS.map((id) => [id, { labelKey: `parts.${id}`, side: labelSide(id) }]),
) as Record<PartId, PartInfo>;

export { PART_IDS };

export const LABEL_PRIORITY: readonly PartId[] = [
  'panel',
  'sun',
  'cell',
  'junction',
  'emitter',
  'base',
  'glass',
  'encapsulant',
  'backsheet',
  'frame',
  'junctionBox',
  'bypassDiode',
  'inverter',
  'finger',
  'busbar',
  'ribbon',
  'pyramids',
  'arCoating',
  'rearContact',
  'dcCable',
  'acCable',
  'connector',
  'meter',
  'roof',
];
