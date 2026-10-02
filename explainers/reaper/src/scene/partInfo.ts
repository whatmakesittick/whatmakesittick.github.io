import type { PartInfo } from '@core/explainer';
import type { LabelSide } from '@core/scene/labelLayout';
import { PART_IDS } from '../ids';
import type { PartId } from '../ids';

const LEFT_PARTS: ReadonlySet<PartId> = new Set<PartId>([
  'sensorBall',
  'noseHump',
  'satelliteDish',
  'losLink',
  'losAntenna',
  'groundStation',
  'runway',
  'target',
  'laserBeam',
  'missile',
]);

function labelSide(id: PartId): LabelSide {
  return LEFT_PARTS.has(id) ? 'left' : 'right';
}

export const PART_INFO: Record<PartId, PartInfo> = Object.fromEntries(
  PART_IDS.map((id) => [id, { labelKey: `parts.${id}`, side: labelSide(id) }]),
) as Record<PartId, PartInfo>;

export const LABEL_PRIORITY: readonly PartId[] = [
  'sensorBall',
  'hellfire',
  'missile',
  'satLink',
  'losLink',
  'wing',
  'propeller',
  'engine',
  'noseHump',
  'satelliteDish',
  'fuelTank',
  'vTail',
  'target',
  'laserBeam',
  'sensorCone',
  'satellite',
  'losAntenna',
  'groundStation',
  'bombs',
  'pylons',
  'landingGear',
  'ventralFin',
  'fuselage',
  'runway',
];
