import type { PartInfo } from '@core/explainer';
import type { LabelSide } from '@core/scene/labelLayout';
import { PART_IDS } from '../ids';
import type { PartId } from '../ids';

const LEFT_PARTS: ReadonlySet<PartId> = new Set<PartId>([
  'rearHandle',
  'throttleTrigger',
  'starter',
  'intakePort',
  'carburettor',
  'throttleValve',
  'chokeValve',
  'airFilter',
  'fuelTank',
  'pulseLine',
  'crankcase',
  'connectingRod',
  'crankshaft',
  'clutch',
  'oilTank',
  'driveLinks',
  'chainCatcher',
  'log',
  'chips',
  'freshCharge',
]);

const RANKED_FIRST: readonly PartId[] = [
  'bar',
  'chain',
  'cutters',
  'piston',
  'cylinder',
  'sparkPlug',
  'clutch',
  'sprocket',
  'kickbackZone',
  'handGuard',
  'carburettor',
  'exhaustPort',
  'transferPorts',
  'intakePort',
  'crankshaft',
  'crankcase',
  'clutchDrum',
  'chainBrakeBand',
  'depthGauges',
  'driveLinks',
  'barNose',
  'rearHandle',
  'frontHandle',
  'throttleTrigger',
  'powerhead',
];

export const UNDIMMED_PARTS: readonly PartId[] = [
  'log',
  'chips',
  'freshCharge',
  'exhaustGas',
  'oilFlow',
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
