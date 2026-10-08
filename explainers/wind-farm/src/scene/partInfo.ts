import type { PartInfo } from '@core/explainer';
import type { LabelSide } from '@core/scene/labelLayout';
import { PART_IDS } from '../ids';
import type { PartId } from '../ids';

const LEFT_PARTS: ReadonlySet<PartId> = new Set<PartId>([
  'land',
  'foundation',
  'tower',
  'hub',
  'blades',
  'pitchCylinders',
  'mainBearing',
  'mainShaft',
  'yawDrives',
  'sweptArea',
  'streamlinesGroup',
  'farmLand',
  'prevailingWind',
  'windArrows',
  'shearProfile',
  'spacingMarker',
  'accessRoads',
]);

const RANKED_FIRST: readonly PartId[] = [
  'farmTurbines',
  'substation',
  'nacelle',
  'hub',
  'blades',
  'gearbox',
  'generator',
  'wakePlumes',
  'collectorCables',
  'prevailingWind',
  'tower',
  'brakeDisc',
  'mainShaft',
  'mainBearing',
  'converter',
  'pitchCylinders',
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
